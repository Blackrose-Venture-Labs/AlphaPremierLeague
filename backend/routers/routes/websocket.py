from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from fastapi.websockets import WebSocketState
from typing import List, Dict, Set
import json
import asyncio
import random
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from config.database import get_db_session
from tables.ai_model import AIModel, AIModelResponse
from tables.positions import Position, PositionResponse
from tables.trades import Trade, TradeResponse
from tables.modelchat import ModelChat, ModelChatResponse
from tables.modeldata import ModelData, ModelDataResponse
from direct_redis import DirectRedis

router = APIRouter(prefix="/ws", tags=["websocket"])

# Global set to track active connections and broadcast tasks
active_connections: Set[WebSocket] = set()
price_stream_connections: Set[WebSocket] = set()
modeldata_stream_connections: Set[WebSocket] = set()
broadcast_task = None
price_broadcast_task = None
modeldata_broadcast_task = None

# Redis client for fetching real-time price data
redis_client = DirectRedis()

# Connection manager for WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str = None):
        await websocket.accept()
        self.active_connections.append(websocket)
        if user_id:
            self.user_connections[user_id] = websocket

    def disconnect(self, websocket: WebSocket, user_id: str = None):
        self.active_connections.remove(websocket)
        if user_id and user_id in self.user_connections:
            del self.user_connections[user_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def send_to_user(self, message: str, user_id: str):
        if user_id in self.user_connections:
            await self.user_connections[user_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

async def send_safe(websocket: WebSocket, message: str):
    """Safely send message to WebSocket, removing failed connections"""
    try:
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.send_text(message)
        else:
            # Remove disconnected connection
            active_connections.discard(websocket)
    except Exception as e:
        print(f"Failed to send to client: {e}")
        # Remove failed connection
        active_connections.discard(websocket)

async def broadcast_price_updates():
    """Background task that broadcasts price updates to all price stream connections using Redis data"""
    while True:
        try:
            if not price_stream_connections:
                # No connections, sleep and continue
                await asyncio.sleep(1)
                continue
            
            # Fetch live price data from Redis
            ltp_data = redis_client.hgetall('ltp_data')
            
            if not ltp_data:
                print("No LTP data available in Redis")
                await asyncio.sleep(2)
                continue
            
            updated_tickers = {}
            
            for symbol, ticker_data in ltp_data.items():
                try:
                    # Extract last_price and change percentage from Redis data
                    last_price = ticker_data.get('last_price', 0)
                    change_pct = ticker_data.get('change', 0)  # This is already in percentage
                    
                    # Convert change percentage to a percentage format (multiply by 100 if needed)
                    if abs(change_pct) < 1:
                        # If change is in decimal format (e.g., 0.018 for 1.8%), convert to percentage
                        change_percent = round(change_pct, 2)
                    else:
                        # If change is already in percentage format
                        change_percent = round(change_pct, 2)
                    
                    # Determine price direction based on change
                    if change_percent > 0:
                        change_direction = "up"
                    elif change_percent < 0:
                        change_direction = "down"
                    else:
                        change_direction = "neutral"
                    
                    updated_tickers[symbol] = {
                        "symbol": symbol,
                        "price": round(float(last_price), 2),
                        "change_percent": change_percent,
                        "change_direction": change_direction,
                        "last_trade_time": ticker_data.get('last_trade_time', ''),
                        "exchange_timestamp": ticker_data.get('exchange_timestamp', '')
                    }
                    
                except (KeyError, TypeError, ValueError) as e:
                    print(f"Error processing ticker data for {symbol}: {e}")
                    continue
            
            if updated_tickers:
                message = {
                    "type": "price_update",
                    "timestamp": datetime.now().isoformat(),
                    "data": updated_tickers
                }
                
                message_text = json.dumps(message, default=str)
                
                # Send to all price stream connections in parallel
                connection_list = list(price_stream_connections.copy())
                if connection_list:
                    await asyncio.gather(
                        *[send_safe(ws, message_text) for ws in connection_list],
                        return_exceptions=True
                    )
            
            # Wait 2 seconds before next update
            await asyncio.sleep(1)
            
        except Exception as e:
            print(f"Price broadcast error: {e}")
            await asyncio.sleep(2)

async def broadcast_modeldata_updates():
    """Background task that broadcasts resampled modeldata grouped by display_name every 20 seconds"""
    from config.database import Database
    from sqlalchemy import text
    
    while True:
        try:
            if not modeldata_stream_connections:
                # No connections, sleep and continue
                await asyncio.sleep(5)
                continue
            
            # Use PostgreSQL's window functions for efficient resampling by AI model
            async with Database.async_session_maker() as session:
                # First, get all AI models
                ai_models_query = text("""
                    SELECT id, code_name, display_name 
                    FROM ai_models 
                    ORDER BY id
                """)
                ai_models_result = await session.execute(ai_models_query)
                ai_models = ai_models_result.fetchall()
                
                modeldata_groups = {}
                
                for ai_model in ai_models:
                    ai_model_id = ai_model[0]
                    code_name = ai_model[1]
                    display_name = ai_model[2]
                    
                    # Resample data for this specific AI model to exactly 500 evenly distributed points
                    # This ensures first and last points are always included
                    resample_query = text("""
                        WITH ranked_data AS (
                            SELECT 
                                id,
                                ai_model_id,
                                code_name,
                                display_name,
                                account_value,
                                return_value,
                                total_pnl,
                                fees,
                                trades,
                                created_at,
                                ROW_NUMBER() OVER (ORDER BY created_at) as row_num,
                                COUNT(*) OVER () as total_rows
                            FROM modeldata 
                            WHERE ai_model_id = :ai_model_id
                            ORDER BY created_at
                        ),
                        sampled_indices AS (
                            SELECT 
                                CASE 
                                    WHEN total_rows <= 500 THEN row_num
                                    WHEN row_num = 1 THEN 1  -- Always include first point
                                    WHEN row_num = total_rows THEN total_rows  -- Always include last point
                                    ELSE CAST(1 + ROUND((row_num - 1) * (total_rows - 1) / 499.0) AS INTEGER)
                                END as sample_index
                            FROM ranked_data
                            WHERE total_rows > 0
                        ),
                        final_sample AS (
                            SELECT DISTINCT sample_index 
                            FROM sampled_indices 
                            ORDER BY sample_index
                            LIMIT 500
                        )
                        SELECT 
                            rd.id,
                            rd.ai_model_id,
                            rd.code_name,
                            rd.display_name,
                            rd.account_value,
                            rd.return_value,
                            rd.total_pnl,
                            rd.fees,
                            rd.trades,
                            rd.created_at
                        FROM ranked_data rd
                        INNER JOIN final_sample fs ON rd.row_num = fs.sample_index
                        ORDER BY rd.created_at
                    """)
                    
                    result = await session.execute(resample_query, {"ai_model_id": ai_model_id})
                    rows = result.fetchall()
                    
                    if rows:
                        # Convert to list of dictionaries
                        data_points = []
                        for row in rows:
                            data_points.append({
                                "id": row[0],
                                "ai_model_id": row[1],
                                "code_name": row[2],
                                "display_name": row[3],
                                "account_value": float(row[4]) if row[4] is not None else None,
                                "return_value": float(row[5]) if row[5] is not None else None,
                                "total_pnl": float(row[6]) if row[6] is not None else None,
                                "fees": float(row[7]) if row[7] is not None else None,
                                "trades": int(row[8]) if row[8] is not None else None,
                                "created_at": row[9].isoformat() if row[9] else None
                            })
                        
                        # Use ai_model_id as the key for better organization
                        modeldata_groups[str(ai_model_id)] = {
                            "ai_model_id": ai_model_id,
                            "code_name": code_name,
                            "display_name": display_name,
                            "data_points": data_points,
                            "total_points": len(data_points),
                            "latest_timestamp": data_points[-1]["created_at"] if data_points else None,
                            "first_timestamp": data_points[0]["created_at"] if data_points else None
                        }
                
                if modeldata_groups:
                    message = {
                        "type": "modeldata_update",
                        "timestamp": datetime.now().isoformat(),
                        "total_groups": len(modeldata_groups),
                        "data": modeldata_groups
                    }
                    
                    message_text = json.dumps(message, default=str)
                    
                    # Send to all modeldata stream connections in parallel
                    connection_list = list(modeldata_stream_connections.copy())
                    if connection_list:
                        await asyncio.gather(
                            *[send_safe(ws, message_text) for ws in connection_list],
                            return_exceptions=True
                        )
                        print(f"Broadcasted modeldata to {len(connection_list)} connections with {len(modeldata_groups)} groups")
            
            # Wait 20 seconds before next update
            await asyncio.sleep(20)
            
        except Exception as e:
            print(f"Modeldata broadcast error: {e}")
            await asyncio.sleep(20)

async def broadcast_model_updates():
    """Background task that broadcasts model updates to all connections"""
    from config.database import Database
    
    while True:
        try:
            if not active_connections:
                # No connections, sleep and continue
                await asyncio.sleep(3)
                continue
            
            # Single database session for all queries
            async with Database.async_session_maker() as session:
                # Fetch all positions
                positions_result = await session.execute(select(Position))
                positions = positions_result.scalars().all()
                position_data = [
                    PositionResponse.model_validate(position).model_dump()
                    for position in positions
                ]
                
                # Fetch latest 50 trades ordered by last_update_time
                trades_result = await session.execute(
                    select(Trade).order_by(desc(Trade.last_update_time)).limit(30)
                )
                trades = trades_result.scalars().all()
                trade_data = [
                    TradeResponse.model_validate(trade).model_dump()
                    for trade in trades
                ]
                
                # Fetch latest 30 model chats ordered by last_update_time
                modelchats_result = await session.execute(
                    select(ModelChat).order_by(desc(ModelChat.last_update_time)).limit(30)
                )
                modelchats = modelchats_result.scalars().all()
                modelchat_data = []
                for chat in modelchats:
                    chat_dict = ModelChatResponse.model_validate(chat).model_dump()
                    
                    # Parse model_input_prompt as JSON if it's a valid JSON string
                    if chat_dict.get('model_input_prompt'):
                        try:
                            chat_dict['model_input_prompt'] = json.loads(chat_dict['model_input_prompt'])
                        except (json.JSONDecodeError, TypeError):
                            # Keep as string if not valid JSON
                            pass
                    
                    # Parse model_output_prompt as JSON if it's a valid JSON string
                    if chat_dict.get('model_output_prompt'):
                        try:
                            chat_dict['model_output_prompt'] = json.loads(chat_dict['model_output_prompt'])
                        except (json.JSONDecodeError, TypeError):
                            # Keep as string if not valid JSON
                            pass
                    
                    modelchat_data.append(chat_dict)
                
                # Prepare combined message with all three data types
                timestamp = datetime.now().isoformat()
                
                combined_message = {
                    "type": "combined_update",
                    "trade_updates": {
                        "type": "trade_updates",
                        "timestamp": timestamp,
                        "data": trade_data
                    },
                    "position_updates": {
                        "type": "position_updates",
                        "timestamp": timestamp,
                        "data": position_data
                    },
                    "modelchat_updates": {
                        "type": "modelchat_updates",
                        "timestamp": timestamp,
                        "data": modelchat_data
                    }
                }
                
                # Convert to JSON string
                combined_message_text = json.dumps(combined_message, default=str)
                
                # Send combined message to all connections in parallel
                connection_list = list(active_connections.copy())
                if connection_list:
                    await asyncio.gather(
                        *[send_safe(ws, combined_message_text) for ws in connection_list],
                        return_exceptions=True
                    )
            
            # Wait 3 seconds before next update
            await asyncio.sleep(3)
            
        except Exception as e:
            print(f"Broadcast error: {e}")
            await asyncio.sleep(3)

@router.websocket("/model-updates")
async def model_updates_websocket(websocket: WebSocket):
    """
    WebSocket endpoint that broadcasts a combined update message containing:
    1. position_updates - All positions from the position table
    2. trade_updates - Latest 30 trades from the trades table
    3. modelchat_updates - Latest 30 model chats from the modelchat table
    
    Uses a single background task to broadcast to all connections efficiently
    """
    global broadcast_task
    
    await websocket.accept()
    active_connections.add(websocket)
    
    # Start broadcast task if it's the first connection
    if broadcast_task is None or broadcast_task.done():
        broadcast_task = asyncio.create_task(broadcast_model_updates())
    
    try:
        # Keep connection alive - just listen for client messages or disconnections
        while True:
            try:
                # This will block until client sends a message or disconnects
                await websocket.receive_text()
            except WebSocketDisconnect:
                print("Client disconnected normally")
                break
            
    except WebSocketDisconnect:
        print("Client disconnected from model-updates")
    except Exception as e:
        print(f"WebSocket error in model-updates: {e}")
    finally:
        # Always clean up the connection
        active_connections.discard(websocket)
        
        # Stop broadcast task if no connections remain
        if not active_connections and broadcast_task and not broadcast_task.done():
            broadcast_task.cancel()
            broadcast_task = None
            
        print(f"WebSocket connection cleaned up. Remaining connections: {len(active_connections)}")


@router.websocket("/price-stream")
async def price_stream_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time price streaming
    Broadcasts price updates for all tickers every second
    """
    global price_broadcast_task
    
    await websocket.accept()
    price_stream_connections.add(websocket)
    
    # Send initial price data immediately upon connection
    try:
        # Fetch initial price data from Redis
        ltp_data = redis_client.hgetall('ltp_data')
        initial_data = {}
        
        if ltp_data:
            for symbol, ticker_data in ltp_data.items():
                try:
                    last_price = ticker_data.get('last_price', 0)
                    change_pct = ticker_data.get('change', 0)
                    
                    # Convert change percentage to percentage format
                    if abs(change_pct) < 1:
                        change_percent = round(change_pct * 100, 2)
                    else:
                        change_percent = round(change_pct, 2)
                    
                    # Determine direction based on change
                    if change_percent > 0:
                        change_direction = "up"
                    elif change_percent < 0:
                        change_direction = "down"
                    else:
                        change_direction = "neutral"
                    
                    initial_data[symbol] = {
                        "symbol": symbol,
                        "price": round(float(last_price), 2),
                        "change_percent": change_percent,
                        "change_direction": change_direction,
                        "last_trade_time": ticker_data.get('last_trade_time', ''),
                        "exchange_timestamp": ticker_data.get('exchange_timestamp', '')
                    }
                    
                except (KeyError, TypeError, ValueError) as e:
                    print(f"Error processing initial ticker data for {symbol}: {e}")
                    continue
        else:
            print("No initial LTP data available in Redis")
        
        initial_message = {
            "type": "initial_prices",
            "timestamp": datetime.now().isoformat(),
            "data": initial_data
        }
        
        await websocket.send_text(json.dumps(initial_message, default=str))
        
    except Exception as e:
        print(f"Failed to send initial price data: {e}")
    
    # Start price broadcast task if it's the first connection
    if price_broadcast_task is None or price_broadcast_task.done():
        price_broadcast_task = asyncio.create_task(broadcast_price_updates())
    
    try:
        # Keep connection alive - just listen for client messages or disconnections
        while True:
            try:
                # This will block until client sends a message or disconnects
                message = await websocket.receive_text()
                # Echo back any messages (optional - can be used for ping/pong)
                await websocket.send_text(json.dumps({
                    "type": "echo",
                    "message": f"Received: {message}",
                    "timestamp": datetime.now().isoformat()
                }))
            except WebSocketDisconnect:
                print("Client disconnected normally from price stream")
                break
            
    except WebSocketDisconnect:
        print("Client disconnected from price-stream")
    except Exception as e:
        print(f"WebSocket error in price-stream: {e}")
    finally:
        # Always clean up the connection
        price_stream_connections.discard(websocket)
        
        # Stop price broadcast task if no connections remain
        if not price_stream_connections and price_broadcast_task and not price_broadcast_task.done():
            price_broadcast_task.cancel()
            price_broadcast_task = None
            
        print(f"Price stream connection cleaned up. Remaining connections: {len(price_stream_connections)}")


@router.websocket("/modeldata-stream")
async def modeldata_stream_websocket(websocket: WebSocket):
    """
    WebSocket endpoint for real-time modeldata streaming
    Broadcasts resampled modeldata grouped by display_name every 20 seconds
    Each group contains exactly 500 evenly distributed data points across time
    """
    global modeldata_broadcast_task
    
    await websocket.accept()
    modeldata_stream_connections.add(websocket)
    
    # Send initial modeldata immediately upon connection
    try:
        from config.database import Database
        from sqlalchemy import text
        
        async with Database.async_session_maker() as session:
            # Get initial data - same logic as broadcast function but for immediate response
            ai_models_query = text("""
                SELECT id, code_name, display_name 
                FROM ai_models 
                ORDER BY id
            """)
            ai_models_result = await session.execute(ai_models_query)
            ai_models = ai_models_result.fetchall()
            
            initial_data = {}
            
            for ai_model in ai_models:  # Process all available models for initial load
                ai_model_id = ai_model[0]
                code_name = ai_model[1] 
                display_name = ai_model[2]
                
                resample_query = text("""
                    WITH ranked_data AS (
                        SELECT 
                            id,
                            ai_model_id,
                            code_name,
                            display_name,
                            account_value,
                            return_value,
                            total_pnl,
                            fees,
                            trades,
                            created_at,
                            ROW_NUMBER() OVER (ORDER BY created_at) as row_num,
                            COUNT(*) OVER () as total_rows
                        FROM modeldata 
                        WHERE ai_model_id = :ai_model_id
                        ORDER BY created_at
                    ),
                    sampled_indices AS (
                        SELECT 
                            CASE 
                                WHEN total_rows <= 500 THEN row_num
                                WHEN row_num = 1 THEN 1  -- Always include first point
                                WHEN row_num = total_rows THEN total_rows  -- Always include last point
                                ELSE CAST(1 + ROUND((row_num - 1) * (total_rows - 1) / 499.0) AS INTEGER)
                            END as sample_index
                        FROM ranked_data
                        WHERE total_rows > 0
                    ),
                    final_sample AS (
                        SELECT DISTINCT sample_index 
                        FROM sampled_indices 
                        ORDER BY sample_index
                        LIMIT 500
                    )
                    SELECT 
                        rd.id,
                        rd.ai_model_id,
                        rd.code_name,
                        rd.display_name,
                        rd.account_value,
                        rd.return_value,
                        rd.total_pnl,
                        rd.fees,
                        rd.trades,
                        rd.created_at
                    FROM ranked_data rd
                    INNER JOIN final_sample fs ON rd.row_num = fs.sample_index
                    ORDER BY rd.created_at
                """)
                
                result = await session.execute(resample_query, {"ai_model_id": ai_model_id})
                rows = result.fetchall()
                
                if rows:
                    data_points = []
                    for row in rows:
                        data_points.append({
                            "id": row[0],
                            "ai_model_id": row[1],
                            "code_name": row[2],
                            "display_name": row[3],
                            "account_value": float(row[4]) if row[4] is not None else None,
                            "return_value": float(row[5]) if row[5] is not None else None,
                            "total_pnl": float(row[6]) if row[6] is not None else None,
                            "fees": float(row[7]) if row[7] is not None else None,
                            "trades": int(row[8]) if row[8] is not None else None,
                            "created_at": row[9].isoformat() if row[9] else None
                        })
                    
                    initial_data[str(ai_model_id)] = {
                        "ai_model_id": ai_model_id,
                        "code_name": code_name,
                        "display_name": display_name,
                        "data_points": data_points,
                        "total_points": len(data_points),
                        "latest_timestamp": data_points[-1]["created_at"] if data_points else None,
                        "first_timestamp": data_points[0]["created_at"] if data_points else None
                    }
        
        initial_message = {
            "type": "initial_modeldata",
            "timestamp": datetime.now().isoformat(),
            "total_groups": len(initial_data),
            "note": "Initial load with all AI models. Updates will be sent every 20 seconds.",
            "data": initial_data
        }
        
        await websocket.send_text(json.dumps(initial_message, default=str))
        print(f"Sent initial modeldata with {len(initial_data)} groups")
        
    except Exception as e:
        print(f"Failed to send initial modeldata: {e}")
    
    # Start modeldata broadcast task if it's the first connection
    if modeldata_broadcast_task is None or modeldata_broadcast_task.done():
        modeldata_broadcast_task = asyncio.create_task(broadcast_modeldata_updates())
        print("Started modeldata broadcast task")
    
    try:
        # Keep connection alive - just listen for client messages or disconnections
        while True:
            try:
                # This will block until client sends a message or disconnects
                message = await websocket.receive_text()
                # Echo back any messages (optional - can be used for ping/pong)
                await websocket.send_text(json.dumps({
                    "type": "echo",
                    "message": f"Received: {message}",
                    "timestamp": datetime.now().isoformat()
                }))
            except WebSocketDisconnect:
                print("Client disconnected normally from modeldata stream")
                break
            
    except WebSocketDisconnect:
        print("Client disconnected from modeldata-stream")
    except Exception as e:
        print(f"WebSocket error in modeldata-stream: {e}")
    finally:
        # Always clean up the connection
        modeldata_stream_connections.discard(websocket)
        
        # Stop modeldata broadcast task if no connections remain
        if not modeldata_stream_connections and modeldata_broadcast_task and not modeldata_broadcast_task.done():
            modeldata_broadcast_task.cancel()
            modeldata_broadcast_task = None
            print("Stopped modeldata broadcast task")
            
        print(f"Modeldata stream connection cleaned up. Remaining connections: {len(modeldata_stream_connections)}")


@router.get("/status")
async def websocket_status():
    """Get WebSocket connection status"""
    return {
        "total_connections": len(manager.active_connections),
        "user_connections": len(manager.user_connections),
        "model_update_connections": len(active_connections),
        "price_stream_connections": len(price_stream_connections),
        "modeldata_stream_connections": len(modeldata_stream_connections),
        "model_updates_task_running": broadcast_task is not None and not broadcast_task.done() if broadcast_task else False,
        "price_stream_task_running": price_broadcast_task is not None and not price_broadcast_task.done() if price_broadcast_task else False,
        "modeldata_stream_task_running": modeldata_broadcast_task is not None and not modeldata_broadcast_task.done() if modeldata_broadcast_task else False,
        "broadcast_types": [
            "combined_update",
            "price_update", 
            "initial_prices",
            "modeldata_update",
            "initial_modeldata"
        ],
        "broadcast_intervals": {
            "model_updates": "3 seconds",
            "price_updates": "1 second", 
            "modeldata_updates": "20 seconds"
        },
        "status": "operational"
    }

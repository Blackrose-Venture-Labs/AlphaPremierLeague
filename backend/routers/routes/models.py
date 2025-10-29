from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from datetime import datetime, time as dt_time
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import hmac
import hashlib
import time
import json
import requests
from pydantic import BaseModel
from direct_redis import DirectRedis
import pytz
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Simplified import - everything from one place!
from tables.ai_model import AIModel, AIModelResponse, AIModelCreate, AIModelUpdate
from tables.positions import Position, PositionResponse, PositionUpdate, PositionCreateSimple, PositionBulkUpdate, PositionBulkUpdateResponse
from tables.modelchat import ModelChat, ModelChatResponse, ModelChatCreate, ModelChatCreateSimple
from tables.trades import Trade, TradeResponse, TradeCreate, TradeCreateSimple
from tables.modeldata import ModelData, ModelDataResponse, ModelDataCreate, ModelDataUpdate, ModelDataCreateSimple
from config.database import get_db_session

# Initialize Redis client for LTP data
redis_client = DirectRedis()

router = APIRouter(prefix="/models", tags=["models"])

@router.get("/get_all", response_model=List[AIModelResponse], status_code=status.HTTP_200_OK)
async def get_all_models(
    db: AsyncSession = Depends(get_db_session),
    provider: Optional[str] = Query(None, description="Filter by AI model provider"),
    limit: Optional[int] = Query(None, description="Maximum number of models to return", ge=1),
    order_by: Optional[str] = Query("rank", description="Field to order by: 'rank', 'return_pct', 'pnl', 'winrate', 'sharpe'"),
    order_direction: Optional[str] = Query("asc", description="Order direction: 'asc' or 'desc'"),
    min_return: Optional[float] = Query(None, description="Minimum return percentage filter"),
    max_return: Optional[float] = Query(None, description="Maximum return percentage filter")
):
    """
    Get AI models with optional filtering parameters:
    - provider: Filter by AI model provider
    - limit: Limit results (useful for "top 10 models")
    - order_by: Sort by field (rank, return_pct, pnl, winrate, sharpe)
    - order_direction: Sort direction (asc/desc) 
    - min_return/max_return: Filter by return percentage range
    """
    try:
        # Start with base query
        query = select(AIModel)
        
        # Apply provider filter
        if provider:
            query = query.where(AIModel.provider.ilike(f"%{provider}%"))
        
        # Apply return percentage filters
        if min_return is not None:
            query = query.where(AIModel.return_pct >= min_return)
        if max_return is not None:
            query = query.where(AIModel.return_pct <= max_return)
        
        # Apply ordering
        valid_order_fields = ["rank", "return_pct", "pnl", "winrate", "sharpe", "account_value", "id"]
        if order_by not in valid_order_fields:
            order_by = "rank"
        
        order_field = getattr(AIModel, order_by)
        if order_direction.lower() == "asc":
            # Handle NULL values by putting them at the end for ascending order
            query = query.order_by(order_field.asc().nulls_last())
        else:
            # Handle NULL values by putting them at the end for descending order  
            query = query.order_by(order_field.desc().nulls_last())
        
        # Apply limit
        if limit:
            query = query.limit(limit)
        
        # Execute query
        result = await db.execute(query)
        models = result.scalars().all()
        
        return models
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameter format: {str(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching models: {str(e)}"
        )

@router.get("/get_all_positions", response_model=List[PositionResponse], status_code=status.HTTP_200_OK)
async def get_all_positions(
    db: AsyncSession = Depends(get_db_session),
    ai_model_ids: Optional[str] = Query(None, description="Comma-separated AI model IDs to filter by (e.g., '1,2,3')"),
    code_name: Optional[str] = Query(None, description="Filter by model code name (partial match)"),
    limit: Optional[int] = Query(None, description="Maximum number of positions to return (e.g., 50 for top 50)", ge=1),
    after_date: Optional[datetime] = Query(None, description="Return positions updated after this date (ISO format: 2023-01-01T00:00:00Z)"),
    order_by: Optional[str] = Query("last_updated", description="Field to order by: 'last_updated', 'value', 'pnl', 'percentage'"),
    order_direction: Optional[str] = Query("desc", description="Order direction: 'asc' or 'desc'"),
    asset: Optional[str] = Query(None, description="Filter by specific asset (e.g., 'AAPL', 'BTC')")
):
    """
    Get positions with optional filtering parameters:
    - ai_model_ids: Filter by specific AI model IDs (comma-separated)
    - limit: Limit results (useful for "top 50 positions")
    - after_date: Get positions updated after a specific date
    - order_by: Sort by field (last_updated, value, pnl, percentage)
    - order_direction: Sort direction (asc/desc)
    - asset: Filter by specific asset
    """
    try:
        # Start with base query
        query = select(Position)
        
        # Apply AI model ID filter
        if ai_model_ids:
            model_id_list = [int(id.strip()) for id in ai_model_ids.split(",") if id.strip().isdigit()]
            if model_id_list:
                query = query.where(Position.ai_model_id.in_(model_id_list))

        # Apply code name filter
        if code_name:
            query = query.where(Position.code_name == code_name)
        
        # Apply date filter
        if after_date:
            query = query.where(Position.last_updated > after_date)
        
        # Apply asset filter
        if asset:
            query = query.where(Position.asset.ilike(f"%{asset}%"))
        
        # Apply ordering
        valid_order_fields = ["last_updated", "value", "pnl", "percentage", "id"]
        if order_by not in valid_order_fields:
            order_by = "last_updated"
        
        order_field = getattr(Position, order_by)
        if order_direction.lower() == "asc":
            query = query.order_by(order_field.asc().nulls_last())
        else:
            query = query.order_by(order_field.desc().nulls_last())
        
        # Apply limit
        if limit:
            query = query.limit(limit)
        
        # Execute query
        result = await db.execute(query)
        positions = result.scalars().all()
        
        return positions
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameter format: {str(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching positions: {str(e)}"
        )

@router.get("/get_all_model_chat", response_model=List[ModelChatResponse], status_code=status.HTTP_200_OK)
async def get_all_model_chat(
    db: AsyncSession = Depends(get_db_session),
    ai_model_ids: Optional[str] = Query(None, description="Comma-separated AI model IDs to filter by (e.g., '1,2,3')"),
    limit: Optional[int] = Query(None, description="Maximum number of chat records to return (e.g., 50 for last 50)", ge=1),
    after_date: Optional[datetime] = Query(None, description="Return chats updated after this date (ISO format: 2023-01-01T00:00:00Z)"),
    order_by: Optional[str] = Query("last_update_time", description="Field to order by: 'last_update_time', 'id'"),
    order_direction: Optional[str] = Query("desc", description="Order direction: 'asc' or 'desc'"),
    search_input: Optional[str] = Query(None, description="Search in input prompts (case-insensitive)"),
    search_output: Optional[str] = Query(None, description="Search in output prompts (case-insensitive)"),
    code_name: Optional[str] = Query(None, description="Filter by code name (partial match)")
):
    """
    Get model conversations with optional filtering parameters:
    - ai_model_ids: Filter by specific AI model IDs (comma-separated)
    - limit: Limit results (useful for "last 50 chats")
    - after_date: Get chats updated after a specific date
    - order_by: Sort by field (last_update_time, id)
    - order_direction: Sort direction (asc/desc)
    - search_input: Search text within input prompts
    - search_output: Search text within output prompts
    - code_name: Filter by model code name
    """
    try:
        # Start with base query
        query = select(ModelChat)
        
        # Apply AI model ID filter
        if ai_model_ids:
            model_id_list = [int(id.strip()) for id in ai_model_ids.split(",") if id.strip().isdigit()]
            if model_id_list:
                query = query.where(ModelChat.ai_model_id.in_(model_id_list))
        
        # Apply date filter
        if after_date:
            query = query.where(ModelChat.last_update_time > after_date)
        
        # Apply code name filter
        if code_name:
            query = query.where(ModelChat.code_name.ilike(f"%{code_name}%"))
        
        # Apply input prompt search
        if search_input:
            query = query.where(ModelChat.model_input_prompt.ilike(f"%{search_input}%"))
        
        # Apply output prompt search
        if search_output:
            query = query.where(ModelChat.model_output_prompt.ilike(f"%{search_output}%"))
        
        # Apply ordering
        valid_order_fields = ["last_update_time", "id"]
        if order_by not in valid_order_fields:
            order_by = "last_update_time"
        
        order_field = getattr(ModelChat, order_by)
        if order_direction.lower() == "asc":
            query = query.order_by(order_field.asc().nulls_last())
        else:
            query = query.order_by(order_field.desc().nulls_last())
        
        # Apply limit
        if limit:
            query = query.limit(limit)
        
        # Execute query
        result = await db.execute(query)
        model_chats = result.scalars().all()
        
        return model_chats
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameter format: {str(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching model conversations: {str(e)}"
        )


@router.get("/get_all_trades", response_model=List[TradeResponse], status_code=status.HTTP_200_OK)
async def get_all_trades(
    db: AsyncSession = Depends(get_db_session),
    ai_model_ids: Optional[str] = Query(None, description="Comma-separated AI model IDs to filter by (e.g., '1,2,3')"),
    code_name: Optional[str] = Query(None, description="Filter by model code name (exact match)"),
    limit: Optional[int] = Query(None, description="Maximum number of trades to return (e.g., 50 for top 50)", ge=1),
    after_date: Optional[datetime] = Query(None, description="Return trades updated after this date (ISO format: 2023-01-01T00:00:00Z)"),
    order_by: Optional[str] = Query("last_update_time", description="Field to order by: 'last_update_time', 'notional_value', 'price', 'quantity'"),
    order_direction: Optional[str] = Query("desc", description="Order direction: 'asc' or 'desc'"),
    asset: Optional[str] = Query(None, description="Filter by specific asset (e.g., 'AAPL', 'BTC')"),
    side: Optional[str] = Query(None, description="Filter by trade side: 'BUY' or 'SELL'"),
    min_notional: Optional[float] = Query(None, description="Minimum notional value filter", ge=0),
    max_notional: Optional[float] = Query(None, description="Maximum notional value filter", ge=0)
):
    """
    Get trades with optional filtering parameters:
    - ai_model_ids: Filter by specific AI model IDs (comma-separated)
    - code_name: Filter by model code name (exact match)
    - limit: Limit results (useful for "top 50 trades")
    - after_date: Get trades updated after a specific date
    - order_by: Sort by field (last_update_time, notional_value, price, quantity)
    - order_direction: Sort direction (asc/desc)
    - asset: Filter by specific asset
    - side: Filter by BUY or SELL trades
    - min_notional/max_notional: Filter by notional value range
    """
    try:
        # Start with base query
        query = select(Trade)
        
        # Apply AI model ID filter
        if ai_model_ids:
            model_id_list = [int(id.strip()) for id in ai_model_ids.split(",") if id.strip().isdigit()]
            if model_id_list:
                query = query.where(Trade.ai_model_id.in_(model_id_list))
        
        # Apply code name filter (exact match)
        if code_name:
            query = query.where(Trade.code_name == code_name)
        
        # Apply date filter
        if after_date:
            query = query.where(Trade.last_update_time > after_date)
        
        # Apply asset filter
        if asset:
            query = query.where(Trade.asset.ilike(f"%{asset}%"))
        
        # Apply side filter
        if side and side.upper() in ["BUY", "SELL"]:
            query = query.where(Trade.side == side.upper())
        
        # Apply notional value filters
        if min_notional is not None:
            query = query.where(Trade.notional_value >= min_notional)
        if max_notional is not None:
            query = query.where(Trade.notional_value <= max_notional)
        
        # Apply ordering
        valid_order_fields = ["last_update_time", "notional_value", "price", "quantity", "id"]
        if order_by not in valid_order_fields:
            order_by = "last_update_time"
        
        order_field = getattr(Trade, order_by)
        if order_direction.lower() == "asc":
            query = query.order_by(order_field.asc().nulls_last())
        else:
            query = query.order_by(order_field.desc().nulls_last())
        
        # Apply limit
        if limit:
            query = query.limit(limit)
        
        # Execute query
        result = await db.execute(query)
        trades = result.scalars().all()
        
        return trades
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameter format: {str(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching trades: {str(e)}"
        )


@router.post("/create_model_chat", response_model=ModelChatResponse, status_code=status.HTTP_201_CREATED)
async def create_model_chat(
    model_chat_data: ModelChatCreateSimple,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Create a new model chat entry with auto-filled fields.
    
    Required fields:
    - code_name: Must match an existing AI model's code_name
    - model_input_prompt: The input prompt sent to the model
    - model_output_prompt: The response/output from the model
    
    Auto-filled fields:
    - ai_model_id: Mapped from AI model with matching code_name
    - display_name: Taken from the matched AI model's display_name
    """
    try:
        # Find AI model with exact matching code_name
        ai_model_query = select(AIModel).where(AIModel.code_name == model_chat_data.code_name)
        ai_model_result = await db.execute(ai_model_query)
        ai_model = ai_model_result.scalar_one_or_none()
        
        if not ai_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No AI model found with code_name '{model_chat_data.code_name}'. Please ensure the code_name matches an existing AI model."
            )
        
        # Use the AI model's display_name and id
        ai_model_id = ai_model.id
        display_name = ai_model.display_name
        
        # Create new ModelChat instance with mapped fields
        new_model_chat = ModelChat(
            display_name=display_name,
            code_name=model_chat_data.code_name,
            ai_model_id=ai_model_id,
            model_input_prompt=model_chat_data.model_input_prompt,
            model_output_prompt=model_chat_data.model_output_prompt
        )
        
        # Add to database
        db.add(new_model_chat)
        await db.commit()
        await db.refresh(new_model_chat)
        
        return new_model_chat
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating model chat: {str(e)}"
        )


@router.post("/create_trade", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
async def create_trade(
    trade_data: TradeCreateSimple,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Create a new trade record with auto-filled fields.
    
    Required fields:
    - code_name: AI model code name (must match an existing AI model)
    - asset: Asset symbol/name (e.g., 'AAPL', 'BTC', 'BTCUSD')
    - side: Trade side ('BUY' or 'SELL')
    - quantity: Quantity traded (must be > 0)
    
    Optional fields:
    - price: Price per unit (will be fetched from Redis LTP data if not provided)
    - notional_value: Total value of trade (will be calculated from LTP and quantity if not provided)
    
    Auto-filled fields:
    - ai_model_id: Mapped from AI model with matching code_name
    - display_name: Taken from the matched AI model's display_name
    - price: Fetched from Redis 'ltp_data' if not provided
    - notional_value: Calculated as (ltp * quantity) if not provided
      * For BTCUSD: uses special calculation: ltp = (((ltp_data['BTCUSD']['last_price']) * 0.001) / 10) * 89
    - id: Auto-generated primary key
    - last_update_time: Current timestamp
    
    Side Effects:
    - Updates the position table for the same code_name and asset:
      * BUY trades: Increases the asset quantity
      * SELL trades: Decreases the asset quantity
    - Updates the CASH position for the code_name:
      * BUY trades: Decreases CASH by notional_value (spending cash)
      * SELL trades: Increases CASH by notional_value (receiving cash)
    """
    try:
        # Check market hours for assets other than BTCUSD
        if trade_data.asset != "BTCUSD":
            # Get current time in IST (Indian Standard Time)
            ist_tz = pytz.timezone('Asia/Kolkata')
            current_time = datetime.now(ist_tz)
            
            # Check if it's a weekday (Monday=0, Sunday=6)
            if current_time.weekday() >= 5:  # Saturday or Sunday
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Trading for {trade_data.asset} is not allowed on weekends. Market is open Monday-Friday, 9:15 AM - 3:30 PM IST."
                )
            
            # Check if current time is within market hours (9:15 AM - 3:30 PM)
            market_open = dt_time(9, 15)  # 9:15 AM
            market_close = dt_time(15, 30)  # 3:30 PM
            current_time_only = current_time.time()
            
            if not (market_open <= current_time_only <= market_close):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Trading for {trade_data.asset} is not allowed outside market hours. Market is open Monday-Friday, 9:15 AM - 3:30 PM IST. Current time: {current_time.strftime('%A, %I:%M %p IST')}"
                )
        
        # Find AI model with exact matching code_name
        ai_model_query = select(AIModel).where(AIModel.code_name == trade_data.code_name)
        ai_model_result = await db.execute(ai_model_query)
        ai_model = ai_model_result.scalar_one_or_none()
        
        if not ai_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No AI model found with code_name '{trade_data.code_name}'. Please ensure the code_name matches an existing AI model."
            )
        
        # Use the AI model's display_name and id
        ai_model_id = ai_model.id
        display_name = ai_model.display_name
        
        # Get LTP data from Redis if price or notional_value is not provided
        ltp = trade_data.price
        if ltp is None or trade_data.notional_value is None:
            try:
                ltp_data = redis_client.hgetall('ltp_data')
                
                if trade_data.asset not in ltp_data:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"LTP data not found for asset '{trade_data.asset}' in Redis. Please ensure the asset is being tracked."
                    )
                
                # Calculate LTP based on asset type
                if trade_data.asset == 'BTCUSD':
                    # Special calculation for BTCUSD
                    ltp = (((ltp_data[trade_data.asset]['last_price']) * 0.001) / 10)
                else:
                    ltp = ltp_data[trade_data.asset]['last_price']

                print(f"Fetched LTP for {trade_data.asset}: {ltp}")
                    
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error fetching LTP data from Redis: {str(e)}"
                )
        
        # Calculate notional value if not provided
        notional_value = trade_data.notional_value
        if notional_value is None:
            notional_value = ltp * trade_data.quantity
        
        # Use provided price if available, otherwise use calculated LTP
        price = trade_data.price if trade_data.price is not None else ltp
        
        # Create new Trade instance with mapped and calculated fields
        new_trade = Trade(
            display_name=display_name,
            code_name=trade_data.code_name,
            ai_model_id=ai_model_id,
            asset=trade_data.asset,
            side=trade_data.side,
            quantity=trade_data.quantity,
            price=price,
            notional_value=notional_value
        )
        
        # Add to database
        db.add(new_trade)
        
        # Update position table based on trade side
        position_query = select(Position).where(
            Position.code_name == trade_data.code_name,
            Position.asset == trade_data.asset
        )
        position_result = await db.execute(position_query)
        existing_position = position_result.scalar_one_or_none()
        
        if existing_position:
            # Update existing position quantity
            if trade_data.side == "BUY":
                # Increase quantity for BUY trades
                if existing_position.quantity is not None:
                    existing_position.quantity += trade_data.quantity
                else:
                    existing_position.quantity = trade_data.quantity
            elif trade_data.side == "SELL":
                # Decrease quantity for SELL trades
                if existing_position.quantity is not None:
                    existing_position.quantity -= trade_data.quantity
                else:
                    existing_position.quantity = -trade_data.quantity
            
            # Update last_price with the trade price
            existing_position.last_price = price
        
        # Update CASH position for the code_name
        cash_position_query = select(Position).where(
            Position.code_name == trade_data.code_name,
            Position.asset == "CASH"
        )
        cash_position_result = await db.execute(cash_position_query)
        cash_position = cash_position_result.scalar_one_or_none()
        
        if cash_position:
            # Check cash balance before executing BUY trade
            if trade_data.side == "BUY":
                # Calculate after-trade cash
                current_cash = cash_position.quantity if cash_position.quantity is not None else 0
                after_trade_cash = current_cash - notional_value
                
                # Raise error if cash would go negative
                if after_trade_cash < 0:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Insufficient cash balance. Current cash: {current_cash:.2f}, Required: {notional_value:.2f}, Shortfall: {abs(after_trade_cash):.2f}"
                    )
                
                # Decrease CASH for BUY trades (spending cash)
                cash_position.quantity = after_trade_cash
            elif trade_data.side == "SELL":
                # Increase CASH for SELL trades (receiving cash)
                if cash_position.quantity is not None:
                    cash_position.quantity += notional_value
                else:
                    cash_position.quantity = notional_value
        else:
            # If no CASH position exists and this is a BUY trade, reject it
            if trade_data.side == "BUY":
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"No CASH position found for code_name '{trade_data.code_name}'. Cannot execute BUY trade without cash balance."
                )
        
        await db.commit()
        await db.refresh(new_trade)
        
        return new_trade
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating trade: {str(e)}"
        )


@router.put("/update_position/{position_id}", response_model=PositionResponse, status_code=status.HTTP_200_OK)
async def update_position(
    position_id: int,
    position_data: PositionUpdate,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Update an existing position by ID.
    
    Path Parameters:
    - position_id: The ID of the position to update
    
    Body Parameters (all optional):
    - asset: Asset symbol/name
    - display_name: Display name for the position
    - percentage: Position percentage (0-100)
    - value: Position value
    - pnl: Profit and Loss
    - quantity: Quantity held
    - last_price: Last known price
    - code_name: AI model code name
    - ai_model_id: AI model ID
    
    Note: last_updated field will be automatically updated to current timestamp
    """
    try:
        # Find the existing position
        position_query = select(Position).where(Position.id == position_id)
        position_result = await db.execute(position_query)
        existing_position = position_result.scalar_one_or_none()
        
        if not existing_position:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Position with ID {position_id} not found"
            )
        
        # If ai_model_id is being updated, verify it exists
        if position_data.ai_model_id is not None:
            ai_model_query = select(AIModel).where(AIModel.id == position_data.ai_model_id)
            ai_model_result = await db.execute(ai_model_query)
            ai_model = ai_model_result.scalar_one_or_none()
            
            if not ai_model:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"AI model with ID {position_data.ai_model_id} not found"
                )
        
        # Update only the provided fields
        update_data = position_data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if hasattr(existing_position, field):
                setattr(existing_position, field, value)
        
        # Commit the changes
        await db.commit()
        await db.refresh(existing_position)
        
        return existing_position
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating position: {str(e)}"
        )


@router.post("/create_model_data", response_model=ModelDataResponse, status_code=status.HTTP_201_CREATED)
async def create_model_data(
    model_data: ModelDataCreateSimple,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Create a new model data entry with auto-filled fields.
    
    Required fields:
    - chat_name: Must match an existing AI model's code_name
    
    Optional fields:
    - account_value: Account value (must be >= 0)
    - return_value: Return value 
    - total_pnl: Total profit and loss
    - fees: Trading fees (must be >= 0)
    - trades: Number of trades (must be >= 0)
    
    Auto-filled fields:
    - ai_model_id: Mapped from AI model with matching code_name
    - display_name: Taken from the matched AI model's display_name
    - code_name: Set to the same value as chat_name
    """
    try:
        # Find AI model with exact matching code_name
        ai_model_query = select(AIModel).where(AIModel.code_name == model_data.chat_name)
        ai_model_result = await db.execute(ai_model_query)
        ai_model = ai_model_result.scalar_one_or_none()
        
        if not ai_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No AI model found with code_name '{model_data.chat_name}'. Please ensure the chat_name matches an existing AI model's code_name."
            )
        
        # Use the AI model's display_name and id
        ai_model_id = ai_model.id
        display_name = ai_model.display_name
        
        # Create new ModelData instance with mapped fields
        new_model_data = ModelData(
            ai_model_id=ai_model_id,
            code_name=model_data.chat_name,
            display_name=display_name,
            account_value=model_data.account_value,
            return_value=model_data.return_value,
            total_pnl=model_data.total_pnl,
            fees=model_data.fees,
            trades=model_data.trades
        )
        
        # Add to database
        db.add(new_model_data)
        await db.commit()
        await db.refresh(new_model_data)
        
        return new_model_data
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating model data: {str(e)}"
        )


@router.post("/create_position", response_model=PositionResponse, status_code=status.HTTP_201_CREATED)
async def create_position(
    position_data: PositionCreateSimple,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Create a new position with auto-filled fields.
    
    Required fields:
    - code_name: Must match an existing AI model's code_name
    - asset: Asset symbol/name (e.g., 'AAPL', 'BTC')
    - percentage: Position percentage (0-100)
    - value: Position value (must be >= 0)
    
    Optional fields:
    - pnl: Profit and Loss
    - quantity: Quantity held (must be >= 0)
    - last_price: Last known price (must be >= 0)
    
    Auto-filled fields:
    - ai_model_id: Mapped from AI model with matching code_name
    - display_name: Taken from the matched AI model's display_name
    - id: Auto-generated primary key
    - last_updated: Current timestamp
    """
    try:
        # Find AI model with exact matching code_name
        ai_model_query = select(AIModel).where(AIModel.code_name == position_data.code_name)
        ai_model_result = await db.execute(ai_model_query)
        ai_model = ai_model_result.scalar_one_or_none()
        
        if not ai_model:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No AI model found with code_name '{position_data.code_name}'. Please ensure the code_name matches an existing AI model."
            )
        
        # Use the AI model's display_name and id
        ai_model_id = ai_model.id
        display_name = ai_model.display_name
        
        # Create new Position instance with mapped fields
        new_position = Position(
            asset=position_data.asset,
            display_name=display_name,
            percentage=position_data.percentage,
            value=position_data.value,
            pnl=position_data.pnl,
            quantity=position_data.quantity,
            last_price=position_data.last_price,
            code_name=position_data.code_name,
            ai_model_id=ai_model_id
        )
        
        # Add to database
        db.add(new_position)
        await db.commit()
        await db.refresh(new_position)
        
        return new_position
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating position: {str(e)}"
        )


@router.put("/update_bulk_positions", response_model=PositionBulkUpdateResponse, status_code=status.HTTP_200_OK)
async def update_bulk_positions(
    bulk_data: PositionBulkUpdate,
    db: AsyncSession = Depends(get_db_session)
):
    """
    Update multiple positions in a single request.
    
    Request Body:
    - positions: List of position updates, each containing:
        - id (required): The ID of the position to update
        - Other fields (optional): Any position fields to update (asset, display_name, percentage, value, pnl, quantity, last_price, code_name, ai_model_id)
    
    Response:
    - success_count: Number of positions successfully updated
    - failed_count: Number of positions that failed to update
    - updated_positions: List of successfully updated positions
    - errors: List of errors for failed updates (each contains position_id and error message)
    
    Note: 
    - This endpoint processes all positions and returns partial success
    - If an ai_model_id is provided, it will be verified to exist
    - The last_updated field will be automatically updated for each position
    """
    updated_positions = []
    errors = []
    
    try:
        for position_item in bulk_data.positions:
            try:
                # Find the existing position
                position_query = select(Position).where(Position.id == position_item.id)
                position_result = await db.execute(position_query)
                existing_position = position_result.scalar_one_or_none()
                
                if not existing_position:
                    errors.append({
                        "position_id": position_item.id,
                        "error": f"Position with ID {position_item.id} not found"
                    })
                    continue
                
                # If ai_model_id is being updated, verify it exists
                if position_item.ai_model_id is not None:
                    ai_model_query = select(AIModel).where(AIModel.id == position_item.ai_model_id)
                    ai_model_result = await db.execute(ai_model_query)
                    ai_model = ai_model_result.scalar_one_or_none()
                    
                    if not ai_model:
                        errors.append({
                            "position_id": position_item.id,
                            "error": f"AI model with ID {position_item.ai_model_id} not found"
                        })
                        continue
                
                # Update only the provided fields
                update_data = position_item.model_dump(exclude_unset=True, exclude={'id'})
                
                for field, value in update_data.items():
                    if hasattr(existing_position, field):
                        setattr(existing_position, field, value)
                
                updated_positions.append(existing_position)
                
            except Exception as e:
                errors.append({
                    "position_id": position_item.id,
                    "error": str(e)
                })
        
        # Commit all successful updates
        if updated_positions:
            await db.commit()
            # Refresh all updated positions to get the latest data
            for position in updated_positions:
                await db.refresh(position)
        
        return PositionBulkUpdateResponse(
            success_count=len(updated_positions),
            failed_count=len(errors),
            updated_positions=updated_positions,
            errors=errors
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in bulk update: {str(e)}"
        )


# Delta Exchange Order Models
class DeltaOrderRequest(BaseModel):
    """Request model for Delta Exchange order placement"""
    product_id: int
    size: int
    side: str  # "buy" or "sell"
    order_type: str  # "limit_order" or "market_order"
    limit_price: Optional[str] = None  # Required for limit orders


class DeltaOrderResponse(BaseModel):
    """Response model for Delta Exchange order placement"""
    success: bool
    order_data: dict
    message: Optional[str] = None


# Delta Exchange API credentials
DELTA_API_KEY = os.getenv("DELTA_API_KEY")
DELTA_API_SECRET = os.getenv("DELTA_API_SECRET")
DELTA_API_BASE_URL = os.getenv("DELTA_API_BASE_URL", "https://api.india.delta.exchange")

if not DELTA_API_KEY or not DELTA_API_SECRET:
    raise ValueError(
        "DELTA_API_KEY and DELTA_API_SECRET environment variables are not set. "
        "Please set them in your .env file for Delta Exchange API access."
    )


def generate_delta_signature(secret: str, message: str) -> str:
    """
    Generate HMAC SHA256 signature for Delta Exchange API authentication
    
    Args:
        secret: API secret key
        message: Message to sign (method + timestamp + path + query_string + payload)
    
    Returns:
        Hexadecimal signature string
    """
    message_bytes = bytes(message, 'utf-8')
    secret_bytes = bytes(secret, 'utf-8')
    hash_obj = hmac.new(secret_bytes, message_bytes, hashlib.sha256)
    return hash_obj.hexdigest()


@router.post("/place_delta_order", response_model=DeltaOrderResponse, status_code=status.HTTP_200_OK)
async def place_delta_order(order_request: DeltaOrderRequest):
    """
    Place an order on Delta Exchange.
    
    Request Body:
    - product_id: Delta Exchange product ID (integer)
    - size: Order size/quantity (integer)
    - side: Order side - "buy" or "sell"
    - order_type: Order type - "limit_order" or "market_order"
    - limit_price: Price for limit orders (string, optional - required for limit_order type)
    
    Returns:
    - success: Boolean indicating if order was placed successfully
    - order_data: Full response from Delta Exchange API
    - message: Success or error message
    
    Example Request:
    ```json
    {
        "product_id": 27,
        "size": 1,
        "side": "buy",
        "order_type": "limit_order",
        "limit_price": "155422"
    }
    ```
    """
    try:
        # Prepare API request
        method = 'POST'
        timestamp = str(int(time.time()))
        path = '/v2/orders'
        query_string = ''
        
        # Build request body
        body = {
            "product_id": order_request.product_id,
            "size": order_request.size,
            "side": order_request.side,
            "order_type": order_request.order_type
        }
        
        # Add limit_price if provided
        if order_request.limit_price:
            body["limit_price"] = order_request.limit_price
        
        # Convert body to JSON string
        payload = json.dumps(body)
        
        # Generate signature
        signature_data = method + timestamp + path + query_string + payload
        signature = generate_delta_signature(DELTA_API_SECRET, signature_data)
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'api-key': DELTA_API_KEY,
            'signature': signature,
            'timestamp': timestamp
        }
        
        # Make API request
        response = requests.post(
            f"{DELTA_API_BASE_URL}{path}",
            params={},
            data=payload,
            headers=headers,
            timeout=10  # 10 second timeout
        )
        
        # Parse response
        response_data = response.json()
        
        # Check if request was successful
        if response.status_code == 200 or response.status_code == 201:
            return DeltaOrderResponse(
                success=True,
                order_data=response_data,
                message="Order placed successfully"
            )
        else:
            return DeltaOrderResponse(
                success=False,
                order_data=response_data,
                message=f"Order placement failed with status {response.status_code}"
            )
            
    except requests.exceptions.Timeout:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="Request to Delta Exchange API timed out"
        )
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error communicating with Delta Exchange API: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error placing order: {str(e)}"
        )

import websocket
import json
import time
from direct_redis import DirectRedis

redis = DirectRedis()

# production websocket base url
WEBSOCKET_URL = "wss://socket.india.delta.exchange"

def on_error(ws, error):
    print(f"Socket Error: {error}")

def on_close(ws, close_status_code, close_msg):
    print(f"Socket closed with status: {close_status_code} and message: {close_msg}")
    print("Reconnecting in 5 seconds...")
    time.sleep(5)
    connect_websocket()

def on_open(ws):
  print(f"Socket opened")
  # subscribe tickers of perpetual futures - BTCUSD & ETHUSD
  subscribe(ws, "v2/ticker", ["BTCUSD"])

def subscribe(ws, channel, symbols):
    payload = {
        "type": "subscribe",
        "payload": {
            "channels": [
                {
                    "name": channel,
                    "symbols": symbols
                }
            ]
        }
    }
    ws.send(json.dumps(payload))

def on_message(ws, message):
    # print json response
    message_json = json.loads(message)
    try:
        redis.hset("ltp_data", "BTCUSD", {'last_price': float(message_json['mark_price'])*89, 'change': float(message_json['ltp_change_24h'])})
    except:
        pass
    print(message_json)

def connect_websocket():
    ws = websocket.WebSocketApp(WEBSOCKET_URL, on_message=on_message, on_error=on_error, on_close=on_close)
    ws.on_open = on_open
    ws.run_forever()

if __name__ == "__main__":
    connect_websocket()
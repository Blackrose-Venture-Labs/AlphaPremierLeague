import logging
from kiteconnect import KiteTicker
from dotenv import load_dotenv
import os

from direct_redis import DirectRedis

redis = DirectRedis()

load_dotenv()

logging.basicConfig(level=logging.INFO)

# Initialise
kws = KiteTicker(os.getenv("ZERODHA_API_KEY"), redis.get('ZERODHA_ACCESS_TOKEN'))
master_data = redis.get('ZERODHA_MASTER_DATA')
mapping = redis.get('ZERODHA_MAPPING')

def on_ticks(ws, ticks):
    for tick in ticks:
        symbol = mapping.get(tick['instrument_token'], 'UNKNOWN')
        redis.hset(f"ltp_data", symbol, tick)
        logging.info(f"Tick for {symbol}: {tick['last_price']} {tick['exchange_timestamp']}")
        

        

def on_connect(ws, response):
    # Callback on successful connect.
    # Subscribe to a list of instrument_tokens (RELIANCE and ACC here).
    list_tokens = []
    for symbol, data in master_data.items():
        list_tokens.append(data['instrument_token'])
    ws.subscribe(list_tokens)

    # Set RELIANCE to tick in `full` mode.
    ws.set_mode(ws.MODE_FULL, list_tokens)

def on_close(ws, code, reason):
    # On connection close stop the main loop
    # Reconnection will not happen after executing `ws.stop()`
    ws.stop()

# Assign the callbacks.
kws.on_ticks = on_ticks
kws.on_connect = on_connect
kws.on_close = on_close

# Infinite loop on the main thread. Nothing after this will run.
# You have to use the pre-defined callbacks to manage subscriptions.
kws.connect()
from kiteconnect import KiteConnect
import requests, pyotp
import os
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv
from direct_redis import DirectRedis
import pandas as pd


# Load environment variables
load_dotenv()

def generate_zerodha_access_token():
    # Get environment variables
    api_key = os.getenv("ZERODHA_API_KEY")
    secret = os.getenv("ZERODHA_SECRET")
    user_id = os.getenv("ZERODHA_USER_ID")
    password = os.getenv("ZERODHA_PASSWORD")
    totp_key = os.getenv("ZERODHA_TOTP_KEY")
    
    # Validate required environment variables
    if not all([api_key, secret, user_id, password, totp_key]):
        raise ValueError("Missing required Zerodha environment variables. Please check your .env file.")
    
    kite = KiteConnect(api_key=api_key)
    session = requests.Session()
    request_id = session.post(
        "https://kite.zerodha.com/api/login", 
        {"user_id": user_id, "password": password}
    ).json()["data"]["request_id"]
    session.post(
        "https://kite.zerodha.com/api/twofa", 
        {"user_id": user_id, "request_id": request_id, "twofa_value": pyotp.TOTP(totp_key).now()}
    )
    api_session = session.get(f"https://kite.trade/connect/login?api_key={api_key}")
    parsed = urlparse(api_session.url)
    request_token = parse_qs(parsed.query)["request_token"][0]
    access_token = kite.generate_session(request_token, api_secret=secret)["access_token"]
    return access_token

def get_master(redis_client):
    master = pd.read_csv("https://api.kite.trade/instruments")
    master = master[(master['exchange'] == "NSE")]
    sub_master = master[master['tradingsymbol'].isin(['NIFTYBEES', 'GOLDBEES', 'LIQUIDCASE', 'LOWVOLIETF', 'MOMOMENTUM'])]
    
    sub_master_mapping = sub_master.set_index('instrument_token')
    mapping = sub_master_mapping['tradingsymbol'].to_dict()

    redis_client.delete("ZERODHA_MAPPING")
    redis_client.set("ZERODHA_MAPPING", mapping)

    sub_master = sub_master.set_index('tradingsymbol')
    x = sub_master['instrument_token exchange_token lot_size instrument_type segment exchange'.split()].to_dict('index')
    
    redis_client.delete("ZERODHA_MASTER_DATA")
    redis_client.set("ZERODHA_MASTER_DATA", x)


if __name__ == "__main__":
    token = generate_zerodha_access_token()
    print("Zerodha Access Token generated successfully.")
    redis_client = DirectRedis()
    get_master(redis_client)
    redis_client.set("ZERODHA_ACCESS_TOKEN", token)

    
    
    
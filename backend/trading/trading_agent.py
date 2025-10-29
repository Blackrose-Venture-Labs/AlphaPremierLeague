import requests
from requests.auth import HTTPBasicAuth
from direct_redis import DirectRedis
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

redis = DirectRedis()

# Load N8N credentials from environment variables
username = os.getenv("N8N_USERNAME")
password = os.getenv("N8N_PASSWORD")
url = os.getenv("N8N_WEBHOOK_URL")
auth_token = os.getenv("N8N_AUTH_TOKEN")

if not all([username, password, url, auth_token]):
    raise ValueError(
        "Missing required N8N environment variables. "
        "Please set N8N_USERNAME, N8N_PASSWORD, N8N_WEBHOOK_URL, and N8N_AUTH_TOKEN in your .env file."
    )

def get_payload(model):

    data = {
        "token": redis.get('ZERODHA_ACCESS_TOKEN'),
        "ai_model": model,
        "symbols": redis.hkeys('ltp_data'),
        "mapping": redis.get('ZERODHA_MAPPING'),
        
    }

    return data


models = ['chatgpt_5', 'grok_4', 'deepseek_v3.1', 'qwen_3', 'claude_v4.5']

while True:
    print("Starting position updates...")
    

    for model in models:
        data = get_payload(model)

        headers = {
            "host": "n8n.blackrose.cloud",
            "user-agent": "python-requests/2.32.5",
            "content-type": "application/json",
            "accept": "*/*",
            "accept-encoding": "gzip, deflate",
            "authorization": f"Basic {auth_token}",  # Loaded from environment
            "x-forwarded-for": "91.203.135.29",
            "x-forwarded-host": "n8n.blackrose.cloud",
            "x-forwarded-port": "443",
            "x-forwarded-proto": "https",
            "x-forwarded-server": "srv1019412",
            "x-real-ip": "91.203.135.29"
        }

        print(data)

        response = requests.post(url,headers=headers, json=data, auth=HTTPBasicAuth(username, password))
        print(f"Model: {model}, Status Code: {response.status_code}, Response: {response.text}")
        time.sleep(2)

    print('sleeping for 60 minutes before next update cycle')
    time.sleep(60*60)  # Wait for 60 minutes before the next round

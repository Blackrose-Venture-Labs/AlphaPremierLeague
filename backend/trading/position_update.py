import requests
import time
import json
from datetime import datetime
from typing import Optional
from direct_redis import DirectRedis
import pandas as pd
import random

redis_client = DirectRedis()

def update_price(postion_id, data):
    url = f"https://api.alphaarena.in/api/v1/models/update_position/{postion_id}"

    headers = {
        "accept": "application/json",
        "Content-Type": "application/json"
    }

    response = requests.put(url, headers=headers, json=data)

    print("Status Code:", response.status_code)
    print("Response:", response.json())

def bulk_update_positions(positions_data):
    """
    Update multiple positions at once using the bulk update endpoint
    
    Args:
        positions_data: List of position updates, each with 'id' and fields to update
    """
    url = "https://api.alphaarena.in/api/v1/models/update_bulk_positions"
    
    headers = {
        "accept": "application/json",
        "Content-Type": "application/json"
    }
    
    payload = {
        "positions": positions_data
    }
    
    response = requests.put(url, headers=headers, json=payload)
    
    print("Bulk Update Status Code:", response.status_code)
    result = response.json()
    
    return response

def create_modeldata(payload):

    url = "https://api.alphaarena.in/api/v1/models/create_model_data"
    
    headers = {
        "accept": "application/json",
        "Content-Type": "application/json"
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    print(response.status_code)
    print(response.json())


while True:

    try:
        position = requests.get(url='http://localhost:8000/api/v1/models/get_all_positions?order_by=last_updated&order_direction=desc').json()
        ltp_data = redis_client.hgetall('ltp_data')
        pos_df = pd.DataFrame(position)
        total_value_dict = pos_df.groupby('code_name').agg({'value': 'sum'}).to_dict('index')
        
        # Collect all position updates for bulk update
        bulk_updates = []
        
        for pos in position:
            ###########################################
            quantity = pos['quantity']
            ###########################################
            if pos['asset'] == 'CASH':
                ltp = 1
            elif pos['asset'] == 'BTCUSD':
                ltp = (((ltp_data[pos['asset']]['last_price'])*0.001)/10)
            else:
                ltp = ltp_data[pos['asset']]['last_price']

            value = ltp * quantity#ltp * pos['quantity']
            print(pos)
            print(total_value_dict[pos['code_name']]['value'])
            percentage = round(value/total_value_dict[pos['code_name']]['value'], 2)*100
            print(pos['asset'], ltp, value, percentage)
            
            # Add to bulk update list instead of updating individually
            bulk_updates.append({
                "id": pos['id'],
                "last_price": ltp,
                "value": value,
                "percentage": percentage,
                "quantity": quantity
            })

        print(bulk_updates)
        
        # Update all positions at once
        if bulk_updates:
            bulk_update_positions(bulk_updates)


        #Do the ModelTable Update
        position = requests.get(url='http://localhost:8000/api/v1/models/get_all_positions?order_by=last_updated&order_direction=desc').json()
        pos_df = pd.DataFrame(position)

        inital_capital = 10e3
        for code_name, sub_df in pos_df.groupby('code_name'):
            total_value = float(sub_df['value'].sum())
            all_trades = requests.get(url=f"https://api.alphaarena.in/api/v1/models/get_all_trades?code_name={code_name}&order_by=last_update_time&order_direction=desc").json()
            payload = {
                "chat_name": code_name,
                "account_value": total_value,
                "return_value": (float(((total_value-inital_capital)/inital_capital)*100)),
                "total_pnl": float(total_value-inital_capital),
                "fees": 0,
                "trades": len(all_trades)
            }
            create_modeldata(payload)


        time.sleep(5)

    except Exception as e:
        print("Error in position update loop:", str(e))
        time.sleep(5)

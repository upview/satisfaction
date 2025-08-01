#!/usr/bin/env python3
import requests

# Change this URL to your app
BASE_URL = "https://satisfactron.vercel.app/"

def send_vote(device_id, vote_value):
    """Send a vote to the API"""
    url = f"{BASE_URL}/api/votes"
    data = {
        "deviceId": device_id,
        "voteValue": vote_value
    }
    
    response = requests.post(url, json=data)
    
    if response.status_code == 201:
        print(f"✅ Vote {vote_value} sent successfully!")
    else:
        print(f"❌ Error: {response.status_code} - {response.text}")

# Example usage
if __name__ == "__main__":
    # device_id = create_device("Test Device")
    device_id = '256d5952-6335-11f0-bda2-bf492b151827'
    
    if device_id:
        # Send some votes
        send_vote(device_id, 1)
        send_vote(device_id, 1)
        send_vote(device_id, 1)
        print(f"Check your dashboard: {BASE_URL}")
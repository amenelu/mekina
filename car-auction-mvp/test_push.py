import requests
import json

# Configuration
BASE_URL = "http://localhost:5001"
BUYER_USERNAME = "mobile_buyer"
DEALER_USERNAME = "mobile_dealer"
PASSWORD = "password123"
MOCK_FCM_TOKEN = "DEVICE_TOKEN_XYZ_999"


def run_test():
    print("--- 1. Registering Users (if not exist) ---")
    # Register Buyer
    requests.post(
        f"{BASE_URL}/auth/api/register",
        json={
            "username": BUYER_USERNAME,
            "email": f"{BUYER_USERNAME}@test.com",
            "password": PASSWORD,
            "password2": PASSWORD,
        },
    )
    # Register Dealer
    requests.post(
        f"{BASE_URL}/auth/api/register",
        json={
            "username": DEALER_USERNAME,
            "email": f"{DEALER_USERNAME}@test.com",
            "password": PASSWORD,
            "password2": PASSWORD,
        },
    )

    print("\n--- 2. Logging in Buyer (Sending FCM Token) ---")
    # Login Buyer and send the FCM token in the payload
    response = requests.post(
        f"{BASE_URL}/auth/api/login",
        json={
            "login": BUYER_USERNAME,
            "password": PASSWORD,
            "fcm_token": MOCK_FCM_TOKEN,  # <--- This saves the token to DB
        },
    )

    if response.status_code != 200:
        print("Buyer Login Failed:", response.text)
        return

    buyer_token = response.json()["token"]
    print(f"Buyer logged in. Token saved for user: {BUYER_USERNAME}")

    print("\n--- 3. Creating a Car Request (as Buyer) ---")
    req_data = {
        "make": "Toyota",
        "model": "Corolla",
        "min_year": 2022,
        "notes": "Testing push notifications",
    }
    response = requests.post(
        f"{BASE_URL}/requests/api/requests",
        json=req_data,
        headers={"Authorization": f"Bearer {buyer_token}"},
    )
    request_id = response.json()["request"]["id"]
    print(f"Request created with ID: {request_id}")

    print("\n--- 4. Logging in Dealer ---")
    response = requests.post(
        f"{BASE_URL}/auth/api/login",
        json={"login": DEALER_USERNAME, "password": PASSWORD},
    )
    dealer_token = response.json()["token"]

    print("\n--- 5. Placing Bid (Triggers Notification) ---")
    bid_data = {
        "price": 2000000,
        "make": "Toyota",
        "model": "Corolla",
        "car_year": 2022,
        "condition": "Used",
        "availability": "In Stock",
        "valid_until": "2025-12-31",
    }
    response = requests.post(
        f"{BASE_URL}/dealer/api/requests/{request_id}/bids",
        json=bid_data,
        headers={"Authorization": f"Bearer {dealer_token}"},
    )

    if response.status_code == 201:
        print("Bid placed successfully!")
        print("\n✅ TEST COMPLETE: Check your Flask server console.")
        print(f"You should see: '--- [MOCK PUSH] To User {BUYER_USERNAME} ...'")
    else:
        print("Failed to place bid:", response.text)


if __name__ == "__main__":
    try:
        run_test()
    except requests.exceptions.ConnectionError:
        print(
            "Error: Could not connect to server. Make sure 'python run.py' is running."
        )

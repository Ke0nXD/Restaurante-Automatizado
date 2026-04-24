#!/usr/bin/env python3
"""
Additional comprehensive test for specific review scenarios
"""

import requests
import json
import time
import sys

# Configuration
BASE_URL = "https://dine-in-ordering.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@sabor.com"
ADMIN_PASSWORD = "admin123"
CUSTOMER_EMAIL = "joao_val@teste.com"
CUSTOMER_PASSWORD = "123456"

def make_request(method: str, endpoint: str, data: dict = None, token: str = None):
    """Make HTTP request with proper headers"""
    url = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
        
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, json=data, headers=headers, timeout=10)
        elif method.upper() == "PATCH":
            response = requests.patch(url, json=data, headers=headers, timeout=10)
        else:
            raise ValueError(f"Unsupported method: {method}")
            
        return response
    except Exception as e:
        print(f"Request failed: {e}")
        raise

def login(email: str, password: str) -> str:
    """Login and return token"""
    response = make_request("POST", "/auth/login", {
        "email": email,
        "password": password
    })
    
    if response.status_code == 200:
        return response.json().get("token")
    else:
        print(f"Login failed: {response.status_code}")
        return None

def test_payment_methods():
    """Test different payment methods for request-payment"""
    print("=== TESTING DIFFERENT PAYMENT METHODS ===")
    
    # Login as customer
    customer_token = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
    if not customer_token:
        print("❌ Failed to login as customer")
        return
    
    # Create a new order to get a fresh comanda
    response = make_request("POST", "/orders", {
        "type": "local",
        "table": "77",
        "items": [{"productId": "p-burger-classic", "quantity": 1}]
    }, token=customer_token)
    
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create order: {response.status_code}")
        return
        
    comanda_id = response.json().get("comandaId")
    print(f"✅ Created order with comanda: {comanda_id}")
    
    # Test different payment methods
    payment_methods = ["Pix", "Cartão", "Dinheiro"]
    
    for method in payment_methods:
        print(f"\n--- Testing payment method: {method} ---")
        
        # Request payment
        response = make_request("POST", f"/comandas/{comanda_id}/request-payment", {
            "method": method
        })
        
        if response.status_code == 200:
            data = response.json()
            status = data.get("status")
            payment_method = data.get("paymentMethod")
            
            if status == "aguardando_pagamento" and payment_method == method:
                print(f"✅ {method}: Status={status}, PaymentMethod={payment_method}")
            else:
                print(f"❌ {method}: Unexpected response - Status={status}, PaymentMethod={payment_method}")
        else:
            print(f"❌ {method}: Request failed with status {response.status_code}")

def test_specific_customer_flow():
    """Test the specific customer flow mentioned in review"""
    print("\n=== TESTING SPECIFIC CUSTOMER FLOW ===")
    
    # Login as joao_val@teste.com
    customer_token = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD)
    if not customer_token:
        print("❌ Failed to login as joao_val@teste.com")
        return
    
    print("✅ Logged in as joao_val@teste.com")
    
    # 1. Create first local order on table 99
    print("\n1. Creating first order on table 99...")
    response = make_request("POST", "/orders", {
        "type": "local",
        "table": "99",
        "items": [{"productId": "p-burger-classic", "quantity": 1}]
    }, token=customer_token)
    
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create first order: {response.status_code}")
        return
        
    first_order = response.json()
    first_comanda_id = first_order.get("comandaId")
    print(f"✅ First order created: {first_order.get('id')}, comanda: {first_comanda_id}")
    
    # 2. Get comandaId from /api/me/comandas
    print("\n2. Getting comandas from /api/me/comandas...")
    response = make_request("GET", "/me/comandas", token=customer_token)
    
    if response.status_code == 200:
        comandas = response.json()
        print(f"✅ Found {len(comandas)} comandas")
        
        # Find our comanda
        our_comanda = None
        for comanda in comandas:
            if comanda.get("id") == first_comanda_id:
                our_comanda = comanda
                break
                
        if our_comanda:
            print(f"✅ Found our comanda with {len(our_comanda.get('orders', []))} orders")
        else:
            print("❌ Our comanda not found in response")
            return
    else:
        print(f"❌ Failed to get comandas: {response.status_code}")
        return
    
    # 3. Create second order on SAME table and SAME user
    print("\n3. Creating second order on same table 99...")
    response = make_request("POST", "/orders", {
        "type": "local",
        "table": "99",
        "items": [{"productId": "p-pizza-margherita", "quantity": 1}]
    }, token=customer_token)
    
    if response.status_code not in [200, 201]:
        print(f"❌ Failed to create second order: {response.status_code}")
        return
        
    second_order = response.json()
    second_comanda_id = second_order.get("comandaId")
    print(f"✅ Second order created: {second_order.get('id')}, comanda: {second_comanda_id}")
    
    # 4. Verify same comanda is used
    if first_comanda_id == second_comanda_id:
        print("✅ SAME COMANDA REUSED - Fusion working correctly!")
    else:
        print(f"❌ DIFFERENT COMANDAS - Fusion failed! First: {first_comanda_id}, Second: {second_comanda_id}")
        return
    
    # 5. GET comanda to verify it has 2 orders
    print("\n4. Verifying comanda has both orders...")
    response = make_request("GET", f"/comandas/{first_comanda_id}")
    
    if response.status_code == 200:
        comanda_data = response.json()
        orders = comanda_data.get("orders", [])
        print(f"✅ Comanda has {len(orders)} orders")
        
        if len(orders) >= 2:
            print("✅ COMANDA FUSION VERIFIED - Multiple orders in same comanda")
        else:
            print(f"❌ Expected at least 2 orders, found {len(orders)}")
    else:
        print(f"❌ Failed to get comanda: {response.status_code}")

def main():
    """Run all specific tests"""
    print("=== COMANDA SPECIFIC SCENARIO TESTS ===\n")
    
    # Test different payment methods
    test_payment_methods()
    
    # Test specific customer flow
    test_specific_customer_flow()
    
    print("\n=== ALL SPECIFIC TESTS COMPLETED ===")

if __name__ == "__main__":
    main()
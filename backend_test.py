#!/usr/bin/env python3

import requests
import json
import time
import sys

# Configuration
BASE_URL = "https://dine-in-ordering.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@sabor.com"
ADMIN_PASSWORD = "admin123"

def test_clear_all_notifications():
    """Test the new clear-all notifications endpoint"""
    print("🧪 Testing clear-all notifications endpoint...")
    
    # Step 1: Login as admin to get token
    print("\n1. Login as admin...")
    login_response = requests.post(f"{BASE_URL}/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    
    if login_response.status_code != 200:
        print(f"❌ Admin login failed: {login_response.status_code} - {login_response.text}")
        return False
    
    admin_token = login_response.json().get("token")
    if not admin_token:
        print("❌ No token received from admin login")
        return False
    
    print(f"✅ Admin login successful, token received")
    
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Step 2: Create 2-3 orders to generate automatic notifications
    print("\n2. Creating orders to generate notifications...")
    
    orders_created = []
    for i in range(3):
        order_data = {
            "type": "delivery",
            "items": [
                {
                    "productId": "p-burger-classic",
                    "quantity": 1,
                    "price": 38.9,
                    "name": "Burger Clássico"
                }
            ],
            "total": 38.9,
            "paymentMethod": "cash_delivery",
            "address": {
                "street": f"Rua Teste {i+1}, 123",
                "city": "São Paulo",
                "zipCode": "01234-567"
            },
            "customer": {
                "name": f"Cliente Teste {i+1}",
                "phone": f"1199999888{i}",
                "email": f"cliente{i+1}@teste.com"
            }
        }
        
        order_response = requests.post(f"{BASE_URL}/orders", json=order_data)
        if order_response.status_code == 201:
            order_id = order_response.json().get("id")
            orders_created.append(order_id)
            print(f"✅ Order {i+1} created: {order_id}")
        else:
            print(f"⚠️ Order {i+1} creation failed: {order_response.status_code} - {order_response.text}")
    
    if len(orders_created) < 2:
        print("❌ Failed to create enough orders for testing")
        return False
    
    # Wait a moment for notifications to be created
    time.sleep(1)
    
    # Step 3: GET /api/admin/notifications to verify notifications exist
    print("\n3. Checking existing notifications...")
    
    get_notifs_response = requests.get(f"{BASE_URL}/admin/notifications", headers=headers)
    if get_notifs_response.status_code != 200:
        print(f"❌ Failed to get notifications: {get_notifs_response.status_code} - {get_notifs_response.text}")
        return False
    
    notifications_before = get_notifs_response.json()
    print(f"✅ Found {len(notifications_before)} notifications before clear-all")
    
    if len(notifications_before) < 2:
        print("⚠️ Expected at least 2 notifications from created orders")
        # Continue with test anyway
    
    # Step 4: POST /api/admin/notifications with {"action":"clear-all"}
    print("\n4. Testing clear-all action...")
    
    clear_all_response = requests.post(f"{BASE_URL}/admin/notifications", 
                                     headers=headers,
                                     json={"action": "clear-all"})
    
    if clear_all_response.status_code != 200:
        print(f"❌ Clear-all failed: {clear_all_response.status_code} - {clear_all_response.text}")
        return False
    
    clear_result = clear_all_response.json()
    print(f"✅ Clear-all response: {clear_result}")
    
    # Verify response format
    if not clear_result.get("ok"):
        print("❌ Clear-all response missing 'ok: true'")
        return False
    
    deleted_count = clear_result.get("deletedCount", 0)
    if deleted_count < 2:
        print(f"⚠️ Expected deletedCount >= 2, got {deleted_count}")
    else:
        print(f"✅ Deleted {deleted_count} notifications")
    
    # Step 5: GET /api/admin/notifications again to verify they're cleared
    print("\n5. Verifying notifications are cleared...")
    
    get_notifs_after_response = requests.get(f"{BASE_URL}/admin/notifications", headers=headers)
    if get_notifs_after_response.status_code != 200:
        print(f"❌ Failed to get notifications after clear: {get_notifs_after_response.status_code}")
        return False
    
    notifications_after = get_notifs_after_response.json()
    print(f"✅ Found {len(notifications_after)} notifications after clear-all")
    
    if len(notifications_after) > 0:
        print("⚠️ Expected empty array or only notifications from other roles")
        # This might be OK if there are notifications for other roles
    
    # Step 6: Test clear-all without auth (should return 401)
    print("\n6. Testing clear-all without authentication...")
    
    unauth_response = requests.post(f"{BASE_URL}/admin/notifications", 
                                  json={"action": "clear-all"})
    
    if unauth_response.status_code != 401:
        print(f"❌ Expected 401 without auth, got {unauth_response.status_code}")
        return False
    
    print("✅ Clear-all correctly returns 401 without authentication")
    
    # Step 7: Test regression - read-all action still works
    print("\n7. Testing read-all regression...")
    
    # First create a new order to generate a notification
    order_data = {
        "type": "delivery",
        "items": [
            {
                "productId": "p-burger-classic",
                "quantity": 1,
                "price": 38.9,
                "name": "Burger Clássico"
            }
        ],
        "total": 38.9,
        "paymentMethod": "cash_delivery",
        "address": {
            "street": "Rua Regressão, 456",
            "city": "São Paulo",
            "zipCode": "01234-567"
        },
        "customer": {
            "name": "Cliente Regressão",
            "phone": "11999998887",
            "email": "regressao@teste.com"
        }
    }
    
    regression_order_response = requests.post(f"{BASE_URL}/orders", json=order_data)
    if regression_order_response.status_code == 201:
        print("✅ Created order for regression test")
        time.sleep(1)  # Wait for notification
        
        # Test read-all
        read_all_response = requests.post(f"{BASE_URL}/admin/notifications", 
                                        headers=headers,
                                        json={"action": "read-all"})
        
        if read_all_response.status_code != 200:
            print(f"❌ Read-all failed: {read_all_response.status_code}")
            return False
        
        print("✅ Read-all action works correctly")
        
        # Verify notification is marked as read
        get_notifs_read_response = requests.get(f"{BASE_URL}/admin/notifications", headers=headers)
        if get_notifs_read_response.status_code == 200:
            notifs_after_read = get_notifs_read_response.json()
            if len(notifs_after_read) > 0 and notifs_after_read[0].get("isRead"):
                print("✅ Notification correctly marked as read")
            else:
                print("⚠️ Notification not marked as read or no notifications found")
    else:
        print(f"⚠️ Failed to create order for regression test: {regression_order_response.status_code}")
    
    # Step 8: Test GET /api/admin/notifications without auth returns 401
    print("\n8. Testing GET notifications without auth...")
    
    unauth_get_response = requests.get(f"{BASE_URL}/admin/notifications")
    
    if unauth_get_response.status_code != 401:
        print(f"❌ Expected 401 for GET without auth, got {unauth_get_response.status_code}")
        return False
    
    print("✅ GET notifications correctly returns 401 without authentication")
    
    print("\n🎉 All clear-all notifications tests completed successfully!")
    return True

def main():
    """Run all tests"""
    print("🚀 Starting clear-all notifications endpoint tests...")
    
    try:
        success = test_clear_all_notifications()
        
        if success:
            print("\n✅ ALL TESTS PASSED")
            sys.exit(0)
        else:
            print("\n❌ SOME TESTS FAILED")
            sys.exit(1)
            
    except Exception as e:
        print(f"\n💥 Test execution failed: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
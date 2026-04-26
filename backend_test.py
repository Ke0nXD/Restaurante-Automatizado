#!/usr/bin/env python3
"""
Focused regression test on restaurant API after recent hotfixes.
Testing scenarios:
1. Cash delivery with change (regression)
2. Driver delivery flow now finalizes order
3. Driver "Não Entregue" still works
4. Type filter on history
5. Quick regression
"""

import requests
import json
import os
import time
from datetime import datetime

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://dine-in-ordering.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@sabor.com"
ADMIN_PASSWORD = "admin123"

class TestRunner:
    def __init__(self):
        self.admin_token = None
        self.test_results = []
        self.created_orders = []
        
    def log_result(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details
        })
        
    def login_admin(self):
        """Login as admin and get token"""
        try:
            response = requests.post(f"{API_BASE}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get('token')
                self.log_result("Admin login", True, f"Token obtained")
                return True
            else:
                self.log_result("Admin login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Admin login", False, f"Exception: {str(e)}")
            return False
            
    def get_admin_headers(self):
        """Get headers with admin token"""
        return {"Authorization": f"Bearer {self.admin_token}"}
        
    def get_existing_product(self):
        """Get an existing product for testing"""
        try:
            response = requests.get(f"{API_BASE}/products")
            if response.status_code == 200:
                products = response.json()
                if products:
                    product = products[0]
                    print(f"    Using product: {product.get('name')} (ID: {product.get('id')}, Price: {product.get('price')})")
                    return product
            return None
        except Exception as e:
            print(f"    Error getting product: {str(e)}")
            return None
            
    def test_cash_delivery_with_change(self):
        """Test 1: Cash delivery with change (regression)"""
        print("\n=== Test 1: Cash delivery with change ===")
        
        product = self.get_existing_product()
        if not product:
            self.log_result("Cash delivery - get product", False, "No products available")
            return
            
        # Test with changeNeeded=true
        order_data = {
            "type": "delivery",
            "items": [{
                "productId": product['id'],
                "name": product['name'],
                "price": product['price'],
                "quantity": 1,
                "addOns": []
            }],
            "customer": {
                "name": "João Silva",
                "phone": "11999998888",
                "email": "joao@test.com"
            },
            "address": {
                "street": "Rua das Flores, 123",
                "neighborhood": "Centro",
                "city": "São Paulo",
                "state": "SP",
                "zipCode": "01234-567"
            },
            "payment": {
                "method": "cash_delivery",
                "changeNeeded": True,
                "changeFor": 100
            }
        }
        
        try:
            print(f"    Creating order with product: {product['id']}")
            print(f"    Order data: {json.dumps(order_data, indent=2)}")
            response = requests.post(f"{API_BASE}/orders", json=order_data)
            print(f"    Response status: {response.status_code}")
            print(f"    Response text: {response.text}")
            
            if response.status_code == 201:
                order = response.json()
                self.created_orders.append(order['id'])
                
                # Validate payment details
                payment = order.get('payment', {})
                total = order.get('total', 0)
                expected_change = 100 - total
                
                success = (
                    payment.get('method') == 'cash_delivery' and
                    payment.get('changeNeeded') == True and
                    payment.get('changeFor') == 100 and
                    abs(payment.get('changeAmount', 0) - expected_change) < 0.01
                )
                
                self.log_result(
                    "Cash delivery with change", 
                    success,
                    f"Method: {payment.get('method')}, ChangeNeeded: {payment.get('changeNeeded')}, ChangeFor: {payment.get('changeFor')}, ChangeAmount: {payment.get('changeAmount')}, Expected: {expected_change}"
                )
            else:
                self.log_result("Cash delivery with change", False, f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_result("Cash delivery with change", False, f"Exception: {str(e)}")
            
        # Test with changeNeeded=false
        order_data['payment'] = {
            "method": "cash_delivery",
            "changeNeeded": False
        }
        
        try:
            response = requests.post(f"{API_BASE}/orders", json=order_data)
            
            if response.status_code == 201:
                order = response.json()
                self.created_orders.append(order['id'])
                
                payment = order.get('payment', {})
                success = (
                    payment.get('method') == 'cash_delivery' and
                    payment.get('changeNeeded') == False and
                    'changeFor' not in payment and
                    'changeAmount' not in payment
                )
                
                self.log_result(
                    "Cash delivery without change", 
                    success,
                    f"Method: {payment.get('method')}, ChangeNeeded: {payment.get('changeNeeded')}"
                )
            else:
                self.log_result("Cash delivery without change", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Cash delivery without change", False, f"Exception: {str(e)}")
            
    def test_driver_delivery_flow_finalizes_order(self):
        """Test 2: Driver delivery flow now finalizes order"""
        print("\n=== Test 2: Driver delivery flow finalizes order ===")
        
        product = self.get_existing_product()
        if not product:
            self.log_result("Driver flow - get product", False, "No products available")
            return
            
        # Create a delivery order with PIX
        order_data = {
            "type": "delivery",
            "items": [{
                "productId": product['id'],
                "name": product['name'],
                "price": product['price'],
                "quantity": 1,
                "addOns": []
            }],
            "customer": {
                "name": "Maria Santos",
                "phone": "11888887777",
                "email": "maria@test.com"
            },
            "address": {
                "street": "Av. Paulista, 1000",
                "neighborhood": "Bela Vista",
                "city": "São Paulo",
                "state": "SP",
                "zipCode": "01310-100"
            },
            "payment": {
                "method": "pix"
            }
        }
        
        try:
            # Create order
            response = requests.post(f"{API_BASE}/orders", json=order_data)
            if response.status_code != 201:
                self.log_result("Driver flow - create order", False, f"Status: {response.status_code}")
                return
                
            order = response.json()
            order_id = order['id']
            self.created_orders.append(order_id)
            
            # Mark as 'Saiu para entrega'
            response = requests.patch(
                f"{API_BASE}/admin/orders/{order_id}",
                json={"status": "Saiu para entrega"},
                headers=self.get_admin_headers()
            )
            
            if response.status_code != 200:
                self.log_result("Driver flow - mark as out for delivery", False, f"Status: {response.status_code}")
                return
                
            # Driver marks as 'Entregue'
            response = requests.patch(
                f"{API_BASE}/admin/orders/{order_id}",
                json={
                    "deliveryStatus": "Entregue",
                    "paymentConfirmed": True
                },
                headers=self.get_admin_headers()
            )
            
            if response.status_code != 200:
                self.log_result("Driver flow - mark as delivered", False, f"Status: {response.status_code}")
                return
                
            # Get updated order
            response = requests.get(f"{API_BASE}/orders/{order_id}")
            if response.status_code != 200:
                self.log_result("Driver flow - get updated order", False, f"Status: {response.status_code}")
                return
                
            updated_order = response.json()
            
            # Check if order status is 'Finalizado'
            success = updated_order.get('status') == 'Finalizado'
            self.log_result(
                "Driver marks delivered → order Finalizado",
                success,
                f"Order status: {updated_order.get('status')}"
            )
            
            # Verify it appears in history=1
            response = requests.get(
                f"{API_BASE}/admin/orders?history=1",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                history_orders = response.json()
                found_in_history = any(o['id'] == order_id for o in history_orders)
                self.log_result(
                    "Finalized order appears in history=1",
                    found_in_history,
                    f"Found in history: {found_in_history}"
                )
            else:
                self.log_result("Check history=1", False, f"Status: {response.status_code}")
                
            # Verify it does NOT appear in history=0
            response = requests.get(
                f"{API_BASE}/admin/orders?history=0",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                active_orders = response.json()
                found_in_active = any(o['id'] == order_id for o in active_orders)
                self.log_result(
                    "Finalized order NOT in history=0",
                    not found_in_active,
                    f"Found in active: {found_in_active}"
                )
            else:
                self.log_result("Check history=0", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Driver delivery flow", False, f"Exception: {str(e)}")
            
    def test_driver_nao_entregue_flow(self):
        """Test 3: Driver 'Não Entregue' still works"""
        print("\n=== Test 3: Driver 'Não Entregue' flow ===")
        
        product = self.get_existing_product()
        if not product:
            self.log_result("Não Entregue - get product", False, "No products available")
            return
            
        # Create a delivery order with cash_delivery
        order_data = {
            "type": "delivery",
            "items": [{
                "productId": product['id'],
                "name": product['name'],
                "price": product['price'],
                "quantity": 1,
                "addOns": []
            }],
            "customer": {
                "name": "Pedro Costa",
                "phone": "11777776666",
                "email": "pedro@test.com"
            },
            "address": {
                "street": "Rua Augusta, 500",
                "neighborhood": "Consolação",
                "city": "São Paulo",
                "state": "SP",
                "zipCode": "01305-000"
            },
            "payment": {
                "method": "cash_delivery"
            }
        }
        
        try:
            # Create order
            response = requests.post(f"{API_BASE}/orders", json=order_data)
            if response.status_code != 201:
                self.log_result("Não Entregue - create order", False, f"Status: {response.status_code}")
                return
                
            order = response.json()
            order_id = order['id']
            self.created_orders.append(order_id)
            
            # Driver marks as 'Não Entregue'
            response = requests.patch(
                f"{API_BASE}/admin/orders/{order_id}",
                json={
                    "deliveryStatus": "Não Entregue",
                    "deliveryObservation": "Cliente não atendeu"
                },
                headers=self.get_admin_headers()
            )
            
            if response.status_code != 200:
                self.log_result("Não Entregue - mark as not delivered", False, f"Status: {response.status_code}")
                return
                
            # Get updated order
            response = requests.get(f"{API_BASE}/orders/{order_id}")
            if response.status_code != 200:
                self.log_result("Não Entregue - get updated order", False, f"Status: {response.status_code}")
                return
                
            updated_order = response.json()
            
            # Check if order status is 'Não Entregue'
            success = updated_order.get('status') == 'Não Entregue'
            self.log_result(
                "Driver marks 'Não Entregue' → order status correct",
                success,
                f"Order status: {updated_order.get('status')}"
            )
            
            # Test paymentConfirmed=false forces "Não Entregue"
            order_data['customer']['name'] = "Ana Silva"
            order_data['customer']['email'] = "ana@test.com"
            
            response = requests.post(f"{API_BASE}/orders", json=order_data)
            if response.status_code == 201:
                order2 = response.json()
                order2_id = order2['id']
                self.created_orders.append(order2_id)
                
                # Try to mark as delivered but with paymentConfirmed=false
                response = requests.patch(
                    f"{API_BASE}/admin/orders/{order2_id}",
                    json={
                        "deliveryStatus": "Entregue",
                        "paymentConfirmed": False
                    },
                    headers=self.get_admin_headers()
                )
                
                print(f"    PATCH response status: {response.status_code}")
                print(f"    PATCH response: {response.text}")
                
                if response.status_code == 200:
                    response = requests.get(f"{API_BASE}/orders/{order2_id}")
                    if response.status_code == 200:
                        order2_updated = response.json()
                        print(f"    Updated order payment method: {order2_updated.get('payment', {}).get('method')}")
                        print(f"    Updated order status: {order2_updated.get('status')}")
                        # Should be forced to "Não Entregue" due to paymentConfirmed=false
                        forced_success = order2_updated.get('status') == 'Não Entregue'
                        self.log_result(
                            "paymentConfirmed=false forces 'Não Entregue'",
                            forced_success,
                            f"Order status: {order2_updated.get('status')}"
                        )
                
        except Exception as e:
            self.log_result("Não Entregue flow", False, f"Exception: {str(e)}")
            
    def test_type_filter_on_history(self):
        """Test 4: Type filter on history"""
        print("\n=== Test 4: Type filter on history ===")
        
        try:
            # Test delivery orders in history
            response = requests.get(
                f"{API_BASE}/admin/orders?history=1&type=delivery",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                delivery_history = response.json()
                all_delivery = all(order.get('type') == 'delivery' for order in delivery_history)
                self.log_result(
                    "History filter type=delivery",
                    all_delivery,
                    f"Found {len(delivery_history)} delivery orders, all delivery: {all_delivery}"
                )
            else:
                self.log_result("History filter type=delivery", False, f"Status: {response.status_code}")
                
            # Test local orders in history
            response = requests.get(
                f"{API_BASE}/admin/orders?history=1&type=local",
                headers=self.get_admin_headers()
            )
            
            if response.status_code == 200:
                local_history = response.json()
                all_local = all(order.get('type') == 'local' for order in local_history)
                self.log_result(
                    "History filter type=local",
                    all_local,
                    f"Found {len(local_history)} local orders, all local: {all_local}"
                )
            else:
                self.log_result("History filter type=local", False, f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_result("Type filter on history", False, f"Exception: {str(e)}")
            
    def test_quick_regression(self):
        """Test 5: Quick regression"""
        print("\n=== Test 5: Quick regression ===")
        
        # Test health endpoint
        try:
            response = requests.get(f"{API_BASE}/health")
            success = response.status_code == 200
            self.log_result("GET /api/health", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/health", False, f"Exception: {str(e)}")
            
        # Test theme endpoint
        try:
            response = requests.get(f"{API_BASE}/theme")
            if response.status_code == 200:
                data = response.json()
                has_mode = 'mode' in data
                self.log_result("GET /api/theme", has_mode, f"Has mode field: {has_mode}")
            else:
                self.log_result("GET /api/theme", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/theme", False, f"Exception: {str(e)}")
            
        # Test payment methods
        try:
            response = requests.get(f"{API_BASE}/payment-methods")
            if response.status_code == 200:
                methods = response.json()
                has_three = len(methods) == 3
                self.log_result("GET /api/payment-methods", has_three, f"Found {len(methods)} methods")
            else:
                self.log_result("GET /api/payment-methods", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GET /api/payment-methods", False, f"Exception: {str(e)}")
            
        # Test admin login (already done but verify again)
        try:
            response = requests.post(f"{API_BASE}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            success = response.status_code == 200 and 'token' in response.json()
            self.log_result("POST /api/auth/login admin", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("POST /api/auth/login admin", False, f"Exception: {str(e)}")
            
    def cleanup_test_orders(self):
        """Clean up test orders"""
        print("\n=== Cleanup ===")
        for order_id in self.created_orders:
            try:
                response = requests.delete(
                    f"{API_BASE}/admin/orders/{order_id}",
                    headers=self.get_admin_headers()
                )
                if response.status_code == 200:
                    print(f"✅ Cleaned up order {order_id}")
                else:
                    print(f"⚠️ Failed to cleanup order {order_id}: {response.status_code}")
            except Exception as e:
                print(f"⚠️ Exception cleaning up order {order_id}: {str(e)}")
                
    def run_all_tests(self):
        """Run all regression tests"""
        print(f"🚀 Starting focused regression tests on {API_BASE}")
        print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Login first
        if not self.login_admin():
            print("❌ Cannot proceed without admin login")
            return
            
        # Run all test scenarios
        self.test_cash_delivery_with_change()
        self.test_driver_delivery_flow_finalizes_order()
        self.test_driver_nao_entregue_flow()
        self.test_type_filter_on_history()
        self.test_quick_regression()
        
        # Cleanup
        self.cleanup_test_orders()
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.test_results if r['success'])
        total = len(self.test_results)
        
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            
        print(f"\n🎯 Results: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All regression tests PASSED!")
        else:
            print("⚠️ Some tests FAILED - review details above")
            
        return passed == total

if __name__ == "__main__":
    runner = TestRunner()
    success = runner.run_all_tests()
    exit(0 if success else 1)
#!/usr/bin/env python3
"""
Backend regression test for comanda-related endpoints
Testing the specific scenarios requested in the review.
"""

import requests
import json
import time
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://dine-in-ordering.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@sabor.com"
ADMIN_PASSWORD = "admin123"
CUSTOMER_EMAIL = "joao_val@teste.com"
CUSTOMER_PASSWORD = "123456"

class TestRunner:
    def __init__(self):
        self.admin_token = None
        self.customer_token = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    headers: Dict = None, token: str = None) -> requests.Response:
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}{endpoint}"
        req_headers = {"Content-Type": "application/json"}
        
        if headers:
            req_headers.update(headers)
            
        if token:
            req_headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=req_headers, timeout=10)
            elif method.upper() == "POST":
                response = requests.post(url, json=data, headers=req_headers, timeout=10)
            elif method.upper() == "PATCH":
                response = requests.patch(url, json=data, headers=req_headers, timeout=10)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=req_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request failed: {e}")
            raise
            
    def login_admin(self) -> bool:
        """Login as admin and get token"""
        try:
            response = self.make_request("POST", "/auth/login", {
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("token")
                self.log_test("Admin login", True, f"Token obtained")
                return True
            else:
                self.log_test("Admin login", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Admin login", False, f"Error: {e}")
            return False
            
    def login_customer(self) -> bool:
        """Login as customer and get token"""
        try:
            response = self.make_request("POST", "/auth/login", {
                "email": CUSTOMER_EMAIL,
                "password": CUSTOMER_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.customer_token = data.get("token")
                self.log_test("Customer login", True, f"Token obtained")
                return True
            else:
                self.log_test("Customer login", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Customer login", False, f"Error: {e}")
            return False
            
    def test_get_comanda_public(self, comanda_id: str) -> bool:
        """Test GET /api/comandas/:id (public endpoint)"""
        try:
            response = self.make_request("GET", f"/comandas/{comanda_id}")
            
            if response.status_code == 200:
                data = response.json()
                has_orders = "orders" in data and isinstance(data["orders"], list)
                self.log_test("GET /api/comandas/:id (public)", True, 
                            f"Comanda returned with {len(data.get('orders', []))} orders")
                return True
            else:
                self.log_test("GET /api/comandas/:id (public)", False, 
                            f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("GET /api/comandas/:id (public)", False, f"Error: {e}")
            return False
            
    def test_request_payment(self, comanda_id: str, method: str = "Pix") -> bool:
        """Test POST /api/comandas/:id/request-payment"""
        try:
            response = self.make_request("POST", f"/comandas/{comanda_id}/request-payment", {
                "method": method
            })
            
            if response.status_code == 200:
                data = response.json()
                status_ok = data.get("status") == "aguardando_pagamento"
                method_ok = data.get("paymentMethod") == method
                
                success = status_ok and method_ok
                details = f"Status: {data.get('status')}, PaymentMethod: {data.get('paymentMethod')}"
                self.log_test("POST /api/comandas/:id/request-payment", success, details)
                return success
            else:
                self.log_test("POST /api/comandas/:id/request-payment", False, 
                            f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("POST /api/comandas/:id/request-payment", False, f"Error: {e}")
            return False
            
    def test_me_comandas_no_auth(self) -> bool:
        """Test GET /api/me/comandas without auth (should return 401)"""
        try:
            response = self.make_request("GET", "/me/comandas")
            
            if response.status_code == 401:
                self.log_test("GET /api/me/comandas (no auth)", True, "Correctly returned 401")
                return True
            else:
                self.log_test("GET /api/me/comandas (no auth)", False, 
                            f"Expected 401, got {response.status_code}")
                return False
        except Exception as e:
            self.log_test("GET /api/me/comandas (no auth)", False, f"Error: {e}")
            return False
            
    def test_me_comandas_with_auth(self) -> tuple[bool, list]:
        """Test GET /api/me/comandas with customer auth"""
        try:
            response = self.make_request("GET", "/me/comandas", token=self.customer_token)
            
            if response.status_code == 200:
                data = response.json()
                comandas = data if isinstance(data, list) else []
                self.log_test("GET /api/me/comandas (with auth)", True, 
                            f"Returned {len(comandas)} comandas")
                return True, comandas
            else:
                self.log_test("GET /api/me/comandas (with auth)", False, 
                            f"Status: {response.status_code}")
                return False, []
        except Exception as e:
            self.log_test("GET /api/me/comandas (with auth)", False, f"Error: {e}")
            return False, []
            
    def create_local_order(self, table: str, product_id: str = "p-burger-classic", 
                          quantity: int = 1) -> Optional[str]:
        """Create a local order and return the order ID"""
        try:
            response = self.make_request("POST", "/orders", {
                "type": "local",
                "table": table,
                "items": [{"productId": product_id, "quantity": quantity}]
            }, token=self.customer_token)
            
            if response.status_code in [200, 201]:
                data = response.json()
                order_id = data.get("id")
                comanda_id = data.get("comandaId")
                self.log_test("Create local order", True, 
                            f"Order {order_id} created, comanda: {comanda_id}")
                return order_id, comanda_id
            else:
                self.log_test("Create local order", False, 
                            f"Status: {response.status_code}, Response: {response.text}")
                return None, None
        except Exception as e:
            self.log_test("Create local order", False, f"Error: {e}")
            return None, None
            
    def test_comanda_order_fusion(self) -> bool:
        """Test that multiple orders from same user/table use same comanda"""
        try:
            # Create first order
            order1_id, comanda1_id = self.create_local_order("99", "p-burger-classic", 1)
            if not order1_id:
                return False
                
            time.sleep(1)  # Small delay
            
            # Create second order with same table and user
            order2_id, comanda2_id = self.create_local_order("99", "p-pizza-margherita", 1)
            if not order2_id:
                return False
                
            # Check if they use the same comanda
            same_comanda = comanda1_id == comanda2_id
            self.log_test("Comanda order fusion", same_comanda, 
                        f"Order1 comanda: {comanda1_id}, Order2 comanda: {comanda2_id}")
            
            if same_comanda:
                # Verify the comanda has both orders
                response = self.make_request("GET", f"/comandas/{comanda1_id}")
                if response.status_code == 200:
                    data = response.json()
                    orders = data.get("orders", [])
                    has_both = len(orders) >= 2
                    self.log_test("Comanda has multiple orders", has_both, 
                                f"Found {len(orders)} orders in comanda")
                    return has_both
                    
            return same_comanda
            
        except Exception as e:
            self.log_test("Comanda order fusion", False, f"Error: {e}")
            return False
            
    def test_admin_comanda_patch(self, comanda_id: str) -> bool:
        """Test admin PATCH /api/admin/comandas/:id to mark as paid"""
        try:
            response = self.make_request("PATCH", f"/admin/comandas/{comanda_id}", {
                "action": "pay",
                "method": "Pix"
            }, token=self.admin_token)
            
            if response.status_code == 200:
                data = response.json()
                status_ok = data.get("status") == "paga"
                self.log_test("Admin PATCH comanda to paid", status_ok, 
                            f"Status: {data.get('status')}")
                return status_ok
            else:
                # Get error details
                try:
                    error_data = response.json()
                    error_msg = error_data.get("error", "Unknown error")
                except:
                    error_msg = response.text
                self.log_test("Admin PATCH comanda to paid", False, 
                            f"Status: {response.status_code}, Error: {error_msg}")
                return False
        except Exception as e:
            self.log_test("Admin PATCH comanda to paid", False, f"Error: {e}")
            return False
            
    def run_complete_flow_test(self) -> bool:
        """Run the complete flow test as specified"""
        print("\n=== COMPLETE FLOW TEST ===")
        
        # 1. Create local order as logged customer
        order_id, comanda_id = self.create_local_order("88", "p-burger-classic", 2)
        if not order_id or not comanda_id:
            return False
            
        # 2. Get comandas via /api/me/comandas
        success, comandas = self.test_me_comandas_with_auth()
        if not success:
            return False
            
        # 3. Verify the comanda appears with nested orders
        found_comanda = None
        for comanda in comandas:
            if comanda.get("id") == comanda_id:
                found_comanda = comanda
                break
                
        if found_comanda:
            has_orders = "orders" in found_comanda and len(found_comanda["orders"]) > 0
            self.log_test("Complete flow - comanda with orders", has_orders,
                        f"Found comanda with {len(found_comanda.get('orders', []))} orders")
            return has_orders
        else:
            self.log_test("Complete flow - comanda with orders", False,
                        "Comanda not found in /api/me/comandas response")
            return False
            
    def run_closure_flow_test(self, comanda_id: str) -> bool:
        """Run the closure flow test"""
        print("\n=== CLOSURE FLOW TEST ===")
        
        # 1. Request payment with PIX
        payment_success = self.test_request_payment(comanda_id, "Pix")
        if not payment_success:
            return False
            
        # 2. Admin marks as paid
        admin_success = self.test_admin_comanda_patch(comanda_id)
        return admin_success
        
    def run_all_tests(self):
        """Run all comanda regression tests"""
        print("=== COMANDA REGRESSION TESTS ===\n")
        
        # Login first
        if not self.login_admin():
            print("Failed to login as admin, aborting tests")
            return
            
        if not self.login_customer():
            print("Failed to login as customer, aborting tests")
            return
            
        print("\n=== BASIC ENDPOINT TESTS ===")
        
        # Test /api/me/comandas without auth
        self.test_me_comandas_no_auth()
        
        # Test /api/me/comandas with auth
        success, comandas = self.test_me_comandas_with_auth()
        
        # Test comanda order fusion
        self.test_comanda_order_fusion()
        
        # Run complete flow test
        self.run_complete_flow_test()
        
        # If we have comandas, test other endpoints
        if comandas:
            test_comanda_id = comandas[0].get("id")
            if test_comanda_id:
                # Test public comanda endpoint
                self.test_get_comanda_public(test_comanda_id)
                
                # Test closure flow
                self.run_closure_flow_test(test_comanda_id)
        
        # Print summary
        self.print_summary()
        
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        
        print(f"Total tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success rate: {(passed/total)*100:.1f}%")
        
        # Show failed tests
        failed_tests = [r for r in self.test_results if not r["success"]]
        if failed_tests:
            print("\nFAILED TESTS:")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        
        print("\n" + "="*50)

if __name__ == "__main__":
    runner = TestRunner()
    runner.run_all_tests()
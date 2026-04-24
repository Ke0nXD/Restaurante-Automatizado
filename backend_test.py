#!/usr/bin/env python3
"""
Comprehensive backend testing for Sabor & Arte restaurant app
Testing new features and regression tests as requested
"""

import requests
import json
import base64
import time
import os

# Configuration
BASE_URL = "https://dine-in-ordering.preview.emergentagent.com"
API_URL = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@sabor.com"
ADMIN_PASSWORD = "admin123"

# Test data
TEST_EMAIL = "novo_test@teste.com"
TEST_PHONE = "(11) 99999-8888"
TEST_PASSWORD = "test123"
TEST_NAME = "Test User"

# Simple 1x1 pixel PNG in base64
TEST_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

class BackendTester:
    def __init__(self):
        self.admin_token = None
        self.test_user_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"    {details}")
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        
    def get_admin_token(self):
        """Get admin authentication token"""
        try:
            response = requests.post(f"{API_URL}/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                self.admin_token = response.json()["token"]
                self.log_test("Admin login", True, f"Token obtained")
                return True
            else:
                self.log_test("Admin login", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_test("Admin login", False, f"Exception: {str(e)}")
            return False
            
    def test_email_validation(self):
        """Test 1: Email validation in register and login"""
        print("\n=== Testing Email Validation ===")
        
        # Test invalid emails in register
        invalid_emails = ["joao", "joao@", "@gmail.com"]
        for email in invalid_emails:
            try:
                response = requests.post(f"{API_URL}/auth/register", json={
                    "email": email,
                    "password": TEST_PASSWORD,
                    "name": TEST_NAME,
                    "phone": TEST_PHONE
                })
                if response.status_code == 400 and "email válido" in response.json().get("error", "").lower():
                    self.log_test(f"Register with invalid email '{email}'", True, "Correctly rejected")
                else:
                    self.log_test(f"Register with invalid email '{email}'", False, f"Status: {response.status_code}, Response: {response.text}")
            except Exception as e:
                self.log_test(f"Register with invalid email '{email}'", False, f"Exception: {str(e)}")
        
        # Test valid email in register
        try:
            response = requests.post(f"{API_URL}/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": TEST_NAME,
                "phone": TEST_PHONE
            })
            if response.status_code == 201:
                data = response.json()
                if "token" in data and "user" in data:
                    self.test_user_token = data["token"]
                    self.log_test("Register with valid email", True, f"User created with token")
                else:
                    self.log_test("Register with valid email", False, "Missing token or user in response")
            else:
                self.log_test("Register with valid email", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Register with valid email", False, f"Exception: {str(e)}")
        
        # Test invalid email in login
        try:
            response = requests.post(f"{API_URL}/auth/login", json={
                "email": "inválido",
                "password": "anypassword"
            })
            if response.status_code == 400 and "email válido" in response.json().get("error", "").lower():
                self.log_test("Login with invalid email", True, "Correctly rejected")
            else:
                self.log_test("Login with invalid email", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Login with invalid email", False, f"Exception: {str(e)}")
        
        # Test valid email login
        try:
            response = requests.post(f"{API_URL}/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                data = response.json()
                if "token" in data:
                    self.log_test("Login with valid email", True, "Login successful")
                else:
                    self.log_test("Login with valid email", False, "Missing token in response")
            else:
                self.log_test("Login with valid email", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Login with valid email", False, f"Exception: {str(e)}")
    
    def test_phone_validation(self):
        """Test 2: Phone validation in registration"""
        print("\n=== Testing Phone Validation ===")
        
        # Test register without phone
        try:
            response = requests.post(f"{API_URL}/auth/register", json={
                "email": "test_no_phone@test.com",
                "password": TEST_PASSWORD,
                "name": TEST_NAME
            })
            if response.status_code == 400:
                self.log_test("Register without phone", True, "Correctly rejected")
            else:
                self.log_test("Register without phone", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Register without phone", False, f"Exception: {str(e)}")
        
        # Test register with short phone
        try:
            response = requests.post(f"{API_URL}/auth/register", json={
                "email": "test_short_phone@test.com",
                "password": TEST_PASSWORD,
                "name": TEST_NAME,
                "phone": "12345"
            })
            if response.status_code == 400:
                self.log_test("Register with short phone", True, "Correctly rejected")
            else:
                self.log_test("Register with short phone", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Register with short phone", False, f"Exception: {str(e)}")
        
        # Test register with formatted phone
        try:
            response = requests.post(f"{API_URL}/auth/register", json={
                "email": "test_formatted_phone@test.com",
                "password": TEST_PASSWORD,
                "name": TEST_NAME,
                "phone": "(11) 99999-8888"
            })
            if response.status_code == 201:
                data = response.json()
                user = data.get("user", {})
                if user.get("phone") == "11999998888":  # Should be normalized
                    self.log_test("Register with formatted phone", True, f"Phone normalized to: {user.get('phone')}")
                else:
                    self.log_test("Register with formatted phone", False, f"Phone not normalized correctly: {user.get('phone')}")
            else:
                self.log_test("Register with formatted phone", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Register with formatted phone", False, f"Exception: {str(e)}")
    
    def test_footer_settings(self):
        """Test 3: Footer settings endpoints"""
        print("\n=== Testing Footer Settings ===")
        
        # Test public GET /api/footer
        try:
            response = requests.get(f"{API_URL}/footer")
            if response.status_code == 200:
                data = response.json()
                required_fields = ["address", "phone", "whatsapp", "openingHours", "instagramUrl", "deliveryNotice", "copyrightText"]
                has_all_fields = all(field in data for field in required_fields)
                if has_all_fields:
                    self.log_test("GET /api/footer (public)", True, "All required fields present")
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("GET /api/footer (public)", False, f"Missing fields: {missing}")
            else:
                self.log_test("GET /api/footer (public)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/footer (public)", False, f"Exception: {str(e)}")
        
        if not self.admin_token:
            self.log_test("Footer admin tests", False, "No admin token available")
            return
        
        # Test admin GET /api/admin/footer
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{API_URL}/admin/footer", headers=headers)
            if response.status_code == 200:
                self.log_test("GET /api/admin/footer (admin)", True, "Admin access successful")
            else:
                self.log_test("GET /api/admin/footer (admin)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/admin/footer (admin)", False, f"Exception: {str(e)}")
        
        # Test PATCH /api/admin/footer
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            update_data = {
                "address": "Nova Rua 999",
                "phone": "(11) 4000-0000"
            }
            response = requests.patch(f"{API_URL}/admin/footer", headers=headers, json=update_data)
            if response.status_code == 200:
                data = response.json()
                if data.get("address") == "Nova Rua 999" and data.get("phone") == "(11) 4000-0000":
                    self.log_test("PATCH /api/admin/footer (admin)", True, "Footer updated successfully")
                else:
                    self.log_test("PATCH /api/admin/footer (admin)", False, "Data not updated correctly")
            else:
                self.log_test("PATCH /api/admin/footer (admin)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("PATCH /api/admin/footer (admin)", False, f"Exception: {str(e)}")
        
        # Test without auth
        try:
            response = requests.patch(f"{API_URL}/admin/footer", json={"address": "test"})
            if response.status_code == 401:
                self.log_test("PATCH /api/admin/footer (no auth)", True, "Correctly rejected")
            else:
                self.log_test("PATCH /api/admin/footer (no auth)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("PATCH /api/admin/footer (no auth)", False, f"Exception: {str(e)}")
    
    def test_upload_endpoint(self):
        """Test 4: Upload endpoint"""
        print("\n=== Testing Upload Endpoint ===")
        
        # Test without auth
        try:
            response = requests.post(f"{API_URL}/upload", json={
                "dataUrl": f"data:image/png;base64,{TEST_IMAGE_BASE64}"
            })
            if response.status_code == 401:
                self.log_test("POST /api/upload (no auth)", True, "Correctly rejected")
            else:
                self.log_test("POST /api/upload (no auth)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/upload (no auth)", False, f"Exception: {str(e)}")
        
        if not self.admin_token:
            self.log_test("Upload admin tests", False, "No admin token available")
            return
        
        # Test with valid dataUrl
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{API_URL}/upload", headers=headers, json={
                "dataUrl": f"data:image/png;base64,{TEST_IMAGE_BASE64}"
            })
            if response.status_code == 201:
                data = response.json()
                if "url" in data and data["url"].startswith("/uploads/"):
                    upload_url = data["url"]
                    self.log_test("POST /api/upload (valid dataUrl)", True, f"File uploaded: {upload_url}")
                    
                    # Test if file is accessible
                    try:
                        file_response = requests.get(f"{BASE_URL}{upload_url}")
                        if file_response.status_code == 200:
                            self.log_test("GET uploaded file", True, "File accessible")
                        else:
                            self.log_test("GET uploaded file", False, f"Status: {file_response.status_code}")
                    except Exception as e:
                        self.log_test("GET uploaded file", False, f"Exception: {str(e)}")
                else:
                    self.log_test("POST /api/upload (valid dataUrl)", False, "Missing or invalid URL in response")
            else:
                self.log_test("POST /api/upload (valid dataUrl)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/upload (valid dataUrl)", False, f"Exception: {str(e)}")
        
        # Test with invalid dataUrl
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.post(f"{API_URL}/upload", headers=headers, json={
                "dataUrl": "invalid_data_url"
            })
            if response.status_code == 400:
                self.log_test("POST /api/upload (invalid dataUrl)", True, "Correctly rejected")
            else:
                self.log_test("POST /api/upload (invalid dataUrl)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/upload (invalid dataUrl)", False, f"Exception: {str(e)}")
    
    def test_me_comandas(self):
        """Test 5: /api/me/comandas endpoint"""
        print("\n=== Testing /api/me/comandas ===")
        
        # Test without auth
        try:
            response = requests.get(f"{API_URL}/me/comandas")
            if response.status_code == 401:
                self.log_test("GET /api/me/comandas (no auth)", True, "Correctly rejected")
            else:
                self.log_test("GET /api/me/comandas (no auth)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/me/comandas (no auth)", False, f"Exception: {str(e)}")
        
        # Test with user auth
        if self.test_user_token:
            try:
                headers = {"Authorization": f"Bearer {self.test_user_token}"}
                response = requests.get(f"{API_URL}/me/comandas", headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    if isinstance(data, list):
                        self.log_test("GET /api/me/comandas (user auth)", True, f"Returned {len(data)} comandas")
                    else:
                        self.log_test("GET /api/me/comandas (user auth)", False, "Response is not a list")
                else:
                    self.log_test("GET /api/me/comandas (user auth)", False, f"Status: {response.status_code}")
            except Exception as e:
                self.log_test("GET /api/me/comandas (user auth)", False, f"Exception: {str(e)}")
        else:
            self.log_test("GET /api/me/comandas (user auth)", False, "No user token available")
    
    def test_admin_user_creation_with_phone(self):
        """Test 6: Admin user creation with phone field"""
        print("\n=== Testing Admin User Creation with Phone ===")
        
        if not self.admin_token:
            self.log_test("Admin user creation tests", False, "No admin token available")
            return
        
        # Test creating user with phone
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            user_data = {
                "email": "test_attendant@test.com",
                "password": "attendant123",
                "name": "Test Attendant",
                "role": "attendant",
                "phone": "(11) 98765-4321"
            }
            response = requests.post(f"{API_URL}/admin/users", headers=headers, json=user_data)
            if response.status_code == 201:
                data = response.json()
                if data.get("phone") == "11987654321":  # Should be normalized
                    self.log_test("POST /api/admin/users (with phone)", True, f"User created with normalized phone: {data.get('phone')}")
                    
                    # Test login with the new user
                    try:
                        login_response = requests.post(f"{API_URL}/auth/login", json={
                            "email": "test_attendant@test.com",
                            "password": "attendant123"
                        })
                        if login_response.status_code == 200:
                            self.log_test("Login with new admin user", True, "Login successful")
                        else:
                            self.log_test("Login with new admin user", False, f"Status: {login_response.status_code}")
                    except Exception as e:
                        self.log_test("Login with new admin user", False, f"Exception: {str(e)}")
                else:
                    self.log_test("POST /api/admin/users (with phone)", False, f"Phone not normalized correctly: {data.get('phone')}")
            else:
                self.log_test("POST /api/admin/users (with phone)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("POST /api/admin/users (with phone)", False, f"Exception: {str(e)}")
    
    def test_regression_bugs(self):
        """Test 7: Regression tests for previous bugs"""
        print("\n=== Testing Regression (Previous Bugs) ===")
        
        if not self.admin_token:
            self.log_test("Regression tests", False, "No admin token available")
            return
        
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test DELETE /api/admin/orders/:id
        # First create an order to delete
        try:
            order_data = {
                "type": "local",
                "table": "99",
                "items": [{"productId": "p-burger-classic", "quantity": 1}],
                "customer": {"name": "Test Customer"}
            }
            create_response = requests.post(f"{API_URL}/orders", json=order_data)
            if create_response.status_code == 201:
                order_id = create_response.json()["id"]
                
                # Now delete it
                delete_response = requests.delete(f"{API_URL}/admin/orders/{order_id}", headers=headers)
                if delete_response.status_code == 200 and delete_response.json().get("ok") == True:
                    self.log_test("DELETE /api/admin/orders/:id", True, "Order deleted successfully")
                else:
                    self.log_test("DELETE /api/admin/orders/:id", False, f"Status: {delete_response.status_code}")
            else:
                self.log_test("DELETE /api/admin/orders/:id", False, "Could not create test order")
        except Exception as e:
            self.log_test("DELETE /api/admin/orders/:id", False, f"Exception: {str(e)}")
        
        # Test DELETE /api/admin/users/:id
        # First create a user to delete
        try:
            user_data = {
                "email": "delete_test@test.com",
                "password": "test123",
                "name": "Delete Test",
                "role": "attendant"
            }
            create_response = requests.post(f"{API_URL}/admin/users", headers=headers, json=user_data)
            if create_response.status_code == 201:
                user_id = create_response.json()["id"]
                
                # Now delete it
                delete_response = requests.delete(f"{API_URL}/admin/users/{user_id}", headers=headers)
                if delete_response.status_code == 200 and delete_response.json().get("ok") == True:
                    self.log_test("DELETE /api/admin/users/:id", True, "User deleted successfully")
                else:
                    self.log_test("DELETE /api/admin/users/:id", False, f"Status: {delete_response.status_code}")
            else:
                self.log_test("DELETE /api/admin/users/:id", False, "Could not create test user")
        except Exception as e:
            self.log_test("DELETE /api/admin/users/:id", False, f"Exception: {str(e)}")
        
        # Test PIX order creation
        try:
            order_data = {
                "type": "delivery",
                "address": {"street": "Test Street 123", "city": "São Paulo"},
                "items": [{"productId": "p-burger-classic", "quantity": 1}],
                "customer": {"name": "PIX Test Customer"},
                "payment": {"method": "pix"}
            }
            response = requests.post(f"{API_URL}/orders", json=order_data)
            if response.status_code == 201:
                data = response.json()
                pix = data.get("pix", {})
                if all(key in pix for key in ["brCode", "qrDataUrl", "txid", "expiresAt"]):
                    self.log_test("POST /api/orders (PIX)", True, "PIX order created with all required fields")
                    
                    # Test PIX confirmation
                    order_id = data["id"]
                    confirm_response = requests.post(f"{API_URL}/orders/{order_id}/pix-confirm", headers=headers)
                    if confirm_response.status_code == 200:
                        self.log_test("POST /api/orders/:id/pix-confirm", True, "PIX confirmed successfully")
                    else:
                        self.log_test("POST /api/orders/:id/pix-confirm", False, f"Status: {confirm_response.status_code}")
                    
                    # Test PIX status
                    status_response = requests.get(f"{API_URL}/orders/{order_id}/pix-status")
                    if status_response.status_code == 200:
                        status_data = status_response.json()
                        if "status" in status_data and "paymentStatus" in status_data and "orderStatus" in status_data:
                            self.log_test("GET /api/orders/:id/pix-status", True, "PIX status returned correctly")
                        else:
                            self.log_test("GET /api/orders/:id/pix-status", False, "Missing required status fields")
                    else:
                        self.log_test("GET /api/orders/:id/pix-status", False, f"Status: {status_response.status_code}")
                else:
                    missing = [k for k in ["brCode", "qrDataUrl", "txid", "expiresAt"] if k not in pix]
                    self.log_test("POST /api/orders (PIX)", False, f"Missing PIX fields: {missing}")
            else:
                self.log_test("POST /api/orders (PIX)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/orders (PIX)", False, f"Exception: {str(e)}")
        
        # Test card_delivery order
        try:
            order_data = {
                "type": "delivery",
                "address": {"street": "Test Street 123", "city": "São Paulo"},
                "items": [{"productId": "p-burger-classic", "quantity": 1}],
                "customer": {"name": "Card Test Customer"},
                "payment": {"method": "card_delivery"}
            }
            response = requests.post(f"{API_URL}/orders", json=order_data)
            if response.status_code == 201:
                data = response.json()
                payment = data.get("payment", {})
                if payment.get("status") == "pendente_entrega" and "pix" not in data:
                    self.log_test("POST /api/orders (card_delivery)", True, "Card delivery order created correctly")
                else:
                    self.log_test("POST /api/orders (card_delivery)", False, f"Incorrect payment status or PIX present: {payment}")
            else:
                self.log_test("POST /api/orders (card_delivery)", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("POST /api/orders (card_delivery)", False, f"Exception: {str(e)}")
        
        # Test theme endpoint
        try:
            response = requests.get(f"{API_URL}/theme")
            if response.status_code == 200:
                data = response.json()
                if all(key in data for key in ["mode", "brand", "dark", "light"]):
                    self.log_test("GET /api/theme", True, "Theme data returned correctly")
                else:
                    missing = [k for k in ["mode", "brand", "dark", "light"] if k not in data]
                    self.log_test("GET /api/theme", False, f"Missing theme fields: {missing}")
            else:
                self.log_test("GET /api/theme", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/theme", False, f"Exception: {str(e)}")
        
        # Test payment methods
        try:
            response = requests.get(f"{API_URL}/payment-methods")
            if response.status_code == 200:
                data = response.json()
                if len(data) == 3:
                    method_ids = [m.get("id") for m in data]
                    expected = ["pix", "card_delivery", "cash_delivery"]
                    if all(mid in method_ids for mid in expected):
                        self.log_test("GET /api/payment-methods", True, "All 3 payment methods present")
                    else:
                        self.log_test("GET /api/payment-methods", False, f"Incorrect method IDs: {method_ids}")
                else:
                    self.log_test("GET /api/payment-methods", False, f"Expected 3 methods, got {len(data)}")
            else:
                self.log_test("GET /api/payment-methods", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/payment-methods", False, f"Exception: {str(e)}")
        
        # Test admin PIX config
        try:
            response = requests.get(f"{API_URL}/admin/pix-config", headers=headers)
            if response.status_code == 200:
                data = response.json()
                if "provider" in data and "pixKey" in data:
                    self.log_test("GET /api/admin/pix-config", True, "PIX config returned")
                else:
                    self.log_test("GET /api/admin/pix-config", False, "Missing PIX config fields")
            else:
                self.log_test("GET /api/admin/pix-config", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/admin/pix-config", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests"""
        print("🧪 Starting comprehensive backend testing for Sabor & Arte")
        print(f"🌐 Base URL: {BASE_URL}")
        
        # Get admin token first
        if not self.get_admin_token():
            print("❌ Cannot proceed without admin token")
            return
        
        # Run all test suites
        self.test_email_validation()
        self.test_phone_validation()
        self.test_footer_settings()
        self.test_upload_endpoint()
        self.test_me_comandas()
        self.test_admin_user_creation_with_phone()
        self.test_regression_bugs()
        
        # Summary
        print("\n" + "="*60)
        print("📊 TEST SUMMARY")
        print("="*60)
        
        passed = sum(1 for r in self.test_results if r["success"])
        total = len(self.test_results)
        percentage = (passed / total * 100) if total > 0 else 0
        
        print(f"✅ Passed: {passed}/{total} ({percentage:.1f}%)")
        
        if passed < total:
            print(f"❌ Failed: {total - passed}")
            print("\nFailed tests:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
        
        print("\n🎯 All new features and regression tests completed!")

if __name__ == "__main__":
    tester = BackendTester()
    tester.run_all_tests()
#!/usr/bin/env python3
"""
Backend API Testing for Theme and PIX endpoints
Tests all new endpoints implemented in the monolithic backend
"""

import requests
import json
import time
import os
from typing import Dict, Any, Optional

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://dine-in-ordering.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@sabor.com"
ADMIN_PASSWORD = "admin123"

class APITester:
    def __init__(self):
        self.admin_token = None
        self.customer_token = None
        self.test_results = []
        
    def log_result(self, test_name: str, success: bool, details: str = ""):
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
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return (success, response, status_code)"""
        url = f"{API_BASE}{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
            
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=default_headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=10)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, json=data, headers=default_headers, timeout=10)
            elif method.upper() == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=10)
            else:
                return False, None, 0
                
            success = response.status_code == expected_status
            try:
                json_response = response.json()
            except:
                json_response = response.text
                
            return success, json_response, response.status_code
            
        except Exception as e:
            return False, str(e), 0
    
    def authenticate_admin(self) -> bool:
        """Authenticate as admin and get token"""
        success, response, status = self.make_request(
            'POST', '/auth/login',
            {'email': ADMIN_EMAIL, 'password': ADMIN_PASSWORD}
        )
        
        if success and isinstance(response, dict) and 'token' in response:
            self.admin_token = response['token']
            self.log_result("Admin Authentication", True, f"Token obtained")
            return True
        else:
            self.log_result("Admin Authentication", False, f"Status: {status}, Response: {response}")
            return False
    
    def create_test_customer(self) -> bool:
        """Create a test customer for authorization tests"""
        test_email = "testcustomer@test.com"
        success, response, status = self.make_request(
            'POST', '/auth/register',
            {'email': test_email, 'password': 'test123', 'name': 'Test Customer'},
            expected_status=201
        )
        
        if success and isinstance(response, dict) and 'token' in response:
            self.customer_token = response['token']
            self.log_result("Customer Registration", True, f"Customer token obtained")
            return True
        else:
            # Try to login if already exists
            success, response, status = self.make_request(
                'POST', '/auth/login',
                {'email': test_email, 'password': 'test123'}
            )
            if success and isinstance(response, dict) and 'token' in response:
                self.customer_token = response['token']
                self.log_result("Customer Login", True, f"Customer token obtained")
                return True
            else:
                self.log_result("Customer Authentication", False, f"Status: {status}")
                return False

    def test_theme_endpoints(self):
        """Test all theme-related endpoints"""
        print("\n=== TESTING THEME ENDPOINTS ===")
        
        # 1. GET /api/theme (public)
        success, response, status = self.make_request('GET', '/theme')
        if success and isinstance(response, dict) and 'mode' in response:
            self.log_result("GET /api/theme (public)", True, f"Mode: {response.get('mode')}")
        else:
            self.log_result("GET /api/theme (public)", False, f"Status: {status}, Response: {response}")
        
        # 2. GET /api/admin/theme (with Bearer admin)
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            success, response, status = self.make_request('GET', '/admin/theme', headers=headers)
            if success and isinstance(response, dict) and 'mode' in response:
                self.log_result("GET /api/admin/theme (admin)", True, f"Mode: {response.get('mode')}")
            else:
                self.log_result("GET /api/admin/theme (admin)", False, f"Status: {status}, Response: {response}")
        
        # 3. PATCH /api/admin/theme - change to light mode
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            success, response, status = self.make_request(
                'PATCH', '/admin/theme', 
                {'mode': 'light'}, 
                headers=headers
            )
            if success and isinstance(response, dict) and response.get('mode') == 'light':
                self.log_result("PATCH /api/admin/theme (mode: light)", True, "Mode changed to light")
            else:
                self.log_result("PATCH /api/admin/theme (mode: light)", False, f"Status: {status}, Response: {response}")
        
        # 4. PATCH /api/admin/theme - change back to dark mode
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            success, response, status = self.make_request(
                'PATCH', '/admin/theme', 
                {'mode': 'dark'}, 
                headers=headers
            )
            if success and isinstance(response, dict) and response.get('mode') == 'dark':
                self.log_result("PATCH /api/admin/theme (mode: dark)", True, "Mode changed back to dark")
            else:
                self.log_result("PATCH /api/admin/theme (mode: dark)", False, f"Status: {status}, Response: {response}")
        
        # 5. PATCH /api/admin/theme - test invalid mode (should still be accepted)
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            success, response, status = self.make_request(
                'PATCH', '/admin/theme', 
                {'mode': 'invalid_mode'}, 
                headers=headers
            )
            if success and isinstance(response, dict):
                self.log_result("PATCH /api/admin/theme (invalid mode)", True, "Invalid mode accepted as expected")
            else:
                self.log_result("PATCH /api/admin/theme (invalid mode)", False, f"Status: {status}, Response: {response}")
        
        # 6. PATCH /api/admin/theme without auth - should return 401
        success, response, status = self.make_request(
            'PATCH', '/admin/theme', 
            {'mode': 'light'}, 
            expected_status=401
        )
        if success:
            self.log_result("PATCH /api/admin/theme (no auth)", True, "401 returned as expected")
        else:
            self.log_result("PATCH /api/admin/theme (no auth)", False, f"Expected 401, got {status}")

    def test_payment_methods_endpoints(self):
        """Test payment methods endpoints"""
        print("\n=== TESTING PAYMENT METHODS ENDPOINTS ===")
        
        # 1. GET /api/payment-methods (public)
        success, response, status = self.make_request('GET', '/payment-methods')
        if success and isinstance(response, list) and len(response) == 3:
            method_ids = [m.get('id') for m in response]
            expected_ids = ['pix', 'card_delivery', 'cash_delivery']
            if all(mid in method_ids for mid in expected_ids):
                self.log_result("GET /api/payment-methods (public)", True, f"Found 3 methods: {method_ids}")
            else:
                self.log_result("GET /api/payment-methods (public)", False, f"Expected {expected_ids}, got {method_ids}")
        else:
            self.log_result("GET /api/payment-methods (public)", False, f"Status: {status}, Response: {response}")
        
        # 2. GET /api/admin/payment-methods (with Bearer)
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            success, response, status = self.make_request('GET', '/admin/payment-methods', headers=headers)
            if success and isinstance(response, list) and len(response) >= 3:
                self.log_result("GET /api/admin/payment-methods (admin)", True, f"Found {len(response)} methods")
            else:
                self.log_result("GET /api/admin/payment-methods (admin)", False, f"Status: {status}, Response: {response}")

    def test_pix_config_endpoints(self):
        """Test PIX configuration endpoints"""
        print("\n=== TESTING PIX CONFIG ENDPOINTS ===")
        
        # 1. GET /api/admin/pix-config (with Bearer admin)
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            success, response, status = self.make_request('GET', '/admin/pix-config', headers=headers)
            if success and isinstance(response, dict):
                required_fields = ['provider', 'environment', 'pixKey', 'expirationMinutes', 'merchantName', 'merchantCity']
                has_all_fields = all(field in response for field in required_fields)
                if has_all_fields:
                    self.log_result("GET /api/admin/pix-config (admin)", True, f"Provider: {response.get('provider')}")
                else:
                    missing = [f for f in required_fields if f not in response]
                    self.log_result("GET /api/admin/pix-config (admin)", False, f"Missing fields: {missing}")
            else:
                self.log_result("GET /api/admin/pix-config (admin)", False, f"Status: {status}, Response: {response}")
        
        # 2. PATCH /api/admin/pix-config (with Bearer admin)
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            update_data = {
                "pixKey": "pix@teste.com",
                "expirationMinutes": 20,
                "provider": "mercadopago"
            }
            success, response, status = self.make_request(
                'PATCH', '/admin/pix-config', 
                update_data, 
                headers=headers
            )
            if success and isinstance(response, dict):
                updated_correctly = (
                    response.get('pixKey') == 'pix@teste.com' and
                    response.get('expirationMinutes') == 20 and
                    response.get('provider') == 'mercadopago'
                )
                if updated_correctly:
                    self.log_result("PATCH /api/admin/pix-config (admin)", True, "PIX config updated successfully")
                else:
                    self.log_result("PATCH /api/admin/pix-config (admin)", False, f"Update failed: {response}")
            else:
                self.log_result("PATCH /api/admin/pix-config (admin)", False, f"Status: {status}, Response: {response}")
        
        # 3. GET /api/admin/pix-config without auth - should return 401
        success, response, status = self.make_request('GET', '/admin/pix-config', expected_status=401)
        if success:
            self.log_result("GET /api/admin/pix-config (no auth)", True, "401 returned as expected")
        else:
            self.log_result("GET /api/admin/pix-config (no auth)", False, f"Expected 401, got {status}")
        
        # 4. GET /api/pix-info (public)
        success, response, status = self.make_request('GET', '/pix-info')
        if success and isinstance(response, dict):
            public_fields = ['provider', 'environment', 'expirationMinutes', 'merchantName']
            has_public_fields = all(field in response for field in public_fields)
            has_no_secrets = 'apiKey' not in response and 'clientSecret' not in response
            if has_public_fields and has_no_secrets:
                self.log_result("GET /api/pix-info (public)", True, "Public PIX info returned without secrets")
            else:
                self.log_result("GET /api/pix-info (public)", False, f"Response: {response}")
        else:
            self.log_result("GET /api/pix-info (public)", False, f"Status: {status}, Response: {response}")

    def test_pix_order_flow(self):
        """Test complete PIX order flow"""
        print("\n=== TESTING PIX ORDER FLOW ===")
        
        # 1. Create PIX order
        order_data = {
            "type": "delivery",
            "items": [{"productId": "p-burger-classic", "quantity": 1}],
            "customer": {"name": "Teste Backend", "phone": "11999998888"},
            "address": {
                "street": "Rua Teste, 1",
                "neighborhood": "Centro", 
                "city": "SP",
                "state": "SP"
            },
            "payment": {"method": "pix"}
        }
        
        success, response, status = self.make_request(
            'POST', '/orders', 
            order_data, 
            expected_status=201
        )
        
        order_id = None
        if success and isinstance(response, dict) and 'id' in response:
            order_id = response['id']
            payment = response.get('payment', {})
            pix = response.get('pix', {})
            
            # Verify PIX order structure
            pix_valid = (
                payment.get('method') == 'pix' and
                payment.get('status') == 'aguardando_pagamento' and
                'brCode' in pix and
                'copyPaste' in pix and
                'qrDataUrl' in pix and
                pix.get('qrDataUrl', '').startswith('data:image/png;base64,') and
                'txid' in pix and
                'expiresAt' in pix
            )
            
            if pix_valid:
                self.log_result("POST /api/orders (PIX)", True, f"PIX order created: {order_id}")
            else:
                self.log_result("POST /api/orders (PIX)", False, f"Invalid PIX structure: {response}")
        else:
            self.log_result("POST /api/orders (PIX)", False, f"Status: {status}, Response: {response}")
            return None
        
        if not order_id:
            return None
            
        # 2. GET /api/orders/:id/pix-status
        success, response, status = self.make_request('GET', f'/orders/{order_id}/pix-status')
        if success and isinstance(response, dict):
            expected_fields = ['status', 'paymentStatus', 'orderStatus']
            has_fields = all(field in response for field in expected_fields)
            if has_fields:
                self.log_result("GET /api/orders/:id/pix-status", True, f"Status: {response.get('paymentStatus')}")
            else:
                self.log_result("GET /api/orders/:id/pix-status", False, f"Missing fields: {response}")
        else:
            self.log_result("GET /api/orders/:id/pix-status", False, f"Status: {status}, Response: {response}")
        
        # 3. POST /api/orders/:id/pix-confirm (with Bearer admin)
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            success, response, status = self.make_request(
                'POST', f'/orders/{order_id}/pix-confirm', 
                {}, 
                headers=headers
            )
            if success and isinstance(response, dict):
                payment = response.get('payment', {})
                pix = response.get('pix', {})
                confirmed = (
                    payment.get('status') == 'pago' and
                    pix.get('status') == 'pago' and
                    'confirmedBy' in payment and
                    payment['confirmedBy'] == ADMIN_EMAIL
                )
                if confirmed:
                    self.log_result("POST /api/orders/:id/pix-confirm (admin)", True, "PIX payment confirmed")
                else:
                    self.log_result("POST /api/orders/:id/pix-confirm (admin)", False, f"Confirmation failed: {response}")
            else:
                self.log_result("POST /api/orders/:id/pix-confirm (admin)", False, f"Status: {status}, Response: {response}")
        
        # 4. Try to confirm again (should be idempotent)
        if self.admin_token:
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            success, response, status = self.make_request(
                'POST', f'/orders/{order_id}/pix-confirm', 
                {}, 
                headers=headers
            )
            if success and isinstance(response, dict):
                self.log_result("POST /api/orders/:id/pix-confirm (idempotent)", True, "Second confirmation handled")
            else:
                self.log_result("POST /api/orders/:id/pix-confirm (idempotent)", False, f"Status: {status}")
        
        # 5. POST /api/orders/:id/pix-regenerate on paid order - should return 400
        success, response, status = self.make_request(
            'POST', f'/orders/{order_id}/pix-regenerate', 
            {}, 
            expected_status=400
        )
        if success:
            self.log_result("POST /api/orders/:id/pix-regenerate (paid order)", True, "400 returned as expected")
        else:
            self.log_result("POST /api/orders/:id/pix-regenerate (paid order)", False, f"Expected 400, got {status}")
        
        return order_id

    def test_other_payment_methods(self):
        """Test card_delivery and cash_delivery order flows"""
        print("\n=== TESTING OTHER PAYMENT METHODS ===")
        
        # Test card_delivery
        order_data = {
            "type": "delivery",
            "items": [{"productId": "p-burger-classic", "quantity": 1}],
            "customer": {"name": "Teste Card", "phone": "11999998888"},
            "address": {
                "street": "Rua Teste, 1",
                "neighborhood": "Centro", 
                "city": "SP",
                "state": "SP"
            },
            "payment": {"method": "card_delivery"}
        }
        
        success, response, status = self.make_request(
            'POST', '/orders', 
            order_data, 
            expected_status=201
        )
        
        if success and isinstance(response, dict):
            payment = response.get('payment', {})
            has_pix = 'pix' in response
            card_valid = (
                payment.get('method') == 'card_delivery' and
                payment.get('status') == 'pendente_entrega' and
                not has_pix
            )
            if card_valid:
                self.log_result("POST /api/orders (card_delivery)", True, "Card delivery order created")
            else:
                self.log_result("POST /api/orders (card_delivery)", False, f"Invalid structure: {response}")
        else:
            self.log_result("POST /api/orders (card_delivery)", False, f"Status: {status}, Response: {response}")
        
        # Test cash_delivery
        order_data['payment']['method'] = 'cash_delivery'
        success, response, status = self.make_request(
            'POST', '/orders', 
            order_data, 
            expected_status=201
        )
        
        if success and isinstance(response, dict):
            payment = response.get('payment', {})
            has_pix = 'pix' in response
            cash_valid = (
                payment.get('method') == 'cash_delivery' and
                payment.get('status') == 'pendente_entrega' and
                not has_pix
            )
            if cash_valid:
                self.log_result("POST /api/orders (cash_delivery)", True, "Cash delivery order created")
            else:
                self.log_result("POST /api/orders (cash_delivery)", False, f"Invalid structure: {response}")
        else:
            self.log_result("POST /api/orders (cash_delivery)", False, f"Status: {status}, Response: {response}")
        
        # Test legacy method normalization
        order_data['payment']['method'] = 'credit_card'  # Should be normalized to card_delivery
        success, response, status = self.make_request(
            'POST', '/orders', 
            order_data, 
            expected_status=201
        )
        
        if success and isinstance(response, dict):
            payment = response.get('payment', {})
            if payment.get('method') == 'card_delivery':
                self.log_result("POST /api/orders (legacy credit_card)", True, "Legacy method normalized to card_delivery")
            else:
                self.log_result("POST /api/orders (legacy credit_card)", False, f"Method: {payment.get('method')}")
        else:
            self.log_result("POST /api/orders (legacy credit_card)", False, f"Status: {status}")

    def test_pix_regenerate_flow(self):
        """Test PIX regenerate on unpaid order"""
        print("\n=== TESTING PIX REGENERATE FLOW ===")
        
        # Create new PIX order
        order_data = {
            "type": "delivery",
            "items": [{"productId": "p-burger-classic", "quantity": 1}],
            "customer": {"name": "Teste Regenerate", "phone": "11999998888"},
            "address": {
                "street": "Rua Teste, 1",
                "neighborhood": "Centro", 
                "city": "SP",
                "state": "SP"
            },
            "payment": {"method": "pix"}
        }
        
        success, response, status = self.make_request(
            'POST', '/orders', 
            order_data, 
            expected_status=201
        )
        
        if success and isinstance(response, dict) and 'id' in response:
            order_id = response['id']
            original_txid = response.get('pix', {}).get('txid')
            
            # Wait a moment then regenerate
            time.sleep(1)
            success, response, status = self.make_request(
                'POST', f'/orders/{order_id}/pix-regenerate', 
                {}
            )
            
            if success and isinstance(response, dict):
                new_pix = response.get('pix', {})
                new_expires_at = new_pix.get('expiresAt')
                original_expires_at = response.get('pix', {}).get('expiresAt')
                regenerated = (
                    'brCode' in new_pix and
                    'expiresAt' in new_pix and
                    new_expires_at  # Just check that new expiration exists
                )
                if regenerated:
                    self.log_result("POST /api/orders/:id/pix-regenerate (unpaid)", True, "PIX regenerated successfully")
                else:
                    self.log_result("POST /api/orders/:id/pix-regenerate (unpaid)", False, f"Regeneration failed: {response}")
            else:
                self.log_result("POST /api/orders/:id/pix-regenerate (unpaid)", False, f"Status: {status}")
        else:
            self.log_result("Create order for regenerate test", False, f"Status: {status}")

    def test_authorization_scenarios(self):
        """Test various authorization scenarios"""
        print("\n=== TESTING AUTHORIZATION SCENARIOS ===")
        
        # Create a PIX order for testing
        order_data = {
            "type": "delivery",
            "items": [{"productId": "p-burger-classic", "quantity": 1}],
            "customer": {"name": "Auth Test", "phone": "11999998888"},
            "address": {
                "street": "Rua Teste, 1",
                "neighborhood": "Centro", 
                "city": "SP",
                "state": "SP"
            },
            "payment": {"method": "pix"}
        }
        
        success, response, status = self.make_request(
            'POST', '/orders', 
            order_data, 
            expected_status=201
        )
        
        if success and isinstance(response, dict) and 'id' in response:
            order_id = response['id']
            
            # 1. POST /api/orders/:id/pix-confirm without token → 401
            success, response, status = self.make_request(
                'POST', f'/orders/{order_id}/pix-confirm', 
                {}, 
                expected_status=401
            )
            if success:
                self.log_result("PIX confirm without token", True, "401 returned as expected")
            else:
                self.log_result("PIX confirm without token", False, f"Expected 401, got {status}")
            
            # 2. POST /api/orders/:id/pix-confirm with customer token → 401
            if self.customer_token:
                headers = {'Authorization': f'Bearer {self.customer_token}'}
                success, response, status = self.make_request(
                    'POST', f'/orders/{order_id}/pix-confirm', 
                    {}, 
                    headers=headers,
                    expected_status=401
                )
                if success:
                    self.log_result("PIX confirm with customer token", True, "401 returned as expected")
                else:
                    self.log_result("PIX confirm with customer token", False, f"Expected 401, got {status}")
            
            # 3. POST /api/orders/:id/pix-confirm with webhook stub → 200
            webhook_data = {
                "source": "webhook",
                "provider_token": "stub"
            }
            success, response, status = self.make_request(
                'POST', f'/orders/{order_id}/pix-confirm', 
                webhook_data
            )
            if success and isinstance(response, dict):
                payment = response.get('payment', {})
                if payment.get('status') == 'pago' and payment.get('confirmedBy') == 'webhook:stub':
                    self.log_result("PIX confirm via webhook stub", True, "Webhook confirmation successful")
                else:
                    self.log_result("PIX confirm via webhook stub", False, f"Confirmation failed: {response}")
            else:
                self.log_result("PIX confirm via webhook stub", False, f"Status: {status}")

    def test_regression_scenarios(self):
        """Test regression scenarios for previously fixed bugs"""
        print("\n=== TESTING REGRESSION SCENARIOS ===")
        
        if not self.admin_token:
            self.log_result("Regression tests", False, "No admin token available")
            return
        
        headers = {'Authorization': f'Bearer {self.admin_token}'}
        
        # 1. POST /api/admin/users with attendant role
        user_data = {
            "email": f"test_attendant_{int(time.time())}@test.com",
            "password": "test123",
            "name": "Test Attendant",
            "role": "attendant"
        }
        
        success, response, status = self.make_request(
            'POST', '/admin/users', 
            user_data, 
            headers=headers,
            expected_status=201
        )
        
        created_user_id = None
        if success and isinstance(response, dict) and 'id' in response:
            created_user_id = response['id']
            # Test login with created user
            login_success, login_response, login_status = self.make_request(
                'POST', '/auth/login',
                {'email': user_data['email'], 'password': user_data['password']}
            )
            if login_success and isinstance(login_response, dict) and 'token' in login_response:
                self.log_result("POST /api/admin/users + login", True, "User created and can login")
            else:
                self.log_result("POST /api/admin/users + login", False, f"Login failed: {login_status}")
        else:
            self.log_result("POST /api/admin/users", False, f"Status: {status}, Response: {response}")
        
        # 2. DELETE /api/admin/users/:id
        if created_user_id:
            success, response, status = self.make_request(
                'DELETE', f'/admin/users/{created_user_id}', 
                headers=headers
            )
            if success and isinstance(response, dict) and response.get('ok'):
                self.log_result("DELETE /api/admin/users/:id", True, "User deleted successfully")
            else:
                self.log_result("DELETE /api/admin/users/:id", False, f"Status: {status}, Response: {response}")
        
        # 3. Create and delete an order to test DELETE /api/admin/orders/:id
        order_data = {
            "type": "delivery",
            "items": [{"productId": "p-burger-classic", "quantity": 1}],
            "customer": {"name": "Delete Test", "phone": "11999998888"},
            "address": {
                "street": "Rua Teste, 1",
                "neighborhood": "Centro", 
                "city": "SP",
                "state": "SP"
            },
            "payment": {"method": "pix"}
        }
        
        success, response, status = self.make_request(
            'POST', '/orders', 
            order_data, 
            expected_status=201
        )
        
        if success and isinstance(response, dict) and 'id' in response:
            order_id = response['id']
            success, response, status = self.make_request(
                'DELETE', f'/admin/orders/{order_id}', 
                headers=headers
            )
            if success and isinstance(response, dict) and response.get('ok'):
                self.log_result("DELETE /api/admin/orders/:id", True, "Order deleted successfully")
            else:
                self.log_result("DELETE /api/admin/orders/:id", False, f"Status: {status}, Response: {response}")

    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Backend API Tests")
        print(f"Base URL: {API_BASE}")
        
        # Setup
        if not self.authenticate_admin():
            print("❌ Cannot proceed without admin authentication")
            return
        
        self.create_test_customer()
        
        # Run test suites
        self.test_theme_endpoints()
        self.test_payment_methods_endpoints()
        self.test_pix_config_endpoints()
        self.test_pix_order_flow()
        self.test_other_payment_methods()
        self.test_pix_regenerate_flow()
        self.test_authorization_scenarios()
        self.test_regression_scenarios()
        
        # Summary
        print("\n" + "="*50)
        print("📊 TEST SUMMARY")
        print("="*50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for r in self.test_results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['details']}")
        
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        print(f"\n🎯 Success Rate: {success_rate:.1f}%")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
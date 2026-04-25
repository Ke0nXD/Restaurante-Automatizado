#!/usr/bin/env python3
"""
Backend test for add-ons, observations, and delivery confirmation flow
Testing the complete flow as requested in the review.
"""

import requests
import json
import time
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
        self.driver_token = None
        self.test_product_id = None
        self.test_order_id = None
        self.test_delivery_order_id = None
        self.test_not_delivered_order_id = None
        self.driver_user_id = None
        
    def log(self, message: str):
        print(f"[TEST] {message}")
        
    def error(self, message: str):
        print(f"[ERROR] {message}")
        
    def success(self, message: str):
        print(f"[SUCCESS] {message}")
        
    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    token: Optional[str] = None, expected_status: int = 200) -> Dict[str, Any]:
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method.upper() == "PATCH":
                response = requests.patch(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            if response.status_code != expected_status:
                self.error(f"{method} {endpoint} returned {response.status_code}, expected {expected_status}")
                self.error(f"Response: {response.text}")
                return {"error": f"Status {response.status_code}", "response": response.text}
                
            return response.json() if response.text else {}
            
        except Exception as e:
            self.error(f"Request failed: {e}")
            return {"error": str(e)}
    
    def authenticate_admin(self) -> bool:
        """Authenticate as admin"""
        self.log("Authenticating as admin...")
        result = self.make_request("POST", "/auth/login", {
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if "error" in result:
            self.error("Admin authentication failed")
            return False
            
        self.admin_token = result.get("token")
        if not self.admin_token:
            self.error("No token received from admin login")
            return False
            
        self.success("Admin authenticated successfully")
        return True
    
    def authenticate_customer(self) -> bool:
        """Authenticate as customer"""
        self.log("Authenticating as customer...")
        result = self.make_request("POST", "/auth/login", {
            "email": CUSTOMER_EMAIL,
            "password": CUSTOMER_PASSWORD
        })
        
        if "error" in result:
            self.error("Customer authentication failed")
            return False
            
        self.customer_token = result.get("token")
        if not self.customer_token:
            self.error("No token received from customer login")
            return False
            
        self.success("Customer authenticated successfully")
        return True
    
    def create_driver_user(self) -> bool:
        """Create a delivery driver user"""
        self.log("Creating delivery driver user...")
        driver_email = f"driver_test_{int(time.time())}@test.com"
        
        result = self.make_request("POST", "/admin/users", {
            "email": driver_email,
            "password": "driver123",
            "name": "Test Driver",
            "role": "delivery_driver",
            "phone": "(11) 98765-4321"
        }, token=self.admin_token, expected_status=201)
        
        if "error" in result:
            self.error("Failed to create driver user")
            return False
            
        self.driver_user_id = result.get("id")
        self.success(f"Driver user created with ID: {self.driver_user_id}")
        
        # Authenticate as driver
        auth_result = self.make_request("POST", "/auth/login", {
            "email": driver_email,
            "password": "driver123"
        })
        
        if "error" in auth_result:
            self.error("Driver authentication failed")
            return False
            
        self.driver_token = auth_result.get("token")
        self.success("Driver authenticated successfully")
        return True
    
    def test_product_with_addons(self) -> bool:
        """Test 1: Create product with add-ons"""
        self.log("Testing product creation with add-ons...")
        
        product_data = {
            "name": "Test Burger with Add-ons",
            "description": "Test burger for add-ons testing",
            "price": 25.00,
            "image": "https://example.com/burger.jpg",
            "categoryId": "cat-lanches",
            "active": True,
            "addOns": [
                {"name": "Queijo extra", "price": 3.00, "active": True},
                {"name": "Bacon", "price": 4.00, "active": True},
                {"name": "Cebola caramelizada", "price": 2.50, "active": True}
            ]
        }
        
        result = self.make_request("POST", "/admin/products", product_data, 
                                 token=self.admin_token, expected_status=201)
        
        if "error" in result:
            self.error("Failed to create product with add-ons")
            return False
            
        self.test_product_id = result.get("id")
        addons = result.get("addOns", [])
        
        if len(addons) != 3:
            self.error(f"Expected 3 add-ons, got {len(addons)}")
            return False
            
        # Verify each add-on has an ID
        for addon in addons:
            if not addon.get("id"):
                self.error(f"Add-on missing ID: {addon}")
                return False
                
        self.success(f"Product created with {len(addons)} add-ons, each with generated IDs")
        return True
    
    def test_edit_product_addons(self) -> bool:
        """Test editing/removing add-ons from product"""
        self.log("Testing product add-ons editing...")
        
        # First get the current product to get add-on IDs
        result = self.make_request("GET", f"/admin/products", token=self.admin_token)
        if "error" in result:
            return False
            
        products = result if isinstance(result, list) else []
        test_product = next((p for p in products if p.get("id") == self.test_product_id), None)
        
        if not test_product:
            self.error("Test product not found")
            return False
            
        original_addons = test_product.get("addOns", [])
        if len(original_addons) < 2:
            self.error("Not enough add-ons to test editing")
            return False
            
        # Edit: keep first add-on, modify second, remove third, add new one
        updated_addons = [
            original_addons[0],  # Keep first
            {"id": original_addons[1]["id"], "name": "Bacon Premium", "price": 5.00, "active": True},  # Modify second
            {"name": "Molho especial", "price": 1.50, "active": True}  # Add new
        ]
        
        edit_result = self.make_request("PATCH", f"/admin/products/{self.test_product_id}", {
            "addOns": updated_addons
        }, token=self.admin_token)
        
        if "error" in edit_result:
            self.error("Failed to edit product add-ons")
            return False
            
        final_addons = edit_result.get("addOns", [])
        if len(final_addons) != 3:
            self.error(f"Expected 3 add-ons after edit, got {len(final_addons)}")
            return False
            
        # Verify the bacon was updated
        bacon_addon = next((a for a in final_addons if "Bacon" in a.get("name", "")), None)
        if not bacon_addon or bacon_addon.get("price") != 5.00:
            self.error("Bacon add-on was not updated correctly")
            return False
            
        self.success("Product add-ons edited successfully")
        return True
    
    def test_get_product_with_addons(self) -> bool:
        """Test getting product via public endpoint shows add-ons"""
        self.log("Testing public product endpoint shows add-ons...")
        
        result = self.make_request("GET", "/products")
        if "error" in result:
            return False
            
        products = result if isinstance(result, list) else []
        test_product = next((p for p in products if p.get("id") == self.test_product_id), None)
        
        if not test_product:
            self.error("Test product not found in public products")
            return False
            
        addons = test_product.get("addOns", [])
        if not addons:
            self.error("Add-ons not present in public product endpoint")
            return False
            
        self.success(f"Public product endpoint shows {len(addons)} add-ons")
        return True
    
    def test_order_with_addons_and_observations(self) -> bool:
        """Test 2: Create order with add-ons and observations"""
        self.log("Testing order creation with add-ons and observations...")
        
        # Get the product with add-ons
        result = self.make_request("GET", "/products")
        if "error" in result:
            return False
            
        products = result if isinstance(result, list) else []
        test_product = next((p for p in products if p.get("id") == self.test_product_id), None)
        
        if not test_product:
            self.error("Test product not found")
            return False
            
        addons = test_product.get("addOns", [])
        if len(addons) < 2:
            self.error("Not enough add-ons for testing")
            return False
            
        # Select first two add-ons
        selected_addons = [
            {"id": addons[0]["id"]},
            {"id": addons[1]["id"]}
        ]
        
        order_data = {
            "type": "delivery",
            "items": [{
                "productId": self.test_product_id,
                "quantity": 2,
                "observations": "sem cebola, bem passado",
                "addOns": selected_addons
            }],
            "customer": {"name": "Test Customer", "phone": "11999998888"},
            "address": {
                "street": "Rua Teste, 123",
                "neighborhood": "Centro",
                "city": "São Paulo",
                "state": "SP"
            },
            "payment": {"method": "pix"}
        }
        
        result = self.make_request("POST", "/orders", order_data, expected_status=201)
        
        if "error" in result:
            self.error("Failed to create order with add-ons")
            return False
            
        self.test_order_id = result.get("id")
        items = result.get("items", [])
        
        if not items:
            self.error("No items in created order")
            return False
            
        item = items[0]
        
        # Verify item snapshot has required fields
        required_fields = ["addOns", "addOnsTotal", "finalUnitPrice", "subtotal", "observations"]
        for field in required_fields:
            if field not in item:
                self.error(f"Item missing required field: {field}")
                return False
                
        # Verify add-ons are properly matched
        item_addons = item.get("addOns", [])
        if len(item_addons) != 2:
            self.error(f"Expected 2 add-ons in item, got {len(item_addons)}")
            return False
            
        # Verify each add-on has id, name, price
        for addon in item_addons:
            if not all(k in addon for k in ["id", "name", "price"]):
                self.error(f"Add-on missing required fields: {addon}")
                return False
                
        # Verify calculations
        base_price = test_product.get("price", 0)
        addons_total = item.get("addOnsTotal", 0)
        final_unit_price = item.get("finalUnitPrice", 0)
        subtotal = item.get("subtotal", 0)
        quantity = item.get("quantity", 0)
        
        expected_addons_total = sum(addon.get("price", 0) for addon in item_addons)
        expected_final_unit_price = base_price + expected_addons_total
        expected_subtotal = expected_final_unit_price * quantity
        
        if abs(addons_total - expected_addons_total) > 0.01:
            self.error(f"Add-ons total incorrect: {addons_total} vs {expected_addons_total}")
            return False
            
        if abs(final_unit_price - expected_final_unit_price) > 0.01:
            self.error(f"Final unit price incorrect: {final_unit_price} vs {expected_final_unit_price}")
            return False
            
        if abs(subtotal - expected_subtotal) > 0.01:
            self.error(f"Subtotal incorrect: {subtotal} vs {expected_subtotal}")
            return False
            
        # Verify observations
        if item.get("observations") != "sem cebola, bem passado":
            self.error(f"Observations incorrect: {item.get('observations')}")
            return False
            
        # Verify total order calculation
        order_total = result.get("total", 0)
        if abs(order_total - expected_subtotal) > 0.01:
            self.error(f"Order total incorrect: {order_total} vs {expected_subtotal}")
            return False
            
        self.success("Order created with correct add-ons, observations, and calculations")
        return True
    
    def test_invalid_addon_handling(self) -> bool:
        """Test 3: Invalid add-on should be silently ignored"""
        self.log("Testing invalid add-on handling...")
        
        order_data = {
            "type": "delivery",
            "items": [{
                "productId": self.test_product_id,
                "quantity": 1,
                "observations": "test invalid addon",
                "addOns": [
                    {"id": "invalid-addon-id-that-does-not-exist"},
                    {"id": "another-invalid-id"}
                ]
            }],
            "customer": {"name": "Test Customer", "phone": "11999998888"},
            "address": {
                "street": "Rua Teste, 123",
                "neighborhood": "Centro",
                "city": "São Paulo",
                "state": "SP"
            },
            "payment": {"method": "pix"}
        }
        
        result = self.make_request("POST", "/orders", order_data, expected_status=201)
        
        if "error" in result:
            self.error("Order creation failed with invalid add-ons")
            return False
            
        items = result.get("items", [])
        if not items:
            self.error("No items in order")
            return False
            
        item = items[0]
        item_addons = item.get("addOns", [])
        
        # Should have no add-ons since all were invalid
        if len(item_addons) != 0:
            self.error(f"Expected 0 add-ons (all invalid), got {len(item_addons)}")
            return False
            
        # Add-ons total should be 0
        if item.get("addOnsTotal", 0) != 0:
            self.error(f"Add-ons total should be 0, got {item.get('addOnsTotal')}")
            return False
            
        self.success("Invalid add-ons were silently ignored")
        return True
    
    def test_delivery_flow_setup(self) -> bool:
        """Setup for delivery flow testing - create order with logged customer"""
        self.log("Setting up delivery flow test...")
        
        order_data = {
            "type": "delivery",
            "items": [{
                "productId": self.test_product_id,
                "quantity": 1,
                "observations": "delivery test order"
            }],
            "customer": {"name": "João Teste", "phone": "11999998888"},
            "address": {
                "street": "Rua Delivery, 456",
                "neighborhood": "Vila Teste",
                "city": "São Paulo",
                "state": "SP"
            },
            "payment": {"method": "card_delivery"}
        }
        
        result = self.make_request("POST", "/orders", order_data, 
                                 token=self.customer_token, expected_status=201)
        
        if "error" in result:
            self.error("Failed to create delivery order")
            return False
            
        self.test_delivery_order_id = result.get("id")
        
        # Verify the order has the customer's user ID
        if not result.get("userId"):
            self.error("Order missing userId")
            return False
            
        self.success(f"Delivery order created: {self.test_delivery_order_id}")
        return True
    
    def test_driver_marks_delivered(self) -> bool:
        """Test 4: Driver marks order as delivered (2-step flow)"""
        self.log("Testing driver marking order as delivered...")
        
        # Driver marks as delivered without observation (should work)
        result = self.make_request("PATCH", f"/admin/orders/{self.test_delivery_order_id}", {
            "deliveryStatus": "Entregue"
        }, token=self.driver_token)
        
        if "error" in result:
            self.error("Driver failed to mark order as delivered")
            return False
            
        # Verify delivery status
        delivery = result.get("delivery", {})
        if delivery.get("status") != "Aguardando confirmação cliente":
            self.error(f"Expected 'Aguardando confirmação cliente', got '{delivery.get('status')}'")
            return False
            
        if not delivery.get("deliveredByDriverAt"):
            self.error("deliveredByDriverAt not set")
            return False
            
        if result.get("status") == "Finalizado":
            self.error("Order status should not be 'Finalizado' yet")
            return False
            
        self.success("Driver marked order as delivered, awaiting customer confirmation")
        return True
    
    def test_customer_confirm_delivery_unauthorized(self) -> bool:
        """Test customer confirmation without auth and with wrong customer"""
        self.log("Testing unauthorized delivery confirmation...")
        
        # Test without auth
        result = self.make_request("POST", f"/orders/{self.test_delivery_order_id}/confirm-delivery", 
                                 expected_status=401)
        
        if "error" not in result:
            self.error("Should require authentication")
            return False
            
        # Create another customer and try to confirm
        other_customer_result = self.make_request("POST", "/auth/register", {
            "email": f"other_customer_{int(time.time())}@test.com",
            "password": "123456",
            "name": "Other Customer",
            "phone": "(11) 98888-7777"
        }, expected_status=201)
        
        if "error" in other_customer_result:
            self.error("Failed to create other customer")
            return False
            
        other_token = other_customer_result.get("token")
        
        # Try to confirm with wrong customer
        result = self.make_request("POST", f"/orders/{self.test_delivery_order_id}/confirm-delivery", 
                                 token=other_token, expected_status=403)
        
        if "error" not in result or "não pertence" not in result.get("error", "").lower():
            self.error("Should reject confirmation from wrong customer")
            return False
            
        self.success("Unauthorized delivery confirmation properly rejected")
        return True
    
    def test_customer_confirm_delivery_success(self) -> bool:
        """Test 5: Customer confirms delivery successfully"""
        self.log("Testing customer delivery confirmation...")
        
        result = self.make_request("POST", f"/orders/{self.test_delivery_order_id}/confirm-delivery", 
                                 token=self.customer_token)
        
        if "error" in result:
            self.error("Customer failed to confirm delivery")
            return False
            
        # Verify final state
        delivery = result.get("delivery", {})
        if delivery.get("status") != "Entregue":
            self.error(f"Expected delivery status 'Entregue', got '{delivery.get('status')}'")
            return False
            
        if not delivery.get("confirmedByCustomerAt"):
            self.error("confirmedByCustomerAt not set")
            return False
            
        if delivery.get("deliveryConfirmationStatus") != "confirmado_cliente":
            self.error(f"Expected deliveryConfirmationStatus 'confirmado_cliente', got '{delivery.get('deliveryConfirmationStatus')}'")
            return False
            
        if result.get("status") != "Finalizado":
            self.error(f"Expected order status 'Finalizado', got '{result.get('status')}'")
            return False
            
        self.success("Customer confirmed delivery successfully")
        return True
    
    def test_double_confirmation(self) -> bool:
        """Test trying to confirm delivery again (should be idempotent or error)"""
        self.log("Testing double confirmation...")
        
        result = self.make_request("POST", f"/orders/{self.test_delivery_order_id}/confirm-delivery", 
                                 token=self.customer_token, expected_status=400)
        
        # Should either be idempotent (200) or error (400) - both are acceptable
        if result.get("error") and "aguardando confirmação" not in result.get("error", "").lower():
            self.error("Unexpected error on double confirmation")
            return False
            
        self.success("Double confirmation handled properly")
        return True
    
    def test_not_delivered_flow_setup(self) -> bool:
        """Setup for 'Não Entregue' flow"""
        self.log("Setting up 'Não Entregue' flow test...")
        
        order_data = {
            "type": "delivery",
            "items": [{
                "productId": self.test_product_id,
                "quantity": 1,
                "observations": "not delivered test"
            }],
            "customer": {"name": "João Teste", "phone": "11999998888"},
            "address": {
                "street": "Rua Não Entregue, 789",
                "neighborhood": "Vila Teste",
                "city": "São Paulo",
                "state": "SP"
            },
            "payment": {"method": "cash_delivery"}
        }
        
        result = self.make_request("POST", "/orders", order_data, 
                                 token=self.customer_token, expected_status=201)
        
        if "error" in result:
            self.error("Failed to create order for 'Não Entregue' test")
            return False
            
        self.test_not_delivered_order_id = result.get("id")
        self.success(f"Order created for 'Não Entregue' test: {self.test_not_delivered_order_id}")
        return True
    
    def test_not_delivered_without_observation(self) -> bool:
        """Test 6: 'Não Entregue' without observation should fail"""
        self.log("Testing 'Não Entregue' without observation...")
        
        result = self.make_request("PATCH", f"/admin/orders/{self.test_not_delivered_order_id}", {
            "deliveryStatus": "Não Entregue"
        }, token=self.driver_token, expected_status=400)
        
        if "error" not in result or "observação obrigatória" not in result.get("error", "").lower():
            self.error("Should require observation for 'Não Entregue'")
            return False
            
        self.success("'Não Entregue' without observation properly rejected")
        return True
    
    def test_not_delivered_with_observation(self) -> bool:
        """Test 7: 'Não Entregue' with observation should succeed"""
        self.log("Testing 'Não Entregue' with observation...")
        
        result = self.make_request("PATCH", f"/admin/orders/{self.test_not_delivered_order_id}", {
            "deliveryStatus": "Não Entregue",
            "deliveryObservation": "cliente não estava em casa"
        }, token=self.driver_token)
        
        if "error" in result:
            self.error("'Não Entregue' with observation failed")
            return False
            
        # Verify final state
        delivery = result.get("delivery", {})
        if delivery.get("status") != "Não Entregue":
            self.error(f"Expected delivery status 'Não Entregue', got '{delivery.get('status')}'")
            return False
            
        if delivery.get("notDeliveredReason") != "cliente não estava em casa":
            self.error(f"notDeliveredReason incorrect: {delivery.get('notDeliveredReason')}")
            return False
            
        if result.get("status") != "Não Entregue":
            self.error(f"Expected order status 'Não Entregue', got '{result.get('status')}'")
            return False
            
        self.success("'Não Entregue' with observation succeeded")
        return True
    
    def test_customer_view_order_details(self) -> bool:
        """Test 8: Customer can view order with all details"""
        self.log("Testing customer viewing order details...")
        
        # Test the delivered order
        result = self.make_request("GET", f"/orders/{self.test_delivery_order_id}")
        
        if "error" in result:
            self.error("Failed to get order details")
            return False
            
        # Verify items have add-ons and observations
        items = result.get("items", [])
        if not items:
            self.error("No items in order")
            return False
            
        item = items[0]
        if "observations" not in item:
            self.error("Item missing observations")
            return False
            
        # Verify delivery details
        delivery = result.get("delivery", {})
        if not delivery.get("confirmedByCustomerAt"):
            self.error("Delivery missing confirmedByCustomerAt")
            return False
            
        # Test the not delivered order
        not_delivered_result = self.make_request("GET", f"/orders/{self.test_not_delivered_order_id}")
        
        if "error" in not_delivered_result:
            self.error("Failed to get not delivered order details")
            return False
            
        not_delivered_delivery = not_delivered_result.get("delivery", {})
        if not not_delivered_delivery.get("notDeliveredReason"):
            self.error("Not delivered order missing notDeliveredReason")
            return False
            
        self.success("Customer can view all order details correctly")
        return True
    
    def run_all_tests(self) -> bool:
        """Run all tests in sequence"""
        tests = [
            ("Admin Authentication", self.authenticate_admin),
            ("Customer Authentication", self.authenticate_customer),
            ("Create Driver User", self.create_driver_user),
            ("Product with Add-ons Creation", self.test_product_with_addons),
            ("Product Add-ons Editing", self.test_edit_product_addons),
            ("Public Product Endpoint Shows Add-ons", self.test_get_product_with_addons),
            ("Order with Add-ons and Observations", self.test_order_with_addons_and_observations),
            ("Invalid Add-on Handling", self.test_invalid_addon_handling),
            ("Delivery Flow Setup", self.test_delivery_flow_setup),
            ("Driver Marks Delivered", self.test_driver_marks_delivered),
            ("Unauthorized Delivery Confirmation", self.test_customer_confirm_delivery_unauthorized),
            ("Customer Confirms Delivery", self.test_customer_confirm_delivery_success),
            ("Double Confirmation", self.test_double_confirmation),
            ("Not Delivered Flow Setup", self.test_not_delivered_flow_setup),
            ("Not Delivered Without Observation", self.test_not_delivered_without_observation),
            ("Not Delivered With Observation", self.test_not_delivered_with_observation),
            ("Customer View Order Details", self.test_customer_view_order_details),
        ]
        
        passed = 0
        failed = 0
        
        print("=" * 80)
        print("STARTING BACKEND TESTS FOR ADD-ONS, OBSERVATIONS, AND DELIVERY CONFIRMATION")
        print("=" * 80)
        
        for test_name, test_func in tests:
            print(f"\n--- {test_name} ---")
            try:
                if test_func():
                    passed += 1
                    print(f"✅ {test_name} PASSED")
                else:
                    failed += 1
                    print(f"❌ {test_name} FAILED")
            except Exception as e:
                failed += 1
                print(f"❌ {test_name} FAILED with exception: {e}")
        
        print("\n" + "=" * 80)
        print(f"TEST RESULTS: {passed} PASSED, {failed} FAILED")
        print(f"SUCCESS RATE: {passed}/{passed + failed} ({100 * passed / (passed + failed):.1f}%)")
        print("=" * 80)
        
        return failed == 0

if __name__ == "__main__":
    runner = TestRunner()
    success = runner.run_all_tests()
    exit(0 if success else 1)
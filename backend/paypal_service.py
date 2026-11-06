
import os
import httpx
from dotenv import load_dotenv

load_dotenv("backend/.env")

PAYPAL_BASE_URL = os.getenv(
    "PAYPAL_BASE_URL",
    "https://api-m.sandbox.paypal.com"
)

PAYPAL_CLIENT_ID = os.getenv("PAYPAL_CLIENT_ID")
PAYPAL_CLIENT_SECRET = os.getenv("PAYPAL_CLIENT_SECRET")

# Demo conversion rate: INR to USD
INR_TO_USD = float(os.getenv("INR_TO_USD", "0.012"))


async def get_access_token():
    if not PAYPAL_CLIENT_ID or not PAYPAL_CLIENT_SECRET:
        raise RuntimeError(
            "PayPal credentials are missing from backend/.env"
        )

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}/v1/oauth2/token",
            auth=(PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET),
            data={"grant_type": "client_credentials"},
        )

        response.raise_for_status()
        return response.json()["access_token"]


async def create_paypal_order(amount: float, currency: str = "INR"):
    token = await get_access_token()

    if amount <= 0:
        raise ValueError("Payment amount must be greater than zero")

    if currency == "INR":
        paypal_amount = amount * INR_TO_USD
        paypal_currency = "USD"
    else:
        paypal_amount = amount
        paypal_currency = currency

    payload = {
        "intent": "CAPTURE",
        "purchase_units": [
            {
                "amount": {
                    "currency_code": paypal_currency,
                    "value": f"{paypal_amount:.2f}",
                }
            }
        ],
        "payment_source": {
            "paypal": {
                "experience_context": {
                    "brand_name": "BuyWise AI",
                    "user_action": "PAY_NOW",
                    "return_url": "https://buy-wise-ai-one.vercel.app/payment/success",
                    "cancel_url": "https://buy-wise-ai-one.vercel.app/payment/cancel",
                }
            }
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

        response.raise_for_status()
        return response.json()


async def capture_paypal_order(order_id: str):
    token = await get_access_token()

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}/capture",
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            },
        )

        response.raise_for_status()
        return response.json()


import json
from itertools import combinations
from pathlib import Path
from typing import List

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.ai_engine import extract_shopping_intent
from backend.paypal_service import (
    create_paypal_order,
    capture_paypal_order,
)


app = FastAPI(title="BuyWise AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PRODUCTS_FILE = Path(__file__).parent / "products.json"


def load_products():
    with open(PRODUCTS_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def matches_specification(product, field, requirement):
    if not requirement:
        return True

    actual = str(
        product.get("specifications", {}).get(field, "")
    ).lower()

    required = str(requirement).lower()
    return required in actual


def get_use_case_score(product, use_case):
    if not use_case:
        return 50, []

    specifications = product.get("specifications", {})
    gpu = str(specifications.get("gpu", "")).lower()
    ram = str(specifications.get("ram", "")).lower()
    processor = str(
        specifications.get("processor", "")
    ).lower()

    score = 50
    reasons = []

    dedicated_gpu = any(
        keyword in gpu
        for keyword in ["rtx", "gtx", "radeon"]
    )

    if "gaming" in use_case.lower():
        if dedicated_gpu:
            score = 100
            reasons.append(
                "Dedicated graphics suitable for gaming"
            )
        else:
            score = 10
            reasons.append(
                "Integrated graphics may limit gaming performance"
            )

    elif any(word in use_case.lower() for word in [
        "programming", "coding", "development"
    ]):
        if "16" in ram or "32" in ram:
            score += 25

        if any(word in processor for word in [
            "i7", "ryzen 7", "i9", "ryzen 9"
        ]):
            score += 25

        score = min(score, 100)
        reasons.append(
            "Specifications suitable for development work"
        )

    elif any(word in use_case.lower() for word in [
        "design", "editing", "video", "3d"
    ]):
        if dedicated_gpu:
            score += 40

        if "16" in ram or "32" in ram:
            score += 20

        score = min(score, 100)
        reasons.append(
            "Hardware suitable for creative workloads"
        )

    elif any(word in use_case.lower() for word in [
        "study", "student", "office", "browsing", "everyday"
    ]):
        if "16" in ram:
            score += 20

        score = min(score, 100)
        reasons.append(
            "Suitable for everyday productivity"
        )

    return score, reasons


def rank_products(
    filtered_products,
    priority,
    max_price,
    use_case=""
):
    ranked = []

    for product in filtered_products:
        rating = float(product.get("rating", 0))
        price = float(product.get("price", 0))
        stock = int(product.get("stock", 0))

        rating_score = (rating / 5) * 100

        if max_price and max_price > 0:
            value_score = max(
                0,
                100 - (price / max_price * 100)
            )
        else:
            value_score = 50

        stock_score = min(stock * 10, 100)

        if priority == "value":
            base_score = (
                rating_score * 0.25
                + value_score * 0.65
                + stock_score * 0.10
            )

        elif priority == "rating":
            base_score = (
                rating_score * 0.75
                + value_score * 0.15
                + stock_score * 0.10
            )

        else:
            base_score = (
                rating_score * 0.50
                + value_score * 0.40
                + stock_score * 0.10
            )

        use_case_score, use_case_reasons = (
            get_use_case_score(product, use_case)
        )

        final_score = (
            base_score * 0.8
            + use_case_score * 0.2
        )

        reasons = []

        if rating >= 4.5:
            reasons.append("Highly rated product")

        if max_price and price <= max_price:
            reasons.append("Within your specified budget")

        if stock > 0:
            reasons.append(
                "Available in the demo catalogue"
            )

        reasons.extend(use_case_reasons)

        product_result = product.copy()
        product_result["recommendation_score"] = round(
            final_score, 2
        )
        product_result["reasons"] = reasons

        ranked.append(product_result)

    ranked.sort(
        key=lambda item: item["recommendation_score"],
        reverse=True
    )

    return ranked


# Request models

class ShoppingRequest(BaseModel):
    query: str = Field(min_length=1)


class CartItem(BaseModel):
    product_id: int
    quantity: int = Field(gt=0, le=20)


class CartRequest(BaseModel):
    items: List[CartItem]


class BudgetRequest(BaseModel):
    budget: float = Field(gt=0)
    category: str = ""
    max_items: int = Field(default=3, gt=0, le=8)
    priority: str = "balanced"
    use_case: str = ""


class CaptureRequest(BaseModel):
    order_id: str = Field(min_length=1)


# General endpoints

@app.get("/")
def home():
    return {
        "message": "BuyWise AI API is running"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# AI shopping intent extraction

@app.post("/ai/understand")
def understand_shopping_request(request: ShoppingRequest):
    try:
        intent = extract_shopping_intent(request.query)

        return {
            "success": True,
            "intent": intent
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"AI processing failed: {str(error)}"
        )


# Product endpoints

@app.get("/products")
def get_products():
    return load_products()


@app.get("/products/search")
def search_products(q: str = ""):
    products = load_products()

    if not q:
        return products

    query = q.lower()

    return [
        product
        for product in products
        if query in product.get("name", "").lower()
        or query in product.get("brand", "").lower()
        or query in product.get("category", "").lower()
    ]


# Product filtering and AI-based ranking

@app.get("/products/recommend")
def recommend_products(
    q: str = "",
    category: str = "",
    max_price: float = 0,
    priority: str = "balanced",
    ram: str = "",
    processor: str = "",
    gpu: str = "",
    storage: str = "",
    use_case: str = ""
):
    products = load_products()
    filtered = []

    for product in products:
        if category and category.lower() not in (
            product.get("category", "").lower()
        ):
            continue

        if q:
            searchable = (
                product.get("name", "")
                + " "
                + product.get("brand", "")
                + " "
                + product.get("category", "")
            ).lower()

            if q.lower() not in searchable:
                continue

        if (
            max_price > 0
            and product.get("price", 0) > max_price
        ):
            continue

        if not matches_specification(
            product, "ram", ram
        ):
            continue

        if not matches_specification(
            product, "processor", processor
        ):
            continue

        if not matches_specification(
            product, "gpu", gpu
        ):
            continue

        if not matches_specification(
            product, "storage", storage
        ):
            continue

        filtered.append(product)

    ranked = rank_products(
        filtered,
        priority,
        max_price,
        use_case
    )

    return {
        "count": len(ranked),
        "priority": priority,
        "use_case": use_case,
        "recommendations": ranked
    }


# Budget optimizer

@app.post("/budget/optimize")
def optimize_budget(request: BudgetRequest):
    products = load_products()

    candidates = [
        product
        for product in products
        if product.get("stock", 0) > 0
        and product.get("price", 0) <= request.budget
        and (
            not request.category
            or request.category.lower()
            in product.get("category", "").lower()
        )
    ]

    if not candidates:
        raise HTTPException(
            status_code=404,
            detail="No products found within your budget"
        )

    ranked_candidates = rank_products(
        candidates,
        request.priority,
        request.budget,
        request.use_case
    )

    best_combination = None
    best_score = -1
    best_total = 0

    max_items = min(
        request.max_items,
        len(ranked_candidates)
    )

    for count in range(1, max_items + 1):
        for combination in combinations(
            ranked_candidates, count
        ):
            total = sum(
                product["price"]
                for product in combination
            )

            if total > request.budget:
                continue

            score = sum(
                product["recommendation_score"]
                for product in combination
            )

            if (
                score > best_score
                or (
                    score == best_score
                    and total > best_total
                )
            ):
                best_score = score
                best_total = total
                best_combination = combination

    if not best_combination:
        raise HTTPException(
            status_code=404,
            detail="Could not find a suitable combination"
        )

    selected_items = []

    for product in best_combination:
        selected_items.append({
            "product_id": product["id"],
            "name": product["name"],
            "category": product["category"],
            "price": product["price"],
            "rating": product.get("rating", 0),
            "recommendation_score": product[
                "recommendation_score"
            ],
            "reasons": product["reasons"],
            "quantity": 1
        })

    return {
        "success": True,
        "budget": request.budget,
        "item_count": len(selected_items),
        "items": selected_items,
        "total": best_total,
        "remaining_budget": round(
            request.budget - best_total, 2
        ),
        "optimization_method": (
            "Budget-constrained product combination "
            "using recommendation scores"
        )
    }


# Cart calculation and validation

def calculate_cart(request: CartRequest):
    products = load_products()

    product_lookup = {
        product["id"]: product
        for product in products
    }

    validated_items = []
    total = 0

    for item in request.items:
        product = product_lookup.get(item.product_id)

        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product {item.product_id} not found"
            )

        if item.quantity > product.get("stock", 0):
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for {product['name']}"
            )

        subtotal = product["price"] * item.quantity
        total += subtotal

        validated_items.append({
            "product_id": product["id"],
            "name": product["name"],
            "unit_price": product["price"],
            "quantity": item.quantity,
            "subtotal": subtotal
        })

    return {
        "valid": True,
        "items": validated_items,
        "total": total,
        "currency": "INR"
    }


@app.post("/cart/validate")
def validate_cart(request: CartRequest):
    return calculate_cart(request)


# PayPal order creation

@app.post("/paypal/create-order")
async def create_order(request: CartRequest):
    cart = calculate_cart(request)
    amount = cart["total"]

    if amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Cart total must be greater than zero"
        )

    try:
        order = await create_paypal_order(amount)

        approval_url = next(
            (
                link["href"]
                for link in order.get("links", [])
                if link.get("rel") in [
                    "payer-action",
                    "approve"
                ]
            ),
            None
        )

        if not approval_url:
            raise HTTPException(
                status_code=502,
                detail="PayPal did not return an approval URL"
            )

        return {
            "success": True,
            "order_id": order["id"],
            "status": order["status"],
            "approval_url": approval_url,
            "cart": cart
        }

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "PayPal order creation failed: "
                + error.response.text
            )
        )

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not create PayPal order: {str(error)}"
        )


# PayPal payment capture

@app.post("/paypal/capture-order")
async def capture_order(request: CaptureRequest):
    try:
        result = await capture_paypal_order(
            request.order_id
        )

        if result.get("status") != "COMPLETED":
            raise HTTPException(
                status_code=400,
                detail="Payment has not been completed"
            )

        return {
            "success": True,
            "message": "Payment completed successfully",
            "order_id": result.get("id"),
            "status": result.get("status"),
            "payment_details": result.get(
                "purchase_units", []
            )
        }

    except httpx.HTTPStatusError as error:
        raise HTTPException(
            status_code=502,
            detail=(
                "PayPal capture failed: "
                + error.response.text
            )
        )

    except HTTPException:
        raise

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Payment capture failed: {str(error)}"
        )

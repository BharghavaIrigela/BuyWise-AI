
import os
import json

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv("backend/.env")

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in backend/.env")

client = genai.Client(api_key=api_key)


def extract_shopping_intent(user_query: str):
    prompt = f"""
    You are the shopping intent extraction engine for BuyWise AI.

    Analyze the user's shopping request and return ONLY valid JSON.

    Extract:
    - category: laptop, smartphone, headphones, monitor, or other
    - max_price: maximum budget in INR, or 0 if unspecified
    - processor: required processor, or empty string
    - ram: required RAM, or empty string
    - gpu: required GPU, or empty string
    - storage: required storage, or empty string
    - use_case: intended purpose
    - priority: balanced, value, or rating

    Do not invent requirements that the user has not specified.
    Use empty strings for unspecified text fields.
    Use 0 for an unspecified budget.

    User request: {user_query}
    """

    response = client.models.generate_content(
        model="gemini-3.5-flash-lite",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1
        )
    )

    return json.loads(response.text)

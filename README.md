# BuyWise AI

**Discover smarter. Compare better. Spend wisely.**

BuyWise AI is an AI-powered shopping assistant that understands your shopping needs, recommends suitable products, compares alternatives, optimizes your budget, and enables secure checkout through PayPal Sandbox.

## Features

- **AI Shopping Assistant:** Understands natural-language shopping requirements using Google Gemini.
- **Smart Recommendations:** Finds and ranks products based on budget, specifications, and intended use.
- **Product Comparison:** Compare prices, ratings, specifications, and availability.
- **Smart Budget Optimizer:** Identifies suitable product combinations within your budget.
- **Shopping Cart:** Add products and manage quantities.
- **PayPal Checkout:** Create, approve, and capture payments through PayPal Sandbox.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| AI | Google Gemini API |
| Payments | PayPal Orders API (Sandbox) |

## Project Structure

```text
BuyWise-AI/
├── backend/
│   ├── ai_engine.py
│   ├── main.py
│   ├── paypal_service.py
│   ├── products.json
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js and npm
- Google Gemini API key
- PayPal Sandbox credentials

### 1. Clone the Repository

```bash
git clone https://github.com/BharghavaIrigela/BuyWise-AI.git
cd BuyWise-AI
```

### 2. Backend Setup

```bash
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 3. Configure Environment Variables

Create `backend/.env` and add:

```env
GEMINI_API_KEY=your_gemini_api_key
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
INR_TO_USD=0.012
```

Never commit API keys or credentials.

### 4. Run the Backend

From the project root:

```bash
python -m uvicorn backend.main:app --reload --reload-dir backend
```

Backend: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

### 5. Run the Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

## Demo Information

The project currently uses a curated sample product catalogue. Product prices and availability are demonstration data and are not live retailer listings.

PayPal integration uses Sandbox accounts. The INR-to-USD conversion value is a fixed demonstration rate, not a live exchange rate. No real payments are processed.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

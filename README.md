
# BuyWise AI

**Discover smarter. Compare better. Spend wisely.**

BuyWise AI is an AI-powered shopping companion that understands natural-language shopping requirements, discovers suitable products, compares alternatives, optimizes spending, and enables checkout through PayPal.

Instead of manually browsing multiple products, users can describe what they need, set a budget, and receive personalized recommendations with clear explanations.

## Live Demo

- **Frontend:** https://buy-wise-ai-one.vercel.app/
- **Backend API:** https://buywise-ai-backend.vercel.app/
- **API Documentation:** https://buywise-ai-backend.vercel.app/docs

## Key Features

- **AI Shopping Assistant:** Uses Google Gemini to understand natural-language shopping requirements.
- **Intelligent Recommendations:** Filters and ranks products based on budget, specifications, and intended use.
- **Product Comparison:** Compare product prices, ratings, specifications, and availability.
- **Smart Budget Optimizer:** Finds suitable product combinations within a specified budget.
- **Shopping Cart:** Add products, update quantities, and validate cart contents.
- **PayPal Checkout:** Supports order creation, buyer approval, and server-side payment capture through PayPal Sandbox.

## How It Works

1. **Describe:** Enter your shopping requirements in natural language.
2. **Understand:** Gemini extracts relevant product requirements and preferences.
3. **Discover:** The recommendation engine filters and ranks matching products.
4. **Compare:** Review product specifications, prices, and ratings.
5. **Optimize:** Generate product combinations within your budget.
6. **Checkout:** Add selected products to your cart and complete the PayPal Sandbox checkout flow.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Styling | Tailwind CSS |
| Backend | Python, FastAPI |
| AI | Google Gemini API |
| Payments | PayPal Orders API (Sandbox) |
| Deployment | Vercel |

## Architecture

```text
                User
                  |
                  v
          Next.js Frontend
                  |
                  v
             FastAPI
                  |
          +-------+-------+
          |       |       |
          v       v       v
        Gemini  Product  PayPal
         API    Engine    API
                  |
                  v
          Recommendations
          Comparisons
          Budget Optimization
                  |
                  v
             Shopping Cart
                  |
                  v
          PayPal Checkout
```

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
├── LICENSE
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

```powershell
py -3.11 -m venv .venv
.venv\Scripts\activate
pip install -r backend/requirements.txt
```

### 3. Configure Environment Variables

Create `backend/.env`:

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
python -m uvicorn backend.main:app --reload
```

Backend: http://127.0.0.1:8000

API documentation: http://127.0.0.1:8000/docs

### 5. Configure and Run the Frontend

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:3000

## Demo Information

- The application currently uses a curated sample product catalogue. Product prices and availability are demonstration data, not live retailer listings.
- PayPal integration uses Sandbox accounts. No real payments are processed.
- INR-to-USD conversion uses a fixed demonstration rate and is not a live exchange rate.

## Future Scope

- Integration with live retailer product catalogues.
- Real-time price and availability tracking.
- More advanced multi-product purchasing optimization.
- Persistent user accounts, carts, and order history.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).

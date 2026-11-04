
"use client";

import { useState } from "react";

type Intent = {
  category: string;
  max_price: number;
  processor: string;
  ram: string;
  gpu: string;
  storage: string;
  use_case: string;
  priority: string;
};

type Product = {
  id: number;
  name: string;
  category: string;
  brand: string;
  price: number;
  rating: number;
  stock: number;
  specifications: Record<string, string>;
  recommendation_score: number;
  reasons: string[];
};

type CartItem = {
  product: Product;
  quantity: number;
};

type BudgetResultItem = {
  product_id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  recommendation_score: number;
  reasons: string[];
  quantity: number;
};

type BudgetResult = {
  success: boolean;
  budget: number;
  item_count: number;
  items: BudgetResultItem[];
  total: number;
  remaining_budget: number;
  optimization_method: string;
};

const API_URL = "http://127.0.0.1:8000";

export default function Home() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Budget optimizer state
  const [budget, setBudget] = useState("100000");
  const [budgetCategory, setBudgetCategory] = useState("");
  const [maxItems, setMaxItems] = useState("3");
  const [budgetUseCase, setBudgetUseCase] = useState("");
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState("");
  const [budgetResult, setBudgetResult] = useState<BudgetResult | null>(null);
  const [addingOptimized, setAddingOptimized] = useState(false);

  async function findProducts() {
    if (!query.trim()) {
      setError("Please describe what you are looking for.");
      return;
    }

    setLoading(true);
    setError("");
    setProducts([]);
    setIntent(null);
    setCompareIds([]);
    setSearched(false);

    try {
      const intentResponse = await fetch(`${API_URL}/ai/understand`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query }),
      });

      if (!intentResponse.ok) {
        const data = await intentResponse.json();
        throw new Error(
          data.detail || "Unable to understand your requirements."
        );
      }

      const intentData = await intentResponse.json();
      const requirements: Intent = intentData.intent || intentData;

      setIntent(requirements);

      const params = new URLSearchParams({
        q: requirements.category || "",
        category: requirements.category || "",
        max_price: String(requirements.max_price || 0),
        priority: requirements.priority || "balanced",
        ram: requirements.ram || "",
        processor: requirements.processor || "",
        gpu: requirements.gpu || "",
        storage: requirements.storage || "",
        use_case: requirements.use_case || "",
      });

      const productResponse = await fetch(
        `${API_URL}/products/recommend?${params.toString()}`
      );

      if (!productResponse.ok) {
        throw new Error("Unable to retrieve product recommendations.");
      }

      const productData = await productResponse.json();

      setProducts(productData.recommendations || []);
      setSearched(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // Budget optimizer
  async function optimizeBudget() {
    const budgetValue = Number(budget);
    const itemLimit = Number(maxItems);

    if (!budgetValue || budgetValue <= 0) {
      setBudgetError("Please enter a valid budget.");
      return;
    }

    if (!itemLimit || itemLimit < 1 || itemLimit > 8) {
      setBudgetError("Maximum products must be between 1 and 8.");
      return;
    }

    setBudgetLoading(true);
    setBudgetError("");
    setBudgetResult(null);

    try {
      const response = await fetch(`${API_URL}/budget/optimize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          budget: budgetValue,
          category: budgetCategory,
          max_items: itemLimit,
          priority: "balanced",
          use_case: budgetUseCase,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to optimize your budget."
        );
      }

      setBudgetResult(data);
    } catch (err) {
      setBudgetError(
        err instanceof Error
          ? err.message
          : "Budget optimization failed. Please try again."
      );
    } finally {
      setBudgetLoading(false);
    }
  }

  // Add the complete optimized combination to the cart
  async function addOptimizedToCart() {
    if (!budgetResult || budgetResult.items.length === 0) {
      return;
    }

    setAddingOptimized(true);
    setBudgetError("");

    try {
      const response = await fetch(`${API_URL}/products`);

      if (!response.ok) {
        throw new Error("Unable to retrieve product details.");
      }

      const allProducts: Product[] = await response.json();

      const optimizedProducts: Product[] = budgetResult.items.map(
        (item) => {
          const product = allProducts.find(
            (p) => p.id === item.product_id
          );

          if (!product) {
            throw new Error(`${item.name} could not be found.`);
          }

          return {
            ...product,
            recommendation_score: item.recommendation_score,
            reasons: item.reasons || [],
          };
        }
      );

      setCart((current) => {
        const updated = [...current];

        for (const product of optimizedProducts) {
          const existing = updated.find(
            (item) => item.product.id === product.id
          );

          if (existing) {
            if (
              existing.quantity + 1 > product.stock
            ) {
              throw new Error(
                `Insufficient stock for ${product.name}.`
              );
            }

            existing.quantity += 1;
          } else {
            if (product.stock < 1) {
              throw new Error(
                `${product.name} is out of stock.`
              );
            }

            updated.push({
              product,
              quantity: 1,
            });
          }
        }

        return updated;
      });
    } catch (err) {
      setBudgetError(
        err instanceof Error
          ? err.message
          : "Unable to add optimized products to cart."
      );
    } finally {
      setAddingOptimized(false);
    }
  }

  function toggleCompare(productId: number) {
    setCompareIds((current) => {
      if (current.includes(productId)) {
        return current.filter((id) => id !== productId);
      }

      if (current.length >= 3) {
        setError("You can compare a maximum of 3 products.");
        return current;
      }

      setError("");
      return [...current, productId];
    });
  }

  function addToCart(product: Product) {
    setError("");

    setCart((current) => {
      const existing = current.find(
        (item) => item.product.id === product.id
      );

      if (existing) {
        if (existing.quantity >= product.stock) {
          setError(`Only ${product.stock} units are available.`);
          return current;
        }

        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      if (product.stock <= 0) {
        setError("This product is currently out of stock.");
        return current;
      }

      return [...current, { product, quantity: 1 }];
    });
  }

  function updateQuantity(productId: number, change: number) {
    setError("");

    setCart((current) =>
      current
        .map((item) => {
          if (item.product.id !== productId) {
            return item;
          }

          const newQuantity = item.quantity + change;

          if (newQuantity > item.product.stock) {
            setError(
              `Only ${item.product.stock} units of ${item.product.name} are available.`
            );
            return item;
          }

          return { ...item, quantity: newQuantity };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId: number) {
    setCart((current) =>
      current.filter((item) => item.product.id !== productId)
    );
  }

  function clearCart() {
    setCart([]);
    setError("");
  }

  async function checkout() {
    if (cart.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    setCheckoutLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/paypal/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "Unable to create PayPal order."
        );
      }

      if (!data.approval_url) {
        throw new Error("PayPal approval URL was not returned.");
      }

      window.location.href = data.approval_url;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Checkout failed. Please try again."
      );
      setCheckoutLoading(false);
    }
  }

  const compareProducts = products.filter((product) =>
    compareIds.includes(product.id)
  );

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0
  );

  return (
    <main className="min-h-screen bg-[#080d18] text-white">
      <div className="mx-auto max-w-6xl px-6 py-12">

        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-cyan-400">
            BuyWise AI
          </h1>

          <p className="mt-4 text-lg text-gray-400">
            Discover smarter. Compare better. Spend wisely.
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Your AI-powered shopping companion
          </p>

          <div className="mt-5 inline-block rounded-full border border-cyan-900 bg-[#10212b] px-5 py-2 text-sm text-cyan-300">
            <span>Shopping Cart: {cartCount} items</span>
          </div>
        </header>

        {/* Budget Optimizer */}
        <section className="mb-10 rounded-2xl border border-cyan-900 bg-[#091923] p-7">
          <h2 className="text-2xl font-bold text-cyan-400">
            Smart Budget Optimizer
          </h2>

          <p className="mt-2 text-sm text-gray-400">
            Tell us your budget and let BuyWise AI find a suitable
            combination of products.
          </p>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Your total budget (₹)
              </label>

              <input
                type="number"
                min="1"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Example: 100000"
                className="w-full rounded-xl border border-gray-700 bg-[#080d18] p-3 text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Product category
              </label>

              <select
                value={budgetCategory}
                onChange={(e) => setBudgetCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#080d18] p-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="">All categories</option>
                <option value="Laptop">Laptop</option>
                <option value="Smartphone">Smartphone</option>
                <option value="Headphones">Headphones</option>
                <option value="Monitor">Monitor</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Maximum number of products
              </label>

              <select
                value={maxItems}
                onChange={(e) => setMaxItems(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#080d18] p-3 text-white outline-none focus:border-cyan-400"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((number) => (
                  <option key={number} value={number}>
                    {number} {number === 1 ? "product" : "products"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Intended use
              </label>

              <select
                value={budgetUseCase}
                onChange={(e) => setBudgetUseCase(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-[#080d18] p-3 text-white outline-none focus:border-cyan-400"
              >
                <option value="">General use</option>
                <option value="gaming">Gaming</option>
                <option value="programming">Programming</option>
                <option value="study">Study</option>
                <option value="design and editing">Design and editing</option>
                <option value="office productivity">Office productivity</option>
              </select>
            </div>
          </div>

          <button
            onClick={optimizeBudget}
            disabled={budgetLoading}
            className="mt-6 rounded-xl bg-cyan-500 px-8 py-3 font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {budgetLoading
              ? "Optimizing Budget..."
              : "Optimize My Budget"}
          </button>

          {budgetError && (
            <p className="mt-4 text-sm text-red-400">
              {budgetError}
            </p>
          )}

          {/* Optimizer Results */}
          {budgetResult && (
            <div className="mt-8 rounded-xl border border-gray-700 bg-[#111827] p-6">
              <h3 className="text-xl font-bold text-cyan-400">
                Your Optimized Shopping Combination
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                {budgetResult.item_count} products selected within
                your ₹{budgetResult.budget.toLocaleString("en-IN")} budget.
              </p>

              <div className="mt-6 space-y-4">
                {budgetResult.items.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-800 bg-[#171b27] p-4"
                  >
                    <div>
                      <h4 className="font-semibold">
                        {item.name}
                      </h4>

                      <p className="mt-1 text-sm text-gray-400">
                        {item.category} · ★ {item.rating}/5
                      </p>

                      <p className="mt-1 text-xs text-cyan-300">
                        Recommendation score:{" "}
                        {item.recommendation_score.toFixed(2)}
                      </p>
                    </div>

                    <p className="text-lg font-bold text-white">
                      ₹{item.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3 border-t border-gray-700 pt-5">
                <div className="flex justify-between text-sm text-gray-400">
                  <span>Your budget</span>
                  <span>
                    ₹{budgetResult.budget.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between text-lg font-semibold">
                  <span>Total cost</span>
                  <span className="text-cyan-400">
                    ₹{budgetResult.total.toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">
                    Remaining budget
                  </span>
                  <span className="font-semibold text-green-400">
                    ₹{budgetResult.remaining_budget.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <button
                onClick={addOptimizedToCart}
                disabled={addingOptimized}
                className="mt-6 w-full rounded-xl bg-cyan-500 px-6 py-3 font-semibold text-black transition hover:bg-cyan-400 disabled:opacity-50"
              >
                {addingOptimized
                  ? "Adding Products..."
                  : "Add Optimized Combination to Cart"}
              </button>

              <p className="mt-3 text-xs text-gray-500">
                Recommendations are based on the demonstration product
                catalogue and its available stock.
              </p>
            </div>
          )}
        </section>

        {/* Search */}
        <section className="rounded-2xl border border-gray-800 bg-[#111827] p-7">
          <h2 className="mb-2 text-2xl font-semibold">
            What are you looking for?
          </h2>

          <p className="mb-5 text-gray-400">
            Describe your product, budget and preferences in natural language.
          </p>

          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Example: I need a gaming laptop under ₹80000 with 16GB RAM"
            rows={3}
            className="w-full resize-none rounded-xl border border-gray-700 bg-[#080d18] p-4 text-white outline-none transition focus:border-cyan-400"
          />

          <button
            onClick={findProducts}
            disabled={loading}
            className="mt-5 rounded-xl bg-cyan-500 px-8 py-3 font-semibold text-black transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Finding Products..." : "Find Products"}
          </button>

          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}
        </section>

        {/* AI Understanding */}
        {intent && (
          <section className="mt-8 rounded-2xl border border-cyan-900 bg-[#091923] p-6">
            <h2 className="mb-5 text-xl font-semibold text-cyan-400">
              AI understood your requirements
            </h2>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-lg bg-gray-800 px-4 py-2">
                Category: {intent.category || "Any"}
              </span>

              {intent.max_price > 0 && (
                <span className="rounded-lg bg-gray-800 px-4 py-2">
                  Budget: ₹{Number(intent.max_price).toLocaleString("en-IN")}
                </span>
              )}

              {intent.ram && (
                <span className="rounded-lg bg-gray-800 px-4 py-2">
                  RAM: {intent.ram}
                </span>
              )}

              {intent.processor && (
                <span className="rounded-lg bg-gray-800 px-4 py-2">
                  Processor: {intent.processor}
                </span>
              )}

              {intent.gpu && (
                <span className="rounded-lg bg-gray-800 px-4 py-2">
                  GPU: {intent.gpu}
                </span>
              )}

              {intent.use_case && (
                <span className="rounded-lg bg-gray-800 px-4 py-2">
                  Purpose: {intent.use_case}
                </span>
              )}

              {intent.priority && (
                <span className="rounded-lg bg-gray-800 px-4 py-2">
                  Priority: {intent.priority}
                </span>
              )}
            </div>
          </section>
        )}

        {/* Product Recommendations */}
        {searched && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold">
              Recommended Products
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              {products.length} matching products from our demo catalogue
            </p>

            {products.length === 0 ? (
              <div className="mt-8 rounded-xl border border-gray-800 bg-[#111827] p-8 text-center">
                No matching products found. Try adjusting your requirements.
              </div>
            ) : (
              <div className="mt-9 grid gap-6 md:grid-cols-2">
                {products.map((product) => {
                  const selected = compareIds.includes(product.id);
                  const inCart = cart.some(
                    (item) => item.product.id === product.id
                  );

                  return (
                    <article
                      key={product.id}
                      className="rounded-2xl border border-gray-800 bg-[#171b27] p-6 transition hover:border-cyan-700"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-cyan-400">
                            {product.brand} · {product.category}
                          </p>

                          <h3 className="mt-3 text-xl font-bold">
                            {product.name}
                          </h3>
                        </div>

                        <span className="shrink-0 rounded-lg bg-[#102f3a] px-3 py-2 text-sm font-semibold text-cyan-300">
                          Score:{" "}
                          {Number(product.recommendation_score).toFixed(2)}
                        </span>
                      </div>

                      <p className="mt-6 text-2xl font-bold">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </p>

                      <p className="mt-3 text-sm text-yellow-400">
                        ★ {product.rating}/5
                      </p>

                      <div className="mt-6 space-y-2 text-sm">
                        {Object.entries(product.specifications || {}).map(
                          ([key, value]) => (
                            <p key={key}>
                              <span className="text-gray-500">
                                {key.charAt(0).toUpperCase() + key.slice(1)}:{" "}
                              </span>
                              <span className="text-gray-200">{value}</span>
                            </p>
                          )
                        )}
                      </div>

                      <div className="my-6 border-t border-gray-700" />

                      <h4 className="mb-3 font-semibold text-cyan-400">
                        Why we recommend it
                      </h4>

                      <ul className="space-y-2 text-sm text-gray-400">
                        {(product.reasons || []).map((reason, index) => (
                          <li key={index}>✓ {reason}</li>
                        ))}
                      </ul>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => toggleCompare(product.id)}
                          className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${
                            selected
                              ? "border border-cyan-400 text-cyan-400"
                              : "bg-gray-700 text-white hover:bg-gray-600"
                          }`}
                        >
                          {selected ? "Remove Compare" : "Compare"}
                        </button>

                        <button
                          onClick={() => addToCart(product)}
                          className="rounded-lg bg-cyan-500 px-3 py-3 text-sm font-semibold text-black transition hover:bg-cyan-400"
                        >
                          {inCart ? "Add Another" : "Add to Cart"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Product Comparison */}
        {compareProducts.length > 0 && (
          <section className="mt-16">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">
                  Product Comparison
                </h2>

                <p className="mt-2 text-sm text-gray-400">
                  Comparing {compareProducts.length} of 3 products
                </p>
              </div>

              <button
                onClick={() => setCompareIds([])}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-cyan-400 hover:text-cyan-400"
              >
                Clear Comparison
              </button>
            </div>

            <div className="mt-6 overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-[#111827]">
                  <tr>
                    <th className="p-4 text-gray-400">Feature</th>

                    {compareProducts.map((product) => (
                      <th key={product.id} className="p-4 text-cyan-400">
                        {product.name}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {[
                    { label: "Brand", value: (p: Product) => p.brand },
                    {
                      label: "Price",
                      value: (p: Product) =>
                        `₹${Number(p.price).toLocaleString("en-IN")}`,
                    },
                    {
                      label: "Rating",
                      value: (p: Product) => `${p.rating}/5`,
                    },
                    {
                      label: "Recommendation Score",
                      value: (p: Product) =>
                        Number(p.recommendation_score).toFixed(2),
                    },
                    {
                      label: "Processor",
                      value: (p: Product) =>
                        p.specifications?.processor || "Not specified",
                    },
                    {
                      label: "RAM",
                      value: (p: Product) =>
                        p.specifications?.ram || "Not specified",
                    },
                    {
                      label: "Storage",
                      value: (p: Product) =>
                        p.specifications?.storage || "Not specified",
                    },
                    {
                      label: "GPU",
                      value: (p: Product) =>
                        p.specifications?.gpu || "Not specified",
                    },
                    {
                      label: "Available Stock",
                      value: (p: Product) => String(p.stock),
                    },
                  ].map((feature) => (
                    <tr
                      key={feature.label}
                      className="border-t border-gray-800"
                    >
                      <td className="p-4 font-medium text-gray-400">
                        {feature.label}
                      </td>

                      {compareProducts.map((product) => (
                        <td key={product.id} className="p-4 text-gray-200">
                          {feature.value(product)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Shopping Cart */}
        <section className="mt-16 rounded-2xl border border-gray-800 bg-[#111827] p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Shopping Cart
              </h2>

              <p className="mt-2 text-sm text-gray-400">
                {cartCount} items selected
              </p>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                disabled={checkoutLoading}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm text-gray-300 hover:border-red-400 hover:text-red-400 disabled:opacity-50"
              >
                Clear Cart
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="mt-8 rounded-xl border border-dashed border-gray-700 p-8 text-center">
              <p className="text-gray-300">
                Your cart is empty.
              </p>

              <p className="mt-2 text-sm text-gray-500">
                Add products from your recommendations to get started.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-8 space-y-5">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex flex-wrap items-center justify-between gap-5 rounded-xl border border-gray-800 bg-[#171b27] p-5"
                  >
                    <div className="min-w-[180px] flex-1">
                      <h3 className="font-semibold">
                        {item.product.name}
                      </h3>

                      <p className="mt-2 text-sm text-gray-400">
                        ₹{item.product.price.toLocaleString("en-IN")} each
                      </p>

                      <p className="mt-1 text-sm text-cyan-400">
                        Subtotal: ₹
                        {(
                          item.product.price * item.quantity
                        ).toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, -1)
                        }
                        disabled={checkoutLoading}
                        className="h-9 w-9 rounded-lg bg-gray-700 text-lg hover:bg-gray-600 disabled:opacity-50"
                      >
                        −
                      </button>

                      <span className="min-w-6 text-center font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, 1)
                        }
                        disabled={checkoutLoading}
                        className="h-9 w-9 rounded-lg bg-gray-700 text-lg hover:bg-gray-600 disabled:opacity-50"
                      >
                        +
                      </button>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        disabled={checkoutLoading}
                        className="ml-2 text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 border-t border-gray-700 pt-6">
                <div className="flex items-center justify-between">
                  <span className="text-lg text-gray-400">
                    Cart Total
                  </span>

                  <span className="text-3xl font-bold text-cyan-400">
                    ₹{cartTotal.toLocaleString("en-IN")}
                  </span>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Prices and stock are from the demonstration catalogue.
                  Final totals are validated by the backend.
                  PayPal Sandbox converts the INR total to USD using the
                  configured demonstration conversion rate.
                </p>

                {error && (
                  <p className="mt-4 text-sm text-red-400">
                    {error}
                  </p>
                )}

                <button
                  onClick={checkout}
                  disabled={checkoutLoading || cart.length === 0}
                  className="mt-6 w-full rounded-xl bg-[#0070ba] px-6 py-4 font-semibold text-white transition hover:bg-[#005ea6] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {checkoutLoading
                    ? "Redirecting to PayPal..."
                    : "Pay with PayPal"}
                </button>

                <p className="mt-3 text-center text-xs text-gray-500">
                  Secure payment through PayPal Sandbox. You will review and
                  approve the payment before it is captured.
                </p>
              </div>
            </>
          )}
        </section>

        {/* Footer */}
        <footer className="mt-20 pb-8 text-center text-sm text-gray-500">
          Discover smarter. Compare better. Spend wisely.
        </footer>
      </div>
    </main>
  );
}

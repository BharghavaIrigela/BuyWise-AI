"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("Verifying your payment...");
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  const captureStarted = useRef(false);

  useEffect(() => {
    if (!token || captureStarted.current) {
      if (!token) {
        setError("PayPal order ID is missing.");
      }
      return;
    }

    captureStarted.current = true;

    async function capturePayment() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/paypal/capture-order`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              order_id: token,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Payment verification failed.");
        }

        setCompleted(true);
        setStatus(data.message || "Payment completed successfully!");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to verify payment."
        );
      }
    }

    capturePayment();
  }, [token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-gray-800 bg-gray-900 p-10 text-center shadow-xl">
        {completed ? (
          <>
            <div className="mb-5 text-6xl text-green-400">✓</div>
            <h1 className="mb-3 text-3xl font-bold">
              Payment Successful!
            </h1>
            <p className="mb-6 text-gray-300">{status}</p>
            <p className="mb-6 break-all text-sm text-gray-400">
              PayPal Order ID: {token}
            </p>
            <a
              href="/"
              className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-700"
            >
              Continue Shopping
            </a>
          </>
        ) : error ? (
          <>
            <div className="mb-5 text-5xl text-red-400">!</div>
            <h1 className="mb-3 text-2xl font-bold">
              Payment Verification Failed
            </h1>
            <p className="mb-6 text-gray-300">{error}</p>
            <a href="/" className="text-blue-400 hover:underline">
              Return to BuyWise AI
            </a>
          </>
        ) : (
          <>
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500" />
            <h1 className="mb-3 text-2xl font-bold">
              Verifying Payment
            </h1>
            <p className="text-gray-300">{status}</p>
          </>
        )}
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
          Loading...
        </main>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
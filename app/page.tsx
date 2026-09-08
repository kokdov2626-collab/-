"use client";

import { useState } from "react";

interface ApiSupermarket {
  id: string;
  name: string;
  productsSubtotal: number;
  deliveryPrice: number;
  serviceFee: number;
  minimumOrder: number;
  meetsMinimum: boolean;
  total: number;
}

interface ApiItem {
  productId: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  isOnSale?: boolean;
  updatedAt: string;
  supermarket: string;
}

interface ApiSolution {
  label: string;
  numberOfOrders: number;
  grandTotal: number;
  productsTotal: number;
  deliveryTotal: number;
}

interface ApiResponse {
  total: number | null;
  savings: number | null;
  supermarkets: ApiSupermarket[];
  items: ApiItem[];
  delivery: number | null;
  allSolutions: ApiSolution[];
  matching: { requestedName: string; matchedProductId: string | null }[];
  unmatchedItems: string[];
  error?: string;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "עודכן הרגע";
  if (minutes < 60) return `עודכן לפני ${minutes} דקות`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `עודכן לפני ${hours} שעות`;
  return "⚠️ מחיר אינו עדכני";
}

export default function Home() {
  const [listText, setListText] = useState("חלב 3% 1 ליטר\nביצים L 12\nלחם אחיד\nקפה\nאורז 1 ק\"ג\nשמן חמניות 1 ליטר\nטונה 4 יחידות\nגבינה צהובה 400 גרם\nנייר טואלט");
  const [city, setCity] = useState("תל אביב");
  const [maxSupermarkets, setMaxSupermarkets] = useState<1 | 2 | 3 | 4>(3);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCalculate() {
    setLoading(true);
    setError(null);
    setResult(null);
    const items = listText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name, quantity: 1 }));

    try {
      const res = await fetch("/api/cart/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          address: { city },
          maxSupermarkets,
          priority: "CHEAPEST",
        }),
      });
      const data: ApiResponse = await res.json();
      if (!res.ok) {
        setError(data.error || "שגיאה בחישוב הסל");
      } else {
        setResult(data);
      }
    } catch {
      setError("שגיאת תקשורת עם השרת");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <header className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-brand-700">סל חכם</h1>
        <p className="mt-1 text-gray-600">כמה אפשר לחסוך בסל הקניות שלך?</p>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          רשימת הקניות (שורה למוצר)
        </label>
        <textarea
          className="h-40 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          value={listText}
          onChange={(e) => setListText(e.target.value)}
        />

        <label className="mb-1 mt-4 block text-sm font-medium text-gray-700">
          כתובת למשלוח — עיר
        </label>
        <input
          className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />

        <div className="mt-4">
          <span className="mb-2 block text-sm font-medium text-gray-700">
            כמה הזמנות אתה מוכן לבצע?
          </span>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setMaxSupermarkets(n as 1 | 2 | 3 | 4)}
                className={`flex-1 rounded-xl border py-2 text-sm font-medium ${
                  maxSupermarkets === n
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleCalculate}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "מחשב..." : "חשב את הסל הזול ביותר"}
        </button>
      </section>

      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {result && result.total !== null && (
        <section className="mt-6 space-y-4">
          <div className="rounded-2xl bg-white p-5 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-medium text-gray-500">🏆 הסל הזול ביותר</p>
            <p className="mt-1 text-sm text-gray-500">
              {result.supermarkets.length} {result.supermarkets.length === 1 ? "הזמנה" : "הזמנות"}
            </p>

            <div className="mt-3 space-y-1">
              {result.supermarkets.map((s) => (
                <div key={s.id} className="flex justify-between text-sm text-gray-700">
                  <span>{s.name}</span>
                  <span>₪{s.total.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="mt-3 border-t pt-3 text-sm text-gray-500">
              משלוחים: ₪{result.delivery?.toFixed(2)}
            </div>

            <p className="mt-3 text-4xl font-bold text-brand-700">₪{result.total.toFixed(2)}</p>

            {result.savings !== null && result.savings > 0 && (
              <p className="mt-1 text-lg font-semibold text-green-600">
                חיסכון: ₪{result.savings.toFixed(2)} לעומת קנייה ברשת אחת
              </p>
            )}

            {!result.supermarkets.every((s) => s.meetsMinimum) && (
              <p className="mt-2 text-xs text-amber-700">
                ⚠️ בחלק מהרשתות הסכום נמוך ממינימום ההזמנה — המחיר כולל את ההשלמה למינימום.
              </p>
            )}
          </div>

          {result.allSolutions.length > 1 && (
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
              <p className="mb-2 text-sm font-semibold text-gray-700">השוואת תרחישים</p>
              <div className="space-y-1 text-sm">
                {result.allSolutions.map((s) => (
                  <div key={s.numberOfOrders} className="flex justify-between text-gray-600">
                    <span>
                      {s.numberOfOrders} {s.numberOfOrders === 1 ? "רשת" : "רשתות"}
                    </span>
                    <span>₪{s.grandTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
            <p className="mb-2 text-sm font-semibold text-gray-700">פירוט המוצרים</p>
            <div className="space-y-2">
              {result.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-800">{item.productName}</p>
                    <p className="text-xs text-gray-400">
                      {item.supermarket} · {timeAgo(item.updatedAt)}
                    </p>
                  </div>
                  <p className="font-medium text-gray-700">₪{item.lineTotal.toFixed(2)}</p>
                </div>
              ))}
            </div>
          </div>

          {result.unmatchedItems.length > 0 && (
            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-100">
              <p className="font-semibold">לא נמצאה התאמה עבור:</p>
              <ul className="mt-1 list-inside list-disc">
                {result.unmatchedItems.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-center text-xs text-gray-400">
            נתוני הדגמה (DEMO DATA) — לא מחירים אמיתיים מהרשתות.
          </p>
        </section>
      )}
    </main>
  );
}

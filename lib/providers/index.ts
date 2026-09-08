import { SupermarketProvider } from "@/types";
import { createDemoProvider } from "./demoProviderFactory";

// ==== DEMO PROVIDERS ====
// אלה נתוני הדגמה (DEMO DATA) בלבד — אין חיבור אמיתי לרשתות.
// כדי לחבר Provider אמיתי: יש לממש את הממשק SupermarketProvider
// ולשלוף נתונים ממקור רשמי (למשל קבצי המחירון הציבוריים
// שרשתות מחויבות לפרסם לפי חוק שקיפות מחירים), ולא Scraping של אתר הצרכן.

export const ramiLevy = createDemoProvider({
  id: "rami-levy",
  name: "רמי לוי",
  basePriceMultiplier: 0.9, // נתפסת כזולה יחסית
  coverageRatio: 0.85,
  saleRatio: 0.12,
  citiesServed: [], // ארצי
  delivery: { minimumOrder: 150, deliveryPrice: 29, freeDeliveryFrom: 300, serviceFee: 5 },
});

export const shufersal = createDemoProvider({
  id: "shufersal",
  name: "שופרסל",
  basePriceMultiplier: 1.05,
  coverageRatio: 0.95, // כמעט הכל
  saleRatio: 0.18,
  citiesServed: [],
  delivery: { minimumOrder: 200, deliveryPrice: 35, freeDeliveryFrom: 400, serviceFee: 0 },
});

export const yochananof = createDemoProvider({
  id: "yochananof",
  name: "יוחננוף",
  basePriceMultiplier: 0.95,
  coverageRatio: 0.7,
  saleRatio: 0.15,
  citiesServed: [],
  delivery: { minimumOrder: 100, deliveryPrice: 20, freeDeliveryFrom: 250, serviceFee: 0 },
});

export const victory = createDemoProvider({
  id: "victory",
  name: "ויקטורי",
  basePriceMultiplier: 1.0,
  coverageRatio: 0.75,
  saleRatio: 0.2,
  citiesServed: [],
  delivery: { minimumOrder: 120, deliveryPrice: 25, freeDeliveryFrom: 280, serviceFee: 3 },
});

export const carrefour = createDemoProvider({
  id: "carrefour",
  name: "קרפור",
  basePriceMultiplier: 0.88,
  coverageRatio: 0.6, // כיסוי נמוך יותר — רשת חדשה יחסית בישראל
  saleRatio: 0.1,
  citiesServed: [],
  delivery: { minimumOrder: 180, deliveryPrice: 30, freeDeliveryFrom: 350, serviceFee: 0 },
});

export const ALL_PROVIDERS: SupermarketProvider[] = [
  ramiLevy,
  shufersal,
  yochananof,
  victory,
  carrefour,
];

export function getProviderById(id: string): SupermarketProvider | undefined {
  return ALL_PROVIDERS.find((p) => p.id === id);
}

import { describe, it, expect } from "vitest";
import { calculateCart } from "./optimize";
import { SupermarketProvider } from "@/types";

// עוזר ליצירת Provider מבוקר לחלוטין (לא רנדומלי) לצורך בדיקות
function mockProvider(cfg: {
  id: string;
  name: string;
  prices: Record<string, number>;
  delivery: { minimumOrder: number; deliveryPrice: number; freeDeliveryFrom?: number; serviceFee: number };
  available?: boolean;
}): SupermarketProvider {
  return {
    id: cfg.id,
    name: cfg.name,
    isDemo: true,
    async searchProducts() {
      return [];
    },
    async getPrices(productIds: string[]) {
      return productIds
        .filter((id) => cfg.prices[id] !== undefined)
        .map((id) => ({ productId: id, price: cfg.prices[id], updatedAt: new Date().toISOString() }));
    },
    async getPromotions() {
      return [];
    },
    async getDeliveryOptions() {
      return {
        city: "any",
        minimumOrder: cfg.delivery.minimumOrder,
        deliveryPrice: cfg.delivery.deliveryPrice,
        freeDeliveryFrom: cfg.delivery.freeDeliveryFrom,
        serviceFee: cfg.delivery.serviceFee,
        available: cfg.available ?? true,
      };
    },
  };
}

const address = { city: "תל אביב" };
const prefsUnlimited = { maxSupermarkets: 4 as const, allowAlternatives: true, priority: "CHEAPEST" as const };

describe("calculateCart — תרחישי חובה (סעיף 41)", () => {
  it("מוצר אחד ברשת אחת", async () => {
    const a = mockProvider({
      id: "a",
      name: "רשת א",
      prices: { "milk-3-1l-tnuva": 7 },
      delivery: { minimumOrder: 0, deliveryPrice: 10, serviceFee: 0 },
    });
    const result = await calculateCart(
      [{ name: "חלב 3% 1 ליטר תנובה", quantity: 1 }],
      address,
      prefsUnlimited,
      [a]
    );
    expect(result.solutions[0].grandTotal).toBeCloseTo(17); // 7 + 10 משלוח
  });

  it("מספר מוצרים ברשת אחת", async () => {
    const a = mockProvider({
      id: "a",
      name: "רשת א",
      prices: { "milk-3-1l-tnuva": 7, "bread-white": 6 },
      delivery: { minimumOrder: 0, deliveryPrice: 10, serviceFee: 0 },
    });
    const result = await calculateCart(
      [
        { name: "חלב 3% 1 ליטר תנובה", quantity: 1 },
        { name: "לחם אחיד לבן", quantity: 2 },
      ],
      address,
      prefsUnlimited,
      [a]
    );
    // חלב 7 + לחם 2*6=12 + משלוח 10 = 29
    expect(result.solutions[0].grandTotal).toBeCloseTo(29);
  });

  it("פיצול בין מספר רשתות זול יותר גם עם משלוחים", async () => {
    const a = mockProvider({
      id: "a",
      name: "רשת א",
      prices: { "milk-3-1l-tnuva": 10, "bread-white": 10 },
      delivery: { minimumOrder: 0, deliveryPrice: 5, serviceFee: 0 },
    });
    const b = mockProvider({
      id: "b",
      name: "רשת ב",
      prices: { "milk-3-1l-tnuva": 3, "bread-white": 10 },
      delivery: { minimumOrder: 0, deliveryPrice: 5, serviceFee: 0 },
    });
    const result = await calculateCart(
      [
        { name: "חלב 3% 1 ליטר תנובה", quantity: 1 },
        { name: "לחם אחיד לבן", quantity: 1 },
      ],
      address,
      prefsUnlimited,
      [a, b]
    );
    // אופציה 1: הכל ברשת א = 10+10+5 = 25
    // אופציה 2: חלב מ-ב (3) + לחם מ-א (10) + 2 משלוחים (10) = 23 -> זול יותר
    const twoStoreSolution = result.solutions.find((s) => s.numberOfOrders === 2)!;
    expect(twoStoreSolution.grandTotal).toBeCloseTo(23);
    expect(result.solutions[0].grandTotal).toBeLessThanOrEqual(23);
  });

  it("משלוח חינם מעל סכום מסוים", async () => {
    const a = mockProvider({
      id: "a",
      name: "רשת א",
      prices: { "milk-3-1l-tnuva": 350 },
      delivery: { minimumOrder: 0, deliveryPrice: 30, freeDeliveryFrom: 300, serviceFee: 0 },
    });
    const result = await calculateCart(
      [{ name: "חלב 3% 1 ליטר תנובה", quantity: 1 }],
      address,
      prefsUnlimited,
      [a]
    );
    expect(result.solutions[0].allocations[0].deliveryPrice).toBe(0);
    expect(result.solutions[0].grandTotal).toBeCloseTo(350);
  });

  it("מינימום הזמנה — עלות כוללת לא יכולה לרדת מתחת למינימום", async () => {
    const a = mockProvider({
      id: "a",
      name: "רשת א",
      prices: { "milk-3-1l-tnuva": 85 },
      delivery: { minimumOrder: 150, deliveryPrice: 20, serviceFee: 0 },
    });
    const result = await calculateCart(
      [{ name: "חלב 3% 1 ליטר תנובה", quantity: 1 }],
      address,
      prefsUnlimited,
      [a]
    );
    const alloc = result.solutions[0].allocations[0];
    expect(alloc.meetsMinimum).toBe(false);
    expect(alloc.minimumOrderShortfall).toBeCloseTo(65);
    expect(result.solutions[0].grandTotal).toBeCloseTo(170); // 150 (מינימום) + 20 משלוח
  });

  it("מחיר חסר — הרשת לא מוכרת את המוצר, לא מוצעת עבורו", async () => {
    const a = mockProvider({
      id: "a",
      name: "רשת א",
      prices: {},
      delivery: { minimumOrder: 0, deliveryPrice: 10, serviceFee: 0 },
    });
    const result = await calculateCart(
      [{ name: "חלב 3% 1 ליטר תנובה", quantity: 1 }],
      address,
      prefsUnlimited,
      [a]
    );
    expect(result.solutions.length).toBe(0);
  });

  it("מוצר לא קיים בקטלוג כלל — unmatched", async () => {
    const a = mockProvider({
      id: "a",
      name: "רשת א",
      prices: {},
      delivery: { minimumOrder: 0, deliveryPrice: 10, serviceFee: 0 },
    });
    const result = await calculateCart(
      [{ name: "מוצר שלא קיים בכלל 12345", quantity: 1 }],
      address,
      prefsUnlimited,
      [a]
    );
    expect(result.matching[0].matchedProductId).toBeNull();
  });

  it("רשת ללא זמינות משלוח לכתובת לא נכללת", async () => {
    const a = mockProvider({
      id: "a",
      name: "רשת א",
      prices: { "milk-3-1l-tnuva": 7 },
      delivery: { minimumOrder: 0, deliveryPrice: 10, serviceFee: 0 },
      available: false,
    });
    const result = await calculateCart(
      [{ name: "חלב 3% 1 ליטר תנובה", quantity: 1 }],
      address,
      prefsUnlimited,
      [a]
    );
    expect(result.solutions.length).toBe(0);
  });

  it("פיצול ל-4 רשתות לא משתלם בגלל עלויות משלוח", async () => {
    // לכל רשת יש מוצר אחד "זול" משלה (9 ₪ במקום 10) — פיזור מושלם בין 4 הרשתות
    // אכן יחסוך ₪1 לכל מוצר, אבל 4 משלוחים יקרים (25 ₪ כל אחד) הופכים את זה להפסד.
    const cheapItemByProvider: Record<string, string> = {
      a: "milk-3-1l-tnuva",
      b: "bread-white",
      c: "rice-1kg",
      d: "oil-sunflower-1l",
    };
    const allItems = ["milk-3-1l-tnuva", "bread-white", "rice-1kg", "oil-sunflower-1l"];
    const providers = ["a", "b", "c", "d"].map((id) =>
      mockProvider({
        id,
        name: `רשת ${id}`,
        prices: Object.fromEntries(
          allItems.map((item) => [item, item === cheapItemByProvider[id] ? 9 : 10])
        ),
        delivery: { minimumOrder: 0, deliveryPrice: 25, serviceFee: 0 }, // משלוח יקר
      })
    );
    const result = await calculateCart(
      [
        { name: "חלב 3% 1 ליטר תנובה", quantity: 1 },
        { name: "לחם אחיד לבן", quantity: 1 },
        { name: "אורז לבן 1 ק\"ג", quantity: 1 },
        { name: "שמן חמניות 1 ליטר", quantity: 1 },
      ],
      address,
      prefsUnlimited,
      providers
    );
    const oneStore = result.solutions.find((s) => s.numberOfOrders === 1)!;
    const fourStores = result.solutions.find((s) => s.numberOfOrders === 4)!;
    expect(oneStore.grandTotal).toBeLessThan(fourStores.grandTotal);
  });
});

import {
  Address,
  CartCalculationResult,
  CartRequestItem,
  CartSolution,
  MatchedLineItem,
  StoreAllocation,
  SupermarketProvider,
  UserPreferences,
} from "@/types";
import { matchLineItem } from "../matching/match";

interface ResolvedItem {
  requestedName: string;
  quantity: number;
  productId: string;
  productName: string;
}

/**
 * אלגוריתם האופטימיזציה (סעיפים 12-13-14, 30).
 *
 * גישה: לכל תת-קבוצה של רשתות (עד maxSupermarkets רשתות), כל מוצר מוקצה
 * לרשת הזולה ביותר בתוך אותה תת-קבוצה שמוכרת אותו — זו הקצאה אופטימלית
 * לעלות המוצרים הנתונה תת-הקבוצה הקבועה. לאחר מכן מחשבים משלוחים,
 * דמי שירות ואפקט מינימום הזמנה, ובוחרים את תת-הקבוצה הזולה ביותר.
 *
 * עם 5 ספקי-דמו זו בדיקה ישירה של כל תת-הקבוצות (2^5-1 = 31) — ריצה מיידית.
 * בפרויקט אמיתי עם עשרות רשתות יש לעבור ל-Branch and Bound / ILP,
 * כדי לא לבדוק את כל תת-הקבוצות באופן נאיבי (ראו README, סעיף "המשך פיתוח").
 */
export async function calculateCart(
  requestItems: CartRequestItem[],
  address: Address,
  preferences: UserPreferences,
  providers: SupermarketProvider[]
): Promise<CartCalculationResult> {
  // --- שלב 1: התאמת מוצרים (Matching) ---
  const matching: MatchedLineItem[] = [];
  const resolvedItems: ResolvedItem[] = [];

  for (const item of requestItems) {
    const { best, candidates, isAmbiguous } = matchLineItem(item.name);
    matching.push({
      requestedName: item.name,
      quantity: item.quantity,
      matchedProductId: best?.id ?? null,
      matchedProductName: best?.name,
      candidates: isAmbiguous ? candidates : undefined,
    });
    if (best) {
      resolvedItems.push({
        requestedName: item.name,
        quantity: item.quantity,
        productId: best.id,
        productName: best.name,
      });
    }
  }

  const unmatchedItems = matching.filter((m) => !m.matchedProductId).map((m) => m.requestedName);

  if (resolvedItems.length === 0) {
    return { solutions: [], bestSingleStore: null, savingsVsSingleStore: null, matching };
  }

  const productIds = resolvedItems.map((r) => r.productId);

  // --- שלב 2: שליפת מחירים ומשלוחים מכל Provider ---
  const priceMaps = new Map<string, Map<string, { price: number; isOnSale?: boolean; updatedAt: string }>>();
  const deliveryMap = new Map<string, Awaited<ReturnType<SupermarketProvider["getDeliveryOptions"]>>>();

  await Promise.all(
    providers.map(async (provider) => {
      const [prices, delivery] = await Promise.all([
        provider.getPrices(productIds),
        provider.getDeliveryOptions(address),
      ]);
      const map = new Map<string, { price: number; isOnSale?: boolean; updatedAt: string }>();
      for (const pr of prices) {
        map.set(pr.productId, { price: pr.price, isOnSale: pr.isOnSale, updatedAt: pr.updatedAt });
      }
      priceMaps.set(provider.id, map);
      deliveryMap.set(provider.id, delivery);
    })
  );

  // רק ספקים שבאמת מספקים לכתובת
  const availableProviders = providers.filter((pr) => deliveryMap.get(pr.id)?.available);

  // --- שלב 3: בניית כל תת-הקבוצות האפשריות של רשתות ---
  function subsetsOfSize(arr: SupermarketProvider[], maxSize: number): SupermarketProvider[][] {
    const result: SupermarketProvider[][] = [];
    const n = arr.length;
    for (let mask = 1; mask < 1 << n; mask++) {
      const bits = mask.toString(2).split("").filter((b) => b === "1").length;
      if (bits > maxSize) continue;
      const subset: SupermarketProvider[] = [];
      for (let i = 0; i < n; i++) {
        if (mask & (1 << i)) subset.push(arr[i]);
      }
      result.push(subset);
    }
    return result;
  }

  function buildAllocationForSubset(subset: SupermarketProvider[]): CartSolution | null {
    const perStoreItems = new Map<string, StoreAllocation["items"]>();
    for (const provider of subset) perStoreItems.set(provider.id, []);

    for (const item of resolvedItems) {
      // מוצאים את הרשת הזולה ביותר בתת-הקבוצה שבאמת מוכרת את המוצר הזה
      let bestProvider: SupermarketProvider | null = null;
      let bestPrice = Infinity;
      let bestMeta: { price: number; isOnSale?: boolean; updatedAt: string } | null = null;

      for (const provider of subset) {
        const entry = priceMaps.get(provider.id)?.get(item.productId);
        if (!entry) continue;
        if (entry.price < bestPrice) {
          bestPrice = entry.price;
          bestProvider = provider;
          bestMeta = entry;
        }
      }

      if (!bestProvider || !bestMeta) {
        // אף רשת בתת-הקבוצה הזו לא מוכרת את המוצר => תת-הקבוצה לא ישימה למלא את כל הסל
        return null;
      }

      perStoreItems.get(bestProvider.id)!.push({
        productId: item.productId,
        productName: item.productName,
        unitPrice: bestMeta.price,
        quantity: item.quantity,
        lineTotal: Math.round(bestMeta.price * item.quantity * 100) / 100,
        isOnSale: bestMeta.isOnSale,
        updatedAt: bestMeta.updatedAt,
      });
    }

    const allocations: StoreAllocation[] = [];
    for (const provider of subset) {
      const items = perStoreItems.get(provider.id)!;
      if (items.length === 0) continue; // רשת שבסוף לא קיבלה שום מוצר בהקצאה הזו
      const delivery = deliveryMap.get(provider.id)!;
      const productsSubtotal = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
      const meetsMinimum = productsSubtotal >= delivery.minimumOrder;
      const effectiveSubtotal = Math.max(productsSubtotal, delivery.minimumOrder);
      const freeDelivery =
        delivery.freeDeliveryFrom !== undefined && effectiveSubtotal >= delivery.freeDeliveryFrom;
      const deliveryPrice = freeDelivery ? 0 : delivery.deliveryPrice;

      allocations.push({
        supermarketId: provider.id,
        supermarketName: provider.name,
        items,
        productsSubtotal,
        deliveryPrice,
        serviceFee: delivery.serviceFee,
        minimumOrder: delivery.minimumOrder,
        minimumOrderShortfall: Math.max(0, Math.round((delivery.minimumOrder - productsSubtotal) * 100) / 100),
        meetsMinimum,
        totalForThisStore:
          Math.round((effectiveSubtotal + deliveryPrice + delivery.serviceFee) * 100) / 100,
      });
    }

    if (allocations.length === 0) return null;

    const productsTotal = Math.round(allocations.reduce((s, a) => s + a.productsSubtotal, 0) * 100) / 100;
    const deliveryTotal = Math.round(
      allocations.reduce((s, a) => s + a.deliveryPrice + a.serviceFee, 0) * 100
    ) / 100;
    const minimumOrderExtra = Math.round(
      allocations.reduce((s, a) => s + Math.max(0, a.minimumOrder - a.productsSubtotal), 0) * 100
    ) / 100;
    const grandTotal = Math.round((productsTotal + deliveryTotal + minimumOrderExtra) * 100) / 100;

    return {
      label: `${allocations.length} ${allocations.length === 1 ? "רשת" : "רשתות"}`,
      allocations,
      numberOfOrders: allocations.length,
      productsTotal,
      deliveryTotal: Math.round((deliveryTotal + minimumOrderExtra) * 100) / 100,
      grandTotal,
      unmatchedItems,
    };
  }

  // --- שלב 4: מציאת הפתרון הזול ביותר לכל גודל תת-קבוצה (1..4), לצורך השוואה (סעיף 21) ---
  const maxPossible = Math.min(4, availableProviders.length);
  const bestPerSize = new Map<number, CartSolution>();

  for (let size = 1; size <= maxPossible; size++) {
    const subsets = subsetsOfSize(availableProviders, size).filter((s) => s.length === size);
    let best: CartSolution | null = null;
    for (const subset of subsets) {
      const solution = buildAllocationForSubset(subset);
      if (!solution) continue;
      if (!best || solution.grandTotal < best.grandTotal) best = solution;
    }
    if (best) bestPerSize.set(size, best);
  }

  const solutions = Array.from(bestPerSize.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([size, sol]) => ({
      ...sol,
      label:
        size === 1
          ? "הכי נוח — רשת אחת"
          : size === bestPerSize.size
          ? "הכי זול"
          : `פיצול ל-${size} רשתות`,
    }))
    .filter((s) => s.numberOfOrders <= preferences.maxSupermarkets)
    .sort((a, b) => a.grandTotal - b.grandTotal);

  const bestSingleStore = bestPerSize.get(1) ?? null;
  const cheapestOverall = solutions[0] ?? null;
  const savingsVsSingleStore =
    bestSingleStore && cheapestOverall
      ? Math.round((bestSingleStore.grandTotal - cheapestOverall.grandTotal) * 100) / 100
      : null;

  return {
    solutions,
    bestSingleStore,
    savingsVsSingleStore,
    matching,
  };
}

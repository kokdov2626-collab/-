import {
  Address,
  DemoProductDef,
  ProviderDeliveryOption,
  ProviderPrice,
  ProviderPromotion,
  SupermarketProvider,
} from "@/types";
import { CATALOG } from "./catalog";

// --- כלי עזר דטרמיניסטי (אותה תוצאה בכל הרצה, כדי ש-tests יהיו יציבים) ---
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (h % 1000) / 1000; // 0..1
}

export interface DemoProviderConfig {
  id: string;
  name: string;
  basePriceMultiplier: number; // רשת "יקרה" יותר / "זולה" יותר בממוצע
  coverageRatio: number;       // איזה אחוז מהקטלוג הרשת הזו בכלל מוכרת (לא כל רשת מוכרת הכל)
  saleRatio: number;           // אחוז מהמוצרים שבמבצע
  citiesServed: string[];      // ריקה = משרתת הכל
  delivery: {
    minimumOrder: number;
    deliveryPrice: number;
    freeDeliveryFrom?: number;
    serviceFee: number;
  };
}

function buildCatalogSubset(cfg: DemoProviderConfig): DemoProductDef[] {
  return CATALOG.filter((product) => seededRandom(cfg.id + product.id) < cfg.coverageRatio);
}

export function createDemoProvider(cfg: DemoProviderConfig): SupermarketProvider {
  const subset = buildCatalogSubset(cfg);
  const subsetIds = new Set(subset.map((p) => p.id));

  return {
    id: cfg.id,
    name: cfg.name,
    isDemo: true,

    async searchProducts(query: string): Promise<DemoProductDef[]> {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return subset.filter((product) => {
        const haystack = [product.name, ...(product.keywords || [])].join(" ").toLowerCase();
        return haystack.includes(q) || product.keywords.some((k) => q.includes(k.toLowerCase()));
      });
    },

    async getPrices(productIds: string[]): Promise<ProviderPrice[]> {
      const now = Date.now();
      const results: ProviderPrice[] = [];
      for (const id of productIds) {
        if (!subsetIds.has(id)) continue; // הרשת הזו לא מוכרת את המוצר
        const base = 3 + seededRandom(cfg.id + id + "base") * 40; // מחיר בסיס דמו 3-43 ₪
        const price = Math.round(base * cfg.basePriceMultiplier * 100) / 100;
        const onSale = seededRandom(cfg.id + id + "sale") < cfg.saleRatio;
        const regularPrice = onSale ? Math.round(price * 1.2 * 100) / 100 : undefined;
        // "עודכן" בין 0 ל-6 שעות אחורה, כדי שיהיה מה להציג כ"עודכן לפני X"
        const minutesAgo = Math.floor(seededRandom(cfg.id + id + "time") * 360);
        results.push({
          productId: id,
          price: onSale ? price : price,
          regularPrice,
          isOnSale: onSale,
          updatedAt: new Date(now - minutesAgo * 60_000).toISOString(),
        });
      }
      return results;
    },

    async getPromotions(): Promise<ProviderPromotion[]> {
      return subset
        .filter((product) => seededRandom(cfg.id + product.id + "promo") < cfg.saleRatio * 0.5)
        .map((product) => ({
          productId: product.id,
          type: "מבצע זמני",
          description: `${product.name} — מבצע לזמן מוגבל`,
        }));
    },

    async getDeliveryOptions(address: Address): Promise<ProviderDeliveryOption> {
      const available =
        cfg.citiesServed.length === 0 ||
        cfg.citiesServed.some((c) => c === address.city || address.city?.includes(c));
      return {
        city: address.city,
        minimumOrder: cfg.delivery.minimumOrder,
        deliveryPrice: cfg.delivery.deliveryPrice,
        freeDeliveryFrom: cfg.delivery.freeDeliveryFrom,
        serviceFee: cfg.delivery.serviceFee,
        available,
      };
    },
  };
}

// טיפוסים משותפים למערכת "סל חכם"

export interface Address {
  city: string;
  street?: string;
  number?: string;
  zip?: string;
}

export interface DemoProductDef {
  id: string;          // מזהה קנוני של המוצר (משותף בין הרשתות)
  name: string;        // שם תצוגה, למשל "חלב 3% 1 ליטר תנובה"
  category: string;
  brand?: string;
  size?: number;
  unit?: string;       // גרם / מ"ל / יחידה
  barcode?: string;
  keywords: string[];  // מילות מפתח להתאמה (matching)
}

export interface ProviderPrice {
  productId: string;   // מתייחס ל-DemoProductDef.id
  price: number;
  regularPrice?: number;
  isOnSale?: boolean;
  updatedAt: string;    // ISO timestamp
}

export interface ProviderPromotion {
  productId: string;
  type: string;
  description: string;
}

export interface ProviderDeliveryOption {
  city: string;
  minimumOrder: number;
  deliveryPrice: number;
  freeDeliveryFrom?: number;
  serviceFee: number;
  available: boolean;
}

export interface SupermarketProvider {
  id: string;           // מזהה קבוע, למשל "rami-levy"
  name: string;         // שם תצוגה
  isDemo: boolean;

  searchProducts(query: string): Promise<DemoProductDef[]>;
  getPrices(productIds: string[]): Promise<ProviderPrice[]>;
  getPromotions(): Promise<ProviderPromotion[]>;
  getDeliveryOptions(address: Address): Promise<ProviderDeliveryOption>;
}

// --- קלט/פלט לאלגוריתם ---

export interface CartRequestItem {
  name: string;
  quantity: number;
}

export interface UserPreferences {
  maxSupermarkets: 1 | 2 | 3 | 4;
  allowAlternatives: boolean;
  priority: "CHEAPEST" | "BALANCED" | "CONVENIENCE";
}

export interface MatchedLineItem {
  requestedName: string;
  quantity: number;
  matchedProductId: string | null; // null = לא נמצאה התאמה
  matchedProductName?: string;
  candidates?: DemoProductDef[]; // כאשר יש כמה אפשרויות — למסך אישור (סעיף 4)
}

export interface StoreAllocation {
  supermarketId: string;
  supermarketName: string;
  items: {
    productId: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    isOnSale?: boolean;
    updatedAt: string;
  }[];
  productsSubtotal: number;
  deliveryPrice: number;
  serviceFee: number;
  minimumOrder: number;
  minimumOrderShortfall: number; // אם productsSubtotal < minimumOrder, כמה חסר
  meetsMinimum: boolean;
  totalForThisStore: number; // productsSubtotal + deliveryPrice + serviceFee (רק אם meetsMinimum)
}

export interface CartSolution {
  label: string; // "הכי זול" / "מאוזן" / "הכי נוח" וכו'
  allocations: StoreAllocation[];
  numberOfOrders: number;
  productsTotal: number;
  deliveryTotal: number;
  grandTotal: number;
  unmatchedItems: string[];
}

export interface CartCalculationResult {
  solutions: CartSolution[]; // ממוינים לפי grandTotal
  bestSingleStore: CartSolution | null;
  savingsVsSingleStore: number | null;
  matching: MatchedLineItem[];
}

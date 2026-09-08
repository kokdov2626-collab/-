import { NextRequest, NextResponse } from "next/server";
import { calculateCart } from "@/lib/algorithm/optimize";
import { ALL_PROVIDERS } from "@/lib/providers";
import { Address, CartRequestItem, UserPreferences } from "@/types";

export async function POST(req: NextRequest) {
  let body: {
    items?: CartRequestItem[];
    address?: Address;
    maxSupermarkets?: 1 | 2 | 3 | 4;
    allowAlternatives?: boolean;
    priority?: UserPreferences["priority"];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "גוף הבקשה אינו JSON תקין" }, { status: 400 });
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "יש לשלוח items - רשימת קניות" }, { status: 400 });
  }
  if (!body.address || !body.address.city) {
    return NextResponse.json({ error: "יש לשלוח address עם city לפחות" }, { status: 400 });
  }

  const preferences: UserPreferences = {
    maxSupermarkets: body.maxSupermarkets ?? 3,
    allowAlternatives: body.allowAlternatives ?? true,
    priority: body.priority ?? "CHEAPEST",
  };

  const result = await calculateCart(body.items, body.address, preferences, ALL_PROVIDERS);

  const best = result.solutions[0] ?? null;

  return NextResponse.json({
    total: best?.grandTotal ?? null,
    savings: result.savingsVsSingleStore,
    supermarkets: best?.allocations.map((a) => ({
      id: a.supermarketId,
      name: a.supermarketName,
      productsSubtotal: a.productsSubtotal,
      deliveryPrice: a.deliveryPrice,
      serviceFee: a.serviceFee,
      minimumOrder: a.minimumOrder,
      meetsMinimum: a.meetsMinimum,
      total: a.totalForThisStore,
    })) ?? [],
    items: best?.allocations.flatMap((a) =>
      a.items.map((i) => ({ ...i, supermarket: a.supermarketName }))
    ) ?? [],
    delivery: best?.deliveryTotal ?? null,
    allSolutions: result.solutions,
    matching: result.matching,
    unmatchedItems: result.solutions[0]?.unmatchedItems ?? [],
  });
}

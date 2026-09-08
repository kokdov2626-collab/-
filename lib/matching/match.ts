import { DemoProductDef } from "@/types";
import { CATALOG } from "../providers/catalog";

// מנרמל טקסט עברי בסיסי: מסיר גרשיים, מאחד רווחים, אותיות קטנות
function normalize(text: string): string {
  return text
    .replace(/["'\u05f3\u05f4]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tokenize(text: string): string[] {
  return normalize(text).split(" ").filter(Boolean);
}

/**
 * מחזיר רשימת מועמדים למוצר שהמשתמש הקליד, ממוינים מהטוב ביותר.
 * חשוב: לא מבצע Fuzzy meaning-based matching — רק התאמת מילות מפתח.
 * ההבחנה בין "חלב 1 ליטר" ל"חלב 2 ליטר" נשמרת כי הגדלים הם מילות מפתח נפרדות.
 */
export function findCandidates(query: string, limit = 5): { product: DemoProductDef; score: number }[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scored = CATALOG.map((product) => {
    const productTokens = new Set(
      tokenize([product.name, ...(product.keywords || [])].join(" "))
    );
    let matches = 0;
    for (const token of queryTokens) {
      if (productTokens.has(token)) matches += 1;
      // התאמה חלקית (למשל "1kg" מול "1 קג") — בונוס קטן, לא מספיק כדי לבלבל בין גדלים.
      // דורש אורך מינימלי של 2 בשני הצדדים, כדי שטוקן קצר (כמו "1") לא "יתפוס" כל מספר.
      else if (
        token.length >= 2 &&
        [...productTokens].some((t) => t.length >= 2 && (t.includes(token) || token.includes(t)))
      ) {
        matches += 0.4;
      }
    }
    const score = matches / queryTokens.length;
    return { product, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * מחזיר את ההתאמה הטובה ביותר, ואת שאר המועמדים להצגה כאלטרנטיבות (סעיף 4-5).
 * אם אין שום התאמה — מחזיר null (המוצר לא ימצא, ויוצג כ"לא נמצא" ולא כניחוש שגוי).
 */
export function matchLineItem(query: string): {
  best: DemoProductDef | null;
  candidates: DemoProductDef[];
  isAmbiguous: boolean;
} {
  const ranked = findCandidates(query);
  const MIN_SCORE = 0.5; // לפחות מחצית ממילות החיפוש חייבות להתאים ממש, אחרת אין להמציא התאמה
  if (ranked.length === 0 || ranked[0].score < MIN_SCORE) {
    return { best: null, candidates: [], isAmbiguous: false };
  }
  const topScore = ranked[0].score;
  // כמה מועמדים מקבלים ציון קרוב לראשון => מצב עמום, יש להציג למשתמש (סעיף 4)
  const close = ranked.filter((r) => r.score >= topScore - 0.15);
  return {
    best: ranked[0].product,
    candidates: ranked.map((r) => r.product),
    isAmbiguous: close.length > 1,
  };
}

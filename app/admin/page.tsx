import { ALL_PROVIDERS } from "@/lib/providers";
import { CATALOG } from "@/lib/providers/catalog";

export const metadata = { title: "סל חכם — ניהול" };

export default function AdminDashboard() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-brand-700">לוח בקרה — Admin</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="מוצרים בקטלוג" value={CATALOG.length} />
        <StatCard label="רשתות (Providers)" value={ALL_PROVIDERS.length} />
        <StatCard label="Providers פעילים" value={ALL_PROVIDERS.length} />
        <StatCard label="Providers עם שגיאות" value={0} />
      </div>

      <h2 className="mb-3 text-lg font-semibold text-gray-800">ניטור Providers</h2>
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="px-4 py-2 font-medium">רשת</th>
              <th className="px-4 py-2 font-medium">סטטוס</th>
              <th className="px-4 py-2 font-medium">סוג נתונים</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ALL_PROVIDERS.map((provider) => (
              <tr key={provider.id}>
                <td className="px-4 py-2">{provider.name}</td>
                <td className="px-4 py-2 text-green-600">✓ OK</td>
                <td className="px-4 py-2">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                    נתוני הדגמה
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-gray-400">
        לוח זה מציג נתונים מהזיכרון (Demo Providers) בלבד. לאחר חיבור מסד הנתונים והרצת ה-Scheduler,
        הלוח יציג נתונים אמיתיים מהטבלאות Price / ProviderLog.
      </p>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-100">
      <p className="text-2xl font-bold text-brand-700">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{label}</p>
    </div>
  );
}

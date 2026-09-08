import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "סל חכם — השוואת מחירי סופרמרקטים",
  description: "מנוע אופטימיזציה לסל קניות: כמה אפשר לחסוך כשמפצלים בין רשתות?",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="min-h-screen text-gray-900 antialiased">{children}</body>
    </html>
  );
}

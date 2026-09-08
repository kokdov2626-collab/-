import { PrismaClient } from "@prisma/client";
import { ALL_PROVIDERS } from "../lib/providers";

const prisma = new PrismaClient();

async function main() {
  for (const provider of ALL_PROVIDERS) {
    await prisma.supermarket.upsert({
      where: { name: provider.name },
      update: { active: true, isDemo: true },
      create: { name: provider.name, active: true, isDemo: true },
    });
  }
  console.log(`נזרעו ${ALL_PROVIDERS.length} רשתות (Supermarket) — נתוני הדגמה.`);
  console.log(
    "שים לב: זהו זרע התחלתי בלבד. הקצאת מחירים בפועל בשלב ה-MVP הנוכחי מתבצעת בזיכרון " +
      "דרך lib/providers, לא דרך המסד. חיבור מלא של Product/Price למסד הוא השלב הבא."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

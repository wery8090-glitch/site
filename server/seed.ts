import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { clientVersions, subscriptionPlans, subscriptions, users } from "../drizzle/schema";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for seed");
  const db = drizzle(process.env.DATABASE_URL);
  const now = new Date();
  const demoEnd = new Date(now);
  demoEnd.setDate(demoEnd.getDate() + 30);

  await db.insert(subscriptionPlans).values([
    { name: "FREE", slug: "free", description: "Basic Chroma access after registration.", price: 0, currency: "RUB", durationDays: 36500, deviceLimit: 1, features: JSON.stringify(["Basic features", "Access after registration", "Client download access"]), active: true },
    { name: "BASE", slug: "base", description: "A focused starting point for the visual client.", price: 10000, currency: "RUB", durationDays: 30, deviceLimit: 1, features: JSON.stringify(["Full visual client", "1 device", "Core updates"]), active: true },
    { name: "PREMIUM", slug: "premium", description: "The complete Chroma experience for focused play.", price: 20000, currency: "RUB", durationDays: 30, deviceLimit: 2, features: JSON.stringify(["Full visual client", "2 devices", "Performance profiles", "Priority updates"]), active: true },
    { name: "PREMIUM + BETA", slug: "premium_beta", description: "Early access to updates and new features.", price: 29000, currency: "RUB", durationDays: 30, deviceLimit: 3, features: JSON.stringify(["Everything in Premium", "3 devices", "Early access", "Extended support"]), active: true },
  ]).onDuplicateKeyUpdate({ set: { updatedAt: now } });

  await db.insert(users).values({ openId: "seed-demo-user", username: "chroma-demo", name: "Chroma Demo", email: "demo@chroma.local", loginMethod: "seed", role: "user", status: "active" }).onDuplicateKeyUpdate({ set: { name: "Chroma Demo", updatedAt: now } });
  const demo = (await db.select().from(users).where(eq(users.openId, "seed-demo-user")).limit(1))[0];
  const premium = (await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.slug, "premium")).limit(1))[0];
  if (demo && premium) await db.insert(subscriptions).values({ userId: demo.id, planId: premium.id, status: "active", startsAt: now, endsAt: demoEnd, provider: "Manual", adminNote: "Development seed subscription" });
  await db.insert(clientVersions).values({ version: "0.1.0", minecraftVersion: "1.21.x", fileKey: "releases/chroma-client-0.1.0.jar", fileName: "chroma-client-0.1.0.jar", releaseNotes: "Foundation release placeholder. Publish a real artifact before enabling downloads.", isLatest: true, active: false });
  console.log("Chroma development seed complete.");
}

main().catch(error => { console.error(error); process.exit(1); });

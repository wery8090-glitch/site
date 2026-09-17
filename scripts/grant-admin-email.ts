import "dotenv/config";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";

const email = "wery8090@gmail.com";
const db = await getDb();
if (!db) throw new Error("DATABASE_URL is not configured");
const result = await db.update(users).set({ role: "admin", status: "active" }).where(eq(users.email, email));
console.log(JSON.stringify({ email, updatedRows: result[0].affectedRows }));

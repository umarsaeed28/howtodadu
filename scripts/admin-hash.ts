/**
 * Make the ADMIN_PASSWORD_HASH value for production.
 *
 *   npx tsx scripts/admin-hash.ts
 *
 * Reads the password from the terminal (not from an argument, so it never lands in shell history) and prints the
 * hash to paste into the environment, along with a fresh ADMIN_SESSION_SECRET.
 */
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { hashPassword } from "../src/lib/admin/auth";

async function main() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = await rl.question("Admin password: ");
  rl.close();
  if (password.length < 8) throw new Error("Use at least 8 characters.");
  console.log(`ADMIN_PASSWORD_HASH=${hashPassword(password)}`);
  console.log(`ADMIN_SESSION_SECRET=${randomBytes(32).toString("base64url")}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });

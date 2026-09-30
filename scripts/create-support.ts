/**
 * Creates (or resets the password of) the hidden developer/support account.
 *   SUPPORT_EMAIL=you@example.com npm run support:create
 * With no SUPPORT_PASSWORD a strong random one is generated and written to .support-credentials.txt
 * (ignored by git) - read it, store it in your password manager, delete the file.
 * The account has full access, does not appear on the Staff pages and cannot be edited from the dashboard.
 */
import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = (process.env.SUPPORT_EMAIL || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Set SUPPORT_EMAIL, for example: SUPPORT_EMAIL=you@example.com npm run support:create");
  let password = process.env.SUPPORT_PASSWORD || "";
  const generated = !password;
  if (generated) password = crypto.randomBytes(18).toString("base64url");
  if (password.length < 12) throw new Error("SUPPORT_PASSWORD must be at least 12 characters");

  const taken = await db.user.findUnique({ where: { email } });
  if (taken && !taken.hidden) throw new Error("That email already belongs to a normal staff account. Use a different one.");
  // there is only ever one hidden account: re-running with another email moves it to that email
  const clash = taken ?? (await db.user.findFirst({ where: { hidden: true } }));
  const passwordHash = await bcrypt.hash(password, 11);
  if (clash) {
    await db.user.update({ where: { id: clash.id }, data: { email, passwordHash, active: true, failedLogins: 0, lockedUntil: null, sessionVersion: { increment: 1 } } });
    console.log("Support account updated:", email);
  } else {
    await db.user.create({ data: { email, name: "Support", passwordHash, hidden: true, active: true } });
    console.log("Support account created:", email);
  }
  if (generated) {
    fs.writeFileSync(".support-credentials.txt", `email: ${email}\npassword: ${password}\n`, { mode: 0o600 });
    console.log("Password written to .support-credentials.txt (not shown here). Store it safely, then delete the file.");
  }
}

main().catch((e) => { console.error(e.message); process.exit(1); }).finally(() => db.$disconnect());

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audit, staffWith } from "@/lib/auth";
import { auditWhere } from "@/lib/audit-query";

export const dynamic = "force-dynamic";

/** Spreadsheet formulas in exported cells could run when the file is opened, so neutralise them. */
const cell = (v: unknown) => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function GET(req: Request) {
  const u = await staffWith("audit.view");
  if (!u) return new NextResponse("Not found", { status: 404 });
  const p = new URL(req.url).searchParams;
  const rows = await db.auditLog.findMany({
    where: auditWhere({ q: p.get("q") ?? undefined, cat: p.get("cat") ?? undefined, level: p.get("level") ?? undefined, user: p.get("user") ?? undefined, from: p.get("from") ?? undefined, to: p.get("to") ?? undefined }),
    orderBy: { createdAt: "desc" },
    take: 10000,
  });
  await audit(u, "audit.export", "audit", undefined, { rows: rows.length }, `${u.name} exported ${rows.length} activity log rows to CSV`, { category: "security" });
  const head = ["time", "user", "category", "level", "summary", "action", "entity", "entity_id", "ip", "data"];
  const body = rows.map((r) => [r.createdAt.toISOString(), r.userName, r.category, r.level, r.summary, r.action, r.entity, r.entityId, r.ip, r.meta ? JSON.stringify(r.meta) : ""].map(cell).join(","));
  return new NextResponse("﻿" + [head.join(","), ...body].join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="activity-log-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

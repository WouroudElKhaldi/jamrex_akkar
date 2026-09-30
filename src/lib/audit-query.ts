import "server-only";
import type { Prisma } from "@prisma/client";
import { LOG_CATEGORIES } from "@/lib/audit";

export type LogFilters = { q?: string; cat?: string; level?: string; user?: string; from?: string; to?: string };

/** Turns the URL filters of the Activity log into a Prisma query (used by the page and the CSV export). */
export function auditWhere(f: LogFilters): Prisma.AuditLogWhereInput {
  const and: Prisma.AuditLogWhereInput[] = [{ hidden: false }];
  const q = f.q?.trim();
  if (q) {
    and.push({
      OR: [
        { summary: { contains: q, mode: "insensitive" } },
        { action: { contains: q, mode: "insensitive" } },
        { userName: { contains: q, mode: "insensitive" } },
        { entityId: { contains: q } },
        { ip: { contains: q } },
      ],
    });
  }
  if (f.cat && (LOG_CATEGORIES as readonly string[]).includes(f.cat)) and.push({ category: f.cat });
  if (f.level && ["info", "warn", "error"].includes(f.level)) and.push({ level: f.level });
  if (f.user) and.push({ userName: f.user });
  const from = f.from ? new Date(f.from + "T00:00:00") : null;
  const to = f.to ? new Date(f.to + "T23:59:59.999") : null;
  if (from && !Number.isNaN(from.getTime())) and.push({ createdAt: { gte: from } });
  if (to && !Number.isNaN(to.getTime())) and.push({ createdAt: { lte: to } });
  return { AND: and };
}

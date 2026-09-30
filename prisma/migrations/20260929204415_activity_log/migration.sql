-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'system',
ADD COLUMN     "ip" TEXT,
ADD COLUMN     "level" TEXT NOT NULL DEFAULT 'info',
ADD COLUMN     "summary" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_level_idx" ON "AuditLog"("level");

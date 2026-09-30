-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "AuditLog_hidden_idx" ON "AuditLog"("hidden");

-- Fase 4: lembretes, link de gestão da reserva e limite de requisições.
ALTER TABLE "Booking" ADD COLUMN "manageToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text;
ALTER TABLE "Booking" ADD COLUMN "reminderSentAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Booking_manageToken_key" ON "Booking"("manageToken");
CREATE INDEX "Booking_status_reminderSentAt_startsAt_idx" ON "Booking"("status", "reminderSentAt", "startsAt");

CREATE TABLE "RateLimitHit" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RateLimitHit_key_createdAt_idx" ON "RateLimitHit"("key", "createdAt");

-- Colunas DateTime do Prisma são timestamp (UTC), por isso tsrange.
-- Impede dois agendamentos ativos sobrepostos para o mesmo profissional.
-- A garantia fica no banco: vale mesmo com requisições simultâneas.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "staffId" WITH =,
    tsrange("startsAt", "endsAt", '[)') WITH &&
  )
  WHERE ("status" IN ('PENDING', 'CONFIRMED'));

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_valid_range CHECK ("endsAt" > "startsAt");

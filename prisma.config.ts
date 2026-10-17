import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // `prisma generate` (rodado no postinstall) não conecta ao banco, então não exige a variável.
    // Migrações e o app em si falham com erro de conexão claro se a URL real faltar.
    url: process.env.DATABASE_URL ?? "postgresql://sem-url-configurada@localhost:5432/sem_banco",
  },
});

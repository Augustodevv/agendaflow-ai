import { execSync } from "node:child_process";

// Zera os contadores de limite de tentativas: todas as rodadas de teste vêm do mesmo IP.
export default function globalSetup() {
  execSync("npx prisma db execute --stdin --schema prisma/schema.prisma", { input: 'DELETE FROM "RateLimitHit";', stdio: ["pipe", "ignore", "inherit"] });
}

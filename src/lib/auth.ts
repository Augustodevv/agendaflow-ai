import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { resolveAuthSecret } from "@/lib/auth-secret";
import { appUrl } from "@/lib/app-url";
import { db } from "@/lib/db";

export const auth = betterAuth({
  secret: resolveAuthSecret(),
  baseURL: appUrl(),
  trustedOrigins: [appUrl()],
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Recuperação de senha: o envio real de e-mail entra quando o provedor for configurado.
    sendResetPassword: async ({ user, url }) => {
      console.info(`[auth] link de recuperação para ${user.email}: ${url}`);
    },
  },
  plugins: [nextCookies()],
});

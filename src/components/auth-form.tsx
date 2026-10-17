"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(undefined);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const result =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name: String(form.get("name")) })
        : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) {
      setError(mode === "login" ? "E-mail ou senha incorretos." : (result.error.message ?? "Não foi possível criar a conta."));
      return;
    }
    router.push("/painel");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-semibold">{mode === "login" ? "Entrar" : "Criar conta"}</h1>
      {mode === "signup" && <Field id="name" label="Seu nome" required autoComplete="name" />}
      <Field id="email" label="E-mail" type="email" required autoComplete="email" />
      <Field
        id="password"
        label="Senha"
        type="password"
        required
        minLength={8}
        autoComplete={mode === "login" ? "current-password" : "new-password"}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
      </Button>
      <p className="text-sm text-muted">
        {mode === "login" ? (
          <>
            Ainda não tem conta? <Link href="/cadastro" className="text-brand underline">Cadastre-se</Link>
          </>
        ) : (
          <>
            Já tem conta? <Link href="/entrar" className="text-brand underline">Entrar</Link>
          </>
        )}
      </p>
    </form>
  );
}

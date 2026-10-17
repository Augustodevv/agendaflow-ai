import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createOrganizationForUser } from "@/modules/organizations/service";

const email = `t-org-${Date.now()}@example.com`;

afterAll(async () => {
  await db.organization.deleteMany({ where: { slug: { startsWith: "t-barbearia" } } });
  await db.user.deleteMany({ where: { email } });
  await db.$disconnect();
});

describe("criação de organização", () => {
  it("gera slugs únicos para nomes iguais e cria o vínculo de dono", async () => {
    const user = await db.user.create({ data: { id: `u-${Date.now()}`, name: "Teste", email } });
    const a = await createOrganizationForUser(user.id, "T Barbearia");
    const b = await createOrganizationForUser(user.id, "T Barbearia");
    expect(a.slug).toBe("t-barbearia");
    expect(b.slug).toBe("t-barbearia-2");
    const memberships = await db.membership.findMany({ where: { userId: user.id } });
    expect(memberships.map((m) => m.role)).toEqual(["OWNER", "OWNER"]);
  });
});

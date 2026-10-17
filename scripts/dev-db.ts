// Banco PostgreSQL local sem Docker (apenas desenvolvimento).
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const dataDir = "./.pgdata";
const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "agendaflow",
  password: "agendaflow_dev",
  port: 5432,
  persistent: true,
});

async function main() {
  if (!existsSync(`${dataDir}/PG_VERSION`)) {
    await pg.initialise();
  }
  await pg.start();
  try {
    await pg.createDatabase("agendaflow");
  } catch {
    // já existe
  }
  console.log("PostgreSQL pronto em localhost:5432 (Ctrl+C para parar)");
  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
main();

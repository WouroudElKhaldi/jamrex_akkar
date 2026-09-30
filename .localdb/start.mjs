// Local-only PostgreSQL for development (real Postgres binaries from npm). Keep this window running.
import EmbeddedPostgres from "embedded-postgres";
import fs from "node:fs";

const dir = new URL("./data", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "jamrex", password: "jamrex", port: 5432, persistent: true, initdbFlags: ["--encoding=UTF8", "--locale=C"] });

const fresh = !fs.existsSync(dir + "/PG_VERSION");
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("jamrex_miniyeh");
console.log("PostgreSQL ready on localhost:5432 (db jamrex_miniyeh, user/pass jamrex)");

const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);


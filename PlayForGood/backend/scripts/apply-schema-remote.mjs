import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config();

function fail(message) {
  console.error(`\n[apply-schema-remote] ${message}`);
  process.exit(1);
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    fail(`Missing required environment variable: ${name}`);
  }
  return String(value).trim();
}

async function runQuery({ endpoint, token, label, query }) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      query,
      read_only: false
    })
  });

  const text = await response.text();
  if (!response.ok) {
    if (response.status === 401) {
      fail(
        "Unauthorized by Supabase Management API. SUPABASE_MANAGEMENT_TOKEN must be a personal access token (sbp_...), not anon/service-role JWT keys."
      );
    }

    if (response.status === 403) {
      fail(
        "Token lacks database query permissions. Ensure the PAT has database read/write scopes for this project."
      );
    }

    fail(`${label} failed with status ${response.status}. Response: ${text.slice(0, 1200)}`);
  }

  console.log(`[apply-schema-remote] ${label} applied successfully.`);
}

async function main() {
  const supabaseUrl = getRequiredEnv("SUPABASE_URL");
  const managementToken = getRequiredEnv("SUPABASE_MANAGEMENT_TOKEN");

  if (managementToken.startsWith("eyJ")) {
    fail(
      "SUPABASE_MANAGEMENT_TOKEN looks like a JWT. Use a Supabase personal access token from dashboard account settings."
    );
  }

  const ref = new URL(supabaseUrl).hostname.split(".")[0];
  const endpoint = `https://api.supabase.com/v1/projects/${ref}/database/query`;

  const schemaPath = path.resolve("supabase/schema.sql");
  const seedPath = path.resolve("supabase/seed.sql");

  const schemaSql = await fs.readFile(schemaPath, "utf8");
  const seedSql = await fs.readFile(seedPath, "utf8");

  console.log("[apply-schema-remote] Applying schema.sql...");
  await runQuery({ endpoint, token: managementToken, label: "schema.sql", query: schemaSql });

  console.log("[apply-schema-remote] Applying seed.sql...");
  await runQuery({ endpoint, token: managementToken, label: "seed.sql", query: seedSql });

  console.log("\n[apply-schema-remote] Complete. Schema and seed applied to remote Supabase project.");
}

main().catch((error) => fail(error.message));

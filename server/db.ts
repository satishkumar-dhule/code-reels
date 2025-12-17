import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "@shared/schema";

// Use read-only credentials for serving (default)
// Use read-write credentials for write operations (GitHub Actions)
const isWriteMode = process.env.TURSO_WRITE_MODE === "true";

const url = isWriteMode 
  ? process.env.TURSO_DATABASE_URL 
  : (process.env.TURSO_DATABASE_URL_RO || process.env.TURSO_DATABASE_URL);

const authToken = isWriteMode 
  ? process.env.TURSO_AUTH_TOKEN 
  : (process.env.TURSO_AUTH_TOKEN_RO || process.env.TURSO_AUTH_TOKEN);

if (!url) {
  throw new Error("TURSO_DATABASE_URL or TURSO_DATABASE_URL_RO is required");
}

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });

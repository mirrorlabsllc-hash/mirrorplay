import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

const { Pool } = pg;

const localUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;

let connectionString: string;
let useSSL = false;
let dbType = "local";

if (localUrl) {
  connectionString = localUrl;
  dbType = "replit";
  console.log("Database: Connecting to Replit PostgreSQL");
} else if (supabaseUrl && supabaseUrl.trim().length > 0) {
  connectionString = supabaseUrl;
  useSSL = true;
  dbType = "supabase";
  const urlHost = supabaseUrl.match(/@([^:\/]+)/)?.[1] || 'unknown';
  console.log(`Database: Connecting to Supabase PostgreSQL (host: ${urlHost})`);
} else {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : undefined
});
export const db = drizzle(pool, { schema });
export { dbType };

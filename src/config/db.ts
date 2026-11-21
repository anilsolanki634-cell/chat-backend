import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (error: Error) => {
  console.error("Unexpected PostgreSQL error:", error);
});
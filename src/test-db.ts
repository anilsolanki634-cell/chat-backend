import { pool } from "./config/db.js";

const testConnection = async (): Promise<void> => {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database_name"
    );

    console.log("Database connected successfully!");
    console.log("Database name:", result.rows[0].database_name);

    const users = await pool.query(
      "SELECT id, name, email FROM users"
    );

    console.log("Users in database:");
    console.table(users.rows);
  } catch (error) {
    console.error("Database connection failed:", error);
  } finally {
    await pool.end();
  }
};

testConnection();
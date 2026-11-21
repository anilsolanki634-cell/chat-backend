import dotenv from "dotenv";
import app from "./app.js";
import { pool } from "./config/db.js";

dotenv.config();

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    await pool.query("SELECT 1");

    console.log("PostgreSQL connected successfully");

    app.listen(PORT, () => {
      console.log(
        `Server running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
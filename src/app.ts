import express from "express";
import cors from "cors";

import chatRoutes from "./routes/chat.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Chat backend is running",
  });
});

app.use(chatRoutes);

app.use(errorHandler);

export default app;
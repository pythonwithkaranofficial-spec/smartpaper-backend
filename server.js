const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");

dotenv.config();

const app = express();

// Routes
const paperRoutes = require("./routes/paperRoutes");

// Middleware
app.use(cors());
app.use(express.json());

// Debug Logs
console.log("=================================");
console.log("PORT =", process.env.PORT);
console.log("MONGO_URI =", process.env.MONGO_URI);
console.log("=================================");

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB Error:", err);
  });

// Test Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Smart Paper Generator Backend Running",
  });
});

// API Routes
app.use("/api", paperRoutes);

// Start Server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
const express = require("express");

const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * Root endpoint
 */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "SecureShip API is running",
    service: "secureship-api",
    version: "1.0.0",
  });
});

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "secureship-api",
    timestamp: new Date().toISOString(),
  });
});

/**
 * Application information
 */
app.get("/api/info", (req, res) => {
  res.status(200).json({
    application: "SecureShip",
    description: "Secure CI/CD demonstration application",
    environment: process.env.NODE_ENV || "development",
    version: "1.0.0",
  });
});

/**
 * 404 handler
 */
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route not found",
  });
});

/**
 * Start server only when this file is executed directly.
 *
 * This allows Jest/Supertest to import the app
 * without starting a real server.
 */
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`SecureShip API running on port ${PORT}`);
  });
}

module.exports = app;
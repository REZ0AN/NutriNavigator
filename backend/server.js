import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./config/dbconnect.js";
import { v2 as cloudinary } from "cloudinary";

// Load env first, before anything else
dotenv.config({ path: "backend/config/config.env" });

// Handle uncaught synchronous exceptions
process.on("uncaughtException", (err) => {
    console.error(`[uncaughtException] ${err.message}`);
    console.error("Shutting down due to uncaught exception.");
    process.exit(1);
});

// Connect to MongoDB
connectDB();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Start HTTP server
const PORT = process.env.PORT || 4080;
const server = app.listen(PORT, () => {
    console.log(`[server] Running on http://localhost:${PORT}`);
    console.log(`[swagger] Docs at http://localhost:${PORT}/api/docs`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.error(`[unhandledRejection] ${err.message}`);
    console.error("Shutting down due to unhandled promise rejection.");
    server.close(() => process.exit(1));
});

import mongoose from "mongoose";

/**
 * Connect to MongoDB using the MONGODB_URI environment variable.
 * Exits the process if the connection fails.
 */
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`[mongodb] Connected to ${conn.connection.host}`);
    } catch (error) {
        console.error(`[mongodb] Connection failed: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;

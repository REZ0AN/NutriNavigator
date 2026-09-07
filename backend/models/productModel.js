import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please enter the product name"],
            trim: true,
        },
        description: {
            type: String,
            required: [true, "Please enter the product description"],
        },
        price: {
            type: Number,
            required: [true, "Please enter the product price"],
            min: [0, "Price cannot be negative"],
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        images: [
            {
                public_id: { type: String, required: true },
                url: { type: String, required: true },
            },
        ],
        category: {
            type: String,
            required: [true, "Please enter the product category"],
            trim: true,
        },
        stock: {
            type: Number,
            required: [true, "Please enter the product stock"],
            default: 1,
            min: [0, "Stock cannot be negative"],
        },
        // One entry per paid checkout reservation. This makes stock
        // reservation idempotent across process crashes and retries.
        stockReservations: [
            {
                reservationId: { type: String, required: true },
                quantity: { type: Number, required: true, min: 1 },
            },
        ],
        reviewscount: {
            type: Number,
            default: 0,
        },
        reviews: [
            {
                user: {
                    type: mongoose.Schema.ObjectId,
                    ref: "users",
                    required: true,
                },
                name: { type: String, required: true },
                rating: { type: Number, required: true, min: 1, max: 5 },
                comment: { type: String, required: true },
            },
        ],
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "users",
            required: true,
        },
    },
    { timestamps: true }
);

const Product = mongoose.model("products", productSchema);

export default Product;

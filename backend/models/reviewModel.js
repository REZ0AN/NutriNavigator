import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.ObjectId, ref: "products", required: true, index: true },
    user: { type: mongoose.Schema.ObjectId, ref: "users", required: true, index: true },
    name: { type: String, required: true, trim: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ createdAt: -1, _id: -1 });
reviewSchema.index({ rating: -1, _id: -1 });

export default mongoose.model("reviews", reviewSchema);

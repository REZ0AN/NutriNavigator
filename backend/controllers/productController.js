import Product from "../models/productModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrorHandlingMiddleware.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { v2 as cloudinary } from "cloudinary";
import { validateBase64Image } from "../middlewares/validateFileType.js";
import Review from "../models/reviewModel.js";
import mongoose from "mongoose";

const encodeCursor = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
const decodeCursor = (value) => {
  if (!value) return null;
  try { return JSON.parse(Buffer.from(value, "base64url").toString("utf8")); } catch { return null; }
};

const refreshReviewStats = async (productId, legacyReviews = []) => {
  const normalizedProductId = new mongoose.Types.ObjectId(productId);
  const stats = await Review.aggregate([
    { $match: { product: normalizedProductId } },
    { $group: { _id: null, count: { $sum: 1 }, rating: { $avg: "$rating" } } },
  ]);
  const count = stats[0]?.count ?? legacyReviews.length;
  const rating = stats[0]?.rating ?? (legacyReviews.length ? legacyReviews.reduce((sum, review) => sum + review.rating, 0) / legacyReviews.length : 0);
  await Product.updateOne({ _id: productId }, { $set: { reviewscount: count, rating } });
};

const formatAdminReview = (review, product) => ({
  reviewId: review._id,
  productId: product?._id || review.product?._id || review.product,
  productName: product?.name || review.product?.name || "Unknown product",
  productImage: product?.images?.[0]?.url || review.product?.images?.[0]?.url || "",
  userId: review.user?._id || review.user,
  userName: review.user?.name || review.name,
  userEmail: review.user?.email || "",
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt || review._id?.getTimestamp?.() || new Date(0),
});

// ─── Helper: validate + upload images to Cloudinary ──────────────────────────
const uploadImages = async (images) => {
  const imageArray = Array.isArray(images) ? images : [images];

  return Promise.all(
    imageArray.map(async (img) => {
      // Validate first
      const { valid, message } = validateBase64Image(img);
      if (!valid) throw new Error(message);

      // Cloudinary Node SDK needs the full data URI — ensure it has the prefix
      // If somehow the prefix was stripped, reconstruct it
      const dataUri = img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;

      try {
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: "products",
          resource_type: "auto",   // let Cloudinary detect the format
        });
        return { public_id: result.public_id, url: result.secure_url };
      } catch (err) {
        throw new Error(`File upload failed: ${err.message}`);
      }
    })
  );
};

// ─── Helper: delete images from Cloudinary ───────────────────────────────────
const destroyImages = async (images) => {
  await Promise.all(images.map((img) => cloudinary.uploader.destroy(img.public_id)));
};

// ─── Create product (Admin) ───────────────────────────────────────────────────
export const createProduct = catchAsyncErrors(async (req, res, next) => {
  let { images } = req.body;
  if (!images) return next(new ErrorHandler("Please upload at least one image", 400));

  try {
    req.body.images = await uploadImages(images);
  } catch (err) {
    return next(new ErrorHandler(err.message, 400));
  }

  req.body.user   = req.user.id;
  const product   = await Product.create(req.body);
  res.status(201).json({ success: true, product });
});

// ─── Update product (Admin) ───────────────────────────────────────────────────
export const updateProduct = catchAsyncErrors(async (req, res, next) => {
  let product = await Product.findById(req.params.id);
  if (!product) return next(new ErrorHandler("Product not found", 404));

  if (req.body.images) {
    const images     = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
    const hasNew     = images.some((img) => img.startsWith("data:"));

    if (hasNew) {
      // Delete old images then upload new ones
      await destroyImages(product.images);

      try {
        // Only upload base64 strings — skip already-uploaded URLs
        const newImages = images.filter((img) => img.startsWith("data:"));
        req.body.images = await uploadImages(newImages);
      } catch (err) {
        return next(new ErrorHandler(err.message, 400));
      }
    } else {
      // All images are existing URLs — don't touch them
      delete req.body.images;
    }
  } else {
    delete req.body.images;
  }

  product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ success: true, product });
});

// ─── Get all products (public) ────────────────────────────────────────────────
export const getAllProducts = catchAsyncErrors(async (req, res) => {
    const resultPerPage = 8;
    const productsCount = await Product.countDocuments();
    const uniqueCategories = await Product.distinct("category");

    const apiFeature = new ApiFeatures(Product.find(), req.query).search().filter();

    const filteredProductsCount = await apiFeature.query.clone().countDocuments();

    apiFeature.pagination(resultPerPage);
    const products = await apiFeature.query;

    res.status(200).json({          // Fixed: was 201
        success: true,
        products,
        productsCount,
        resultPerPage,
        filteredProductsCount,
        uniqueCategories,
    });
});

// ─── Get all products (Admin) ─────────────────────────────────────────────────
export const getAllAdminProducts = catchAsyncErrors(async (req, res) => {
    const products = await Product.find();
    res.status(200).json({ success: true, products });
});

// ─── Get single product (public) ─────────────────────────────────────────────
export const getProduct = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id);  // Fixed: removed double query
    if (!product) {
        return next(new ErrorHandler("Product not found.", 404));
    }
    res.status(200).json({ success: true, product });       // Fixed: was 201
});


// ─── Delete product (Admin) ───────────────────────────────────────────────────
export const deleteProduct = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.params.id);
    if (!product) {
        return next(new ErrorHandler("Product not found.", 404)); // Fixed: was 403
    }

    await destroyImages(product.images);
    await Review.deleteMany({ product: product._id });
    await Product.deleteOne({ _id: req.params.id });

    res.status(200).json({ success: true, message: "Product deleted successfully." });
});

// ─── Create / update review ───────────────────────────────────────────────────
export const createProductReview = catchAsyncErrors(async (req, res, next) => {
    const { rating, productId } = req.body;
    const comment = req.body.comment?.trim().slice(0, 500);
    const product = await Product.findById(productId);
    if (!product) {
        return next(new ErrorHandler("Product not found.", 404));
    }

    if (!Number.isFinite(Number(rating)) || Number(rating) < 1 || Number(rating) > 5 || !comment) {
        return next(new ErrorHandler("A rating from 1 to 5 and a comment are required.", 400));
    }
    const review = await Review.findOneAndUpdate(
        { product: productId, user: req.user.id },
        { $set: { name: req.user.name, rating: Number(rating), comment } },
        { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    await refreshReviewStats(productId, product.reviews);

    res.status(200).json({ success: true, review });
});

// ─── Get all reviews (Admin) ──────────────────────────────────────────────────
export const getAllReviews = catchAsyncErrors(async (req, res) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 25, 1), 100);
    const sortKey = ["newest", "oldest", "highest", "lowest"].includes(req.query.sort) ? req.query.sort : "newest";
    const cursor = decodeCursor(req.query.cursor);
    if (req.query.cursor && !cursor) return next(new ErrorHandler("Invalid review cursor.", 400));
    const filter = {};
    if (req.query.rating && ["1", "2", "3", "4", "5"].includes(req.query.rating)) filter.rating = Number(req.query.rating);
    if (req.query.productId && mongoose.isValidObjectId(req.query.productId)) filter.product = req.query.productId;
    if (req.query.search?.trim()) {
        const expression = new RegExp(req.query.search.trim().slice(0, 80), "i");
        const products = await Product.find({ name: expression }).select("_id").lean();
        filter.$or = [{ name: expression }, { comment: expression }];
        if (products.length) filter.$or.push({ product: { $in: products.map(({ _id }) => _id) } });
    }

    // Existing installations may still have embedded reviews from before the
    // standalone collection was introduced. Keep those visible while they are
    // being migrated; all newly created reviews use the indexed collection.
    if (!cursor && !(await Review.exists({}))) {
        const legacyProducts = await Product.find({ "reviews.0": { $exists: true } }).select("name images reviews").lean();
        let legacyReviews = legacyProducts.flatMap((product) => product.reviews.map((review) => formatAdminReview(review, product)));
        if (req.query.rating) legacyReviews = legacyReviews.filter((review) => review.rating === Number(req.query.rating));
        if (req.query.productId && mongoose.isValidObjectId(req.query.productId)) legacyReviews = legacyReviews.filter((review) => review.productId.toString() === req.query.productId);
        if (req.query.search?.trim()) {
            const expression = req.query.search.trim().slice(0, 80).toLowerCase();
            legacyReviews = legacyReviews.filter((review) => `${review.productName} ${review.userName} ${review.comment}`.toLowerCase().includes(expression));
        }
        legacyReviews.sort((a, b) => {
            if (sortKey === "highest" || sortKey === "lowest") return sortKey === "highest" ? b.rating - a.rating : a.rating - b.rating;
            const direction = sortKey === "oldest" ? 1 : -1;
            return direction * (new Date(a.createdAt) - new Date(b.createdAt));
        });
        const page = legacyReviews.slice(0, limit);
        return res.status(200).json({ success: true, reviews: page, hasNextPage: legacyReviews.length > limit, nextCursor: null });
    }

    const sort = sortKey === "oldest" ? { createdAt: 1, _id: 1 } : sortKey === "highest" ? { rating: -1, _id: -1 } : sortKey === "lowest" ? { rating: 1, _id: 1 } : { createdAt: -1, _id: -1 };
    if (cursor) {
        const descending = sortKey === "newest" || sortKey === "highest";
        const field = sortKey === "highest" || sortKey === "lowest" ? "rating" : "createdAt";
        const value = field === "rating" ? Number(cursor.value) : new Date(cursor.value);
        const operator = descending ? "$lt" : "$gt";
        filter.$and = [{ $or: [{ [field]: { [operator]: value } }, { [field]: value, _id: { [operator]: cursor.id } }] }];
    }

    const rows = await Review.find(filter).sort(sort).limit(limit + 1).populate("product", "name images").populate("user", "name email").lean();
    const hasNextPage = rows.length > limit;
    const reviews = rows.slice(0, limit).map((review) => formatAdminReview(review));
    const last = reviews.at(-1);
    res.status(200).json({ success: true, reviews, hasNextPage, nextCursor: hasNextPage ? encodeCursor({ value: sortKey === "highest" || sortKey === "lowest" ? last.rating : last.createdAt, id: last.reviewId }) : null });
});

// ─── Get reviews for one product ──────────────────────────────────────────────
export const getProductReviews = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.query.id);
    if (!product) {
        return next(new ErrorHandler("Product not found.", 404));
    }
    const reviews = await Review.find({ product: product._id }).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, reviews: reviews.length ? reviews : product.reviews });
});

// ─── Delete a review ──────────────────────────────────────────────────────────
export const deleteReviews = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.query.productId);
    if (!product) {
        return next(new ErrorHandler("Product not found.", 404));
    }

    const standaloneReview = await Review.findById(req.query.id);
    if (standaloneReview) {
        if (standaloneReview.product.toString() !== product._id.toString()) {
            return next(new ErrorHandler("Review not found.", 404));
        }
        const isAdmin = ["admin", "master"].includes(req.user.role);
        if (!isAdmin && standaloneReview.user.toString() !== req.user.id.toString()) {
            return next(new ErrorHandler("You are not authorised to delete this review.", 403));
        }
        await Review.deleteOne({ _id: standaloneReview._id });
        await refreshReviewStats(product._id, product.reviews);
        return res.status(200).json({ success: true, message: "Review deleted successfully." });
    }

    const review = product.reviews.id(req.query.id);
    if (!review) {
        return next(new ErrorHandler("Review not found.", 404));
    }

    const isAdmin = ["admin", "master"].includes(req.user.role);
    const isOwner = review.user.toString() === req.user.id.toString();
    if (!isOwner && !isAdmin) {
        return next(new ErrorHandler("You are not authorised to delete this review.", 403));
    }

    const reviews = product.reviews.filter((r) => r._id.toString() !== review._id.toString());

    const rating =
        reviews.length > 0
            ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length
            : 0;

    await Product.findByIdAndUpdate(
        req.query.productId,
        { reviews, rating, reviewscount: reviews.length },
        { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: "Review deleted successfully." });
});

// ─── Get recommended products (ML integration) ───────────────────────────────
export const getRecommendedProducts = catchAsyncErrors(async (req, res, next) => {
    const { keywords } = req.body;

    if (!Array.isArray(keywords) || keywords.length === 0) {
        return next(new ErrorHandler("Keywords must be a non-empty array.", 400));
    }

    const processedKeys = keywords.map((key) => key.split(" (")[0].trim());
    const regexPattern = new RegExp(processedKeys.join("|"), "i");

    const results = await Product.find({ name: { $regex: regexPattern } }).select("name _id");

    res.status(200).json({ recommended_foods: results });
});

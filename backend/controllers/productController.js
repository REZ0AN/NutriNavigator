import Product from "../models/productModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrorHandlingMiddleware.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { v2 as cloudinary } from "cloudinary";
import { validateBase64Image } from "../middlewares/validateFileType.js";

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

    const review = {
        user: req.user.id,
        name: req.user.name,
        rating: Number(rating),
        comment,
    };

    const existingReviewIndex = product.reviews.findIndex(
        (r) => r.user.toString() === req.user.id.toString()
    );

    if (existingReviewIndex !== -1) {
        product.reviews[existingReviewIndex].rating = rating;
        product.reviews[existingReviewIndex].comment = comment;
    } else {
        product.reviews.push(review);
        product.reviewscount = product.reviews.length;
    }

    product.rating =
        product.reviews.reduce((acc, r) => acc + r.rating, 0) / product.reviews.length;

    await product.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, review });
});

// ─── Get all reviews (Admin) ──────────────────────────────────────────────────
export const getAllReviews = catchAsyncErrors(async (req, res) => {
    const products = await Product.find({}, { reviews: 1 });
    const allReviews = products.flatMap((p) => p.reviews);
    res.status(200).json({ success: true, reviews: allReviews });
});

// ─── Get reviews for one product ──────────────────────────────────────────────
export const getProductReviews = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.query.id);
    if (!product) {
        return next(new ErrorHandler("Product not found.", 404));
    }
    res.status(200).json({ success: true, reviews: product.reviews });
});

// ─── Delete a review ──────────────────────────────────────────────────────────
export const deleteReviews = catchAsyncErrors(async (req, res, next) => {
    const product = await Product.findById(req.query.productId);
    if (!product) {
        return next(new ErrorHandler("Product not found.", 404));
    }

    const reviews = product.reviews.filter(
        (r) => r._id.toString() !== req.query.id.toString()
    );

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

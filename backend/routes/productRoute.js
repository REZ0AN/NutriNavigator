import express from "express";
import { isAuthenticatedUser, authorizeRoles } from "../middlewares/authMiddleware.js";
import {
    createProduct,
    getAllProducts,
    getAllAdminProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    createProductReview,
    getAllReviews,
    getProductReviews,
    deleteReviews,
    getRecommendedProducts,
} from "../controllers/productController.js";

const router = express.Router();

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products with search, filter, and pagination
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *         description: Search term matched against product name
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: price[gte]
 *         schema: { type: number }
 *       - in: query
 *         name: price[lte]
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 products:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Product' }
 *                 productsCount: { type: integer }
 *                 resultPerPage: { type: integer }
 *                 filteredProductsCount: { type: integer }
 *                 uniqueCategories:
 *                   type: array
 *                   items: { type: string }
 */
router.get("/products", getAllProducts);

/**
 * @swagger
 * /admin/products:
 *   get:
 *     summary: Get all products without pagination (Admin)
 *     tags: [Admin - Products]
 *     responses:
 *       200:
 *         description: All products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 products:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Product' }
 */
router.get("/admin/products", isAuthenticatedUser, authorizeRoles("admin", "master"), getAllAdminProducts);

/**
 * @swagger
 * /admin/product/new:
 *   post:
 *     summary: Create a new product (Admin)
 *     tags: [Admin - Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description, price, category, stock, images]
 *             properties:
 *               name: { type: string, example: Organic Spinach }
 *               description: { type: string }
 *               price: { type: number, example: 149 }
 *               category: { type: string, example: Vegetables }
 *               stock: { type: integer, example: 50 }
 *               images:
 *                 oneOf:
 *                   - type: string
 *                     description: Single base64 image
 *                   - type: array
 *                     items: { type: string }
 *                     description: Multiple base64 images
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 product: { $ref: '#/components/schemas/Product' }
 */
router.post("/admin/product/new", isAuthenticatedUser, authorizeRoles("admin", "master"), createProduct);

/**
 * @swagger
 * /product/{id}:
 *   get:
 *     summary: Get a single product by ID
 *     tags: [Products]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 product: { $ref: '#/components/schemas/Product' }
 *       404:
 *         description: Product not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/product/:id", getProduct);

/**
 * @swagger
 * /admin/product/{id}:
 *   put:
 *     summary: Update a product (Admin)
 *     tags: [Admin - Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Updated product
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 product: { $ref: '#/components/schemas/Product' }
 *   delete:
 *     summary: Delete a product and its images (Admin)
 *     tags: [Admin - Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 */
router
    .route("/admin/product/:id")
    .put(isAuthenticatedUser, authorizeRoles("admin", "master"), updateProduct)
    .delete(isAuthenticatedUser, authorizeRoles("admin", "master"), deleteProduct);

/**
 * @swagger
 * /review:
 *   put:
 *     summary: Add or update a product review
 *     tags: [Reviews]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, comment, productId]
 *             properties:
 *               rating: { type: number, minimum: 1, maximum: 5, example: 4 }
 *               comment: { type: string, example: Great product! }
 *               productId: { type: string, example: 64a1b2c3d4e5f6789abcdef0 }
 *     responses:
 *       200:
 *         description: Review saved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 review: { $ref: '#/components/schemas/Review' }
 */
router.put("/review", isAuthenticatedUser, createProductReview);

/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Get all reviews for a product
 *     tags: [Reviews]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Product ID
 *     responses:
 *       200:
 *         description: List of reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 reviews:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Review' }
 *   delete:
 *     summary: Delete a review (authenticated user)
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: Review ID
 *       - in: query
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Review deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 */
router.route("/reviews").get(getProductReviews).delete(isAuthenticatedUser, deleteReviews);

/**
 * @swagger
 * /admin/reviews:
 *   get:
 *     summary: Get all reviews across all products (Admin)
 *     tags: [Admin - Products]
 *     responses:
 *       200:
 *         description: All reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 reviews:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Review' }
 */
router.get("/admin/reviews", isAuthenticatedUser, authorizeRoles("admin", "master"), getAllReviews);

/**
 * @swagger
 * /getrecommendedproduct:
 *   post:
 *     summary: Fetch products matching ML-recommended food keywords
 *     tags: [Diet Recommendation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [keywords]
 *             properties:
 *               keywords:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["Spinach (পালং শাক)", "Apple (আপেল)"]
 *     responses:
 *       200:
 *         description: Matching products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 recommended_foods:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       name: { type: string }
 *       400:
 *         description: Invalid keywords
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post("/getrecommendedproduct", isAuthenticatedUser, getRecommendedProducts);

export default router;

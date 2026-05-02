import express from "express";
import { isAuthenticatedUser, authorizeRoles } from "../middlewares/authMiddleware.js";
import {
    newOrder,
    getSingleOrder,
    getAllOrders,
    updateOrderStatus,
    deleteOrder,
    myOrders,
    totalAmountByDate,
} from "../controllers/orderController.js";

const router = express.Router();

/**
 * @swagger
 * /order/new:
 *   post:
 *     summary: Place a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shippinginfo, orderitems, paymentinfo, itemsprice, tax, shippingcost, totalprice]
 *             properties:
 *               shippinginfo: { $ref: '#/components/schemas/ShippingInfo' }
 *               orderitems:
 *                 type: array
 *                 items: { $ref: '#/components/schemas/OrderItem' }
 *               paymentinfo:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   status: { type: string }
 *               itemsprice: { type: number }
 *               tax: { type: number }
 *               shippingcost: { type: number }
 *               totalprice: { type: number }
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 order: { $ref: '#/components/schemas/Order' }
 */
router.post("/order/new", isAuthenticatedUser, newOrder);

/**
 * @swagger
 * /orders/me:
 *   get:
 *     summary: Get all orders for the logged-in user
 *     tags: [Orders]
 *     responses:
 *       200:
 *         description: User's orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 orders:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Order' }
 */
router.get("/orders/me", isAuthenticatedUser, myOrders);

/**
 * @swagger
 * /order/{id}:
 *   get:
 *     summary: Get a specific order (authenticated owner)
 *     tags: [Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 order: { $ref: '#/components/schemas/Order' }
 *       404:
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get("/order/:id", isAuthenticatedUser, getSingleOrder);

/**
 * @swagger
 * /admin/orders:
 *   get:
 *     summary: Get all orders with total revenue (Admin)
 *     tags: [Admin - Orders]
 *     responses:
 *       200:
 *         description: All orders and total amount
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 orders:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Order' }
 *                 totalAmount: { type: number }
 */
router.get("/admin/orders", isAuthenticatedUser, authorizeRoles("admin", "master"), getAllOrders);

/**
 * @swagger
 * /admin/order/{id}:
 *   get:
 *     summary: Get a specific order (Admin)
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 order: { $ref: '#/components/schemas/Order' }
 *   put:
 *     summary: Update order status (Admin)
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [processing, shipped, delivered]
 *                 example: shipped
 *     responses:
 *       200:
 *         description: Order updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 order: { $ref: '#/components/schemas/Order' }
 *   delete:
 *     summary: Delete an order (Admin)
 *     tags: [Admin - Orders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Order deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 */
router
    .route("/admin/order/:id")
    .get(isAuthenticatedUser, authorizeRoles("admin", "master"), getSingleOrder)
    .put(isAuthenticatedUser, authorizeRoles("admin", "master"), updateOrderStatus)
    .delete(isAuthenticatedUser, authorizeRoles("admin", "master"), deleteOrder);

/**
 * @swagger
 * /totalamount:
 *   get:
 *     summary: Get total revenue grouped by date (Admin dashboard)
 *     tags: [Admin - Orders]
 *     responses:
 *       200:
 *         description: Daily revenue data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 amounts:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: object
 *                         properties:
 *                           year: { type: integer }
 *                           month: { type: integer }
 *                           day: { type: integer }
 *                       totalAmount: { type: number }
 */
router.get("/totalamount", isAuthenticatedUser, authorizeRoles("admin", "master"), totalAmountByDate);

export default router;

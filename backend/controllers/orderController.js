import Order from "../models/orderModel.js";
import Product from "../models/productModel.js";
import ErrorHandler from "../utils/errorHandler.js";
import catchAsyncErrors from "../middlewares/catchAsyncErrorHandlingMiddleware.js";

// ─── Helper: decrement stock ──────────────────────────────────────────────────
const updateStock = async (productId, quantity) => {
    const product = await Product.findById(productId);
    if (product) {
        product.stock = Math.max(0, product.stock - quantity);
        await product.save({ validateBeforeSave: false });
    }
};

// ─── Create order ─────────────────────────────────────────────────────────────
export const newOrder = catchAsyncErrors(async (req, res) => {
    const { shippinginfo, orderitems, paymentinfo, itemsprice, tax, shippingcost, totalprice } =
        req.body;

    const order = await Order.create({
        shippinginfo,
        orderitems,
        paymentinfo,
        itemsprice,
        tax,
        shippingcost,
        totalprice,
        paidat: Date.now(),
        user: req.user.id,
    });

    res.status(201).json({ success: true, order });
});

// ─── Get single order ─────────────────────────────────────────────────────────
export const getSingleOrder = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) {
        return next(new ErrorHandler(`Order not found with id: ${req.params.id}`, 404));
    }
    res.status(200).json({ success: true, order });
});

// ─── Get all orders (Admin) ───────────────────────────────────────────────────
export const getAllOrders = catchAsyncErrors(async (req, res) => {
    const orders = await Order.find().populate("user", "name email");
    const totalAmount = orders.reduce((acc, order) => acc + order.totalprice, 0);
    res.status(200).json({ success: true, orders, totalAmount });
});

// ─── Update order status (Admin) ──────────────────────────────────────────────
export const updateOrderStatus = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);
    if (!order) {
        return next(new ErrorHandler(`Order not found with id: ${req.params.id}`, 404));
    }

    if (order.orderstatus === "delivered") {
        return next(new ErrorHandler("This order has already been delivered.", 400));
    }

    if (req.body.status === "shipped") {
        await Promise.all(
            order.orderitems.map((item) => updateStock(item.product, item.quantity))
        );
    }

    order.orderstatus = req.body.status;

    if (req.body.status === "delivered") {
        order.deliveredat = Date.now();
    }

    await order.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, order });
});

// ─── Delete order (Admin) ─────────────────────────────────────────────────────
export const deleteOrder = catchAsyncErrors(async (req, res, next) => {
    const order = await Order.findById(req.params.id);  // Fixed: was find() not findById()
    if (!order) {
        return next(new ErrorHandler(`Order not found with id: ${req.params.id}`, 404));
    }

    await Order.deleteOne({ _id: req.params.id });

    res.status(200).json({ success: true, message: "Order deleted successfully." });
});

// ─── Get logged-in user's orders ──────────────────────────────────────────────
export const myOrders = catchAsyncErrors(async (req, res) => {
    const orders = await Order.find({ user: req.user.id });
    res.status(200).json({ success: true, orders });
});

// ─── Sales data grouped by date (Admin dashboard) ────────────────────────────
export const totalAmountByDate = catchAsyncErrors(async (req, res) => {
    const amounts = await Order.aggregate([
        {
            $group: {
                _id: {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" },
                },
                totalAmount: { $sum: "$totalprice" },
            },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
    ]);

    res.status(200).json({ success: true, amounts });
});

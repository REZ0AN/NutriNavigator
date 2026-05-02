import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        shippinginfo: {
            address: { type: String, required: true },
            city: { type: String, required: true },
            pinCode: { type: Number, required: true },
            phoneNo: { type: String, required: true },
        },
        orderitems: [
            {
                name: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true },
                image: { type: Object, required: true },
                product: {
                    type: mongoose.Schema.ObjectId,
                    ref: "products",
                    required: true,
                },
            },
        ],
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "users",
            required: true,
        },
        paymentinfo: {
            id: { type: String, required: true },
            status: { type: String, required: true },
        },
        paidat: { type: Date, required: true, default: Date.now },
        itemsprice: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        shippingcost: { type: Number, default: 0 },
        totalprice: { type: Number, default: 0 },
        orderstatus: {
            type: String,
            required: true,
            enum: ["processing", "shipped", "delivered"],
            default: "processing",
        },
        deliveredat: Date,
    },
    { timestamps: true }
);

const Order = mongoose.model("orders", orderSchema);

export default Order;

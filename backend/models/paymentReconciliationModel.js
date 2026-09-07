import mongoose from "mongoose";

// A paid PaymentIntent whose order write did not complete.  Keeping the
// checkout snapshot lets a retry recover the exact amount that Stripe paid.
const paymentReconciliationSchema = new mongoose.Schema(
  {
    paymentIntentId: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.ObjectId, ref: "users", required: true },
    shippinginfo: {
      address: { type: String, required: true },
      city: { type: String, required: true },
      pinCode: { type: Number, required: true },
      phoneNo: { type: String, required: true },
    },
    orderitems: [{
      name: { type: String, required: true },
      price: { type: Number, required: true },
      quantity: { type: Number, required: true },
      image: { type: Object, required: true },
      product: { type: mongoose.Schema.ObjectId, ref: "products", required: true },
    }],
    itemsprice: { type: Number, required: true },
    tax: { type: Number, required: true },
    shippingcost: { type: Number, required: true },
    totalprice: { type: Number, required: true },
    paymentStatus: { type: String, required: true, default: "succeeded" },
    stockReserved: { type: Boolean, default: false },
    status: { type: String, enum: ["pending", "recovered", "failed"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("payment_reconciliations", paymentReconciliationSchema);

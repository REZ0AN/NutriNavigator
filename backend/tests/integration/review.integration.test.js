import { jest } from "@jest/globals";

const shouldRun = process.env.RUN_DB_INTEGRATION === "true";
const describeDatabase = shouldRun ? describe : describe.skip;
const { default: request } = await import("supertest");
const { default: mongoose } = await import("mongoose");
const { MongoMemoryServer } = await import("mongodb-memory-server");
const { default: jwt } = await import("jsonwebtoken");
const { default: app } = await import("../../app.js");
const { default: User } = await import("../../models/userModel.js");
const { default: Product } = await import("../../models/productModel.js");

describeDatabase("review deletion API integration", () => {
  let mongo, owner, other, admin, product, review;
  const cookieFor = (user) => `token=${jwt.sign({ id: user._id }, process.env.JWT_SECRET)}`;

  beforeAll(async () => {
    try {
      mongo = await MongoMemoryServer.create();
      await mongoose.connect(mongo.getUri());
    } catch (error) {
      throw new Error(`[environment] MongoMemoryServer startup failed: ${error.message}`);
    }
  });
  beforeEach(async () => {
    await Promise.all([User.deleteMany({}), Product.deleteMany({})]);
    const makeUser = (email, role = "user") => ({ name: role === "user" ? email.split("@")[0] : role, email, password: "password123", role, avatar: { public_id: email, url: "avatar.jpg" }, isVerified: true });
    [owner, other, admin] = await User.create([makeUser("review-owner@example.com"), makeUser("review-other@example.com"), makeUser("review-admin@example.com", "admin")]);
    [product] = await Product.create([{ name: "Apple", description: "Fresh apple", price: 100, stock: 5, images: [{ public_id: "apple", url: "apple.jpg" }], category: "fruit", user: admin._id, reviews: [{ user: owner._id, name: owner.name, rating: 5, comment: "great" }, { user: other._id, name: other.name, rating: 3, comment: "okay" }], reviewscount: 2, rating: 4 }]);
    review = product.reviews[0];
  });
  afterAll(async () => { await mongoose.disconnect(); if (mongo) await mongo.stop(); });

  test("allows the owner and admin, but rejects another user", async () => {
    await request(app).delete(`/api/v1/reviews?productId=${product._id}&id=${review._id}`).set("Cookie", cookieFor(other)).expect(403);
    await request(app).delete(`/api/v1/reviews?productId=${product._id}&id=${review._id}`).set("Cookie", cookieFor(owner)).expect(200);
    const refreshed = await Product.findById(product._id);
    expect(refreshed.reviewscount).toBe(1);
    expect(refreshed.rating).toBe(3);
  });
});

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "jest-test-secret";
process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "sk_test_jest";
process.env.FRONT_END_URI = process.env.FRONT_END_URI || "http://localhost:3000";

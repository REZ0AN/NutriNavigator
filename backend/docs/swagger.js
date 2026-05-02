import swaggerJSDoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "NutriNavigator API",
            version: "1.0.0",
            description:
                "REST API for NutriNavigator — an organic nutrition e-commerce platform with AI-powered diet recommendations.",
            contact: { name: "Rezoan", url: "https://github.com/REZOAN" },
        },
        servers: [
            { url: "http://localhost:8080/api/v1", description: "Development server" },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "token",
                    description: "JWT stored in an httpOnly cookie. Log in to obtain it.",
                },
            },
            schemas: {
                Avatar: {
                    type: "object",
                    properties: {
                        public_id: { type: "string", example: "avatars/abc123" },
                        url: { type: "string", example: "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
                    },
                },
                User: {
                    type: "object",
                    properties: {
                        _id: { type: "string", example: "64a1b2c3d4e5f6789abcdef0" },
                        name: { type: "string", example: "John Doe" },
                        email: { type: "string", example: "john@example.com" },
                        role: { type: "string", enum: ["user", "admin", "master"], example: "user" },
                        avatar: { $ref: "#/components/schemas/Avatar" },
                    },
                },
                RegisterInput: {
                    type: "object",
                    required: ["name", "email", "password", "avatar"],
                    properties: {
                        name: { type: "string", minLength: 3, maxLength: 30, example: "John Doe" },
                        email: { type: "string", format: "email", example: "john@example.com" },
                        password: { type: "string", minLength: 8, example: "securepass123" },
                        avatar: { type: "string", description: "Base64-encoded image string", example: "data:image/png;base64,..." },
                    },
                },
                LoginInput: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: { type: "string", format: "email", example: "john@example.com" },
                        password: { type: "string", example: "securepass123" },
                    },
                },
                ProductImage: {
                    type: "object",
                    properties: {
                        public_id: { type: "string" },
                        url: { type: "string" },
                    },
                },
                Review: {
                    type: "object",
                    properties: {
                        user: { type: "string" },
                        name: { type: "string" },
                        rating: { type: "number", minimum: 1, maximum: 5 },
                        comment: { type: "string" },
                    },
                },
                Product: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        name: { type: "string", example: "Organic Spinach" },
                        description: { type: "string", example: "Fresh farm spinach" },
                        price: { type: "number", example: 149 },
                        rating: { type: "number", example: 4.5 },
                        category: { type: "string", example: "Vegetables" },
                        stock: { type: "integer", example: 50 },
                        reviewscount: { type: "integer", example: 12 },
                        images: { type: "array", items: { $ref: "#/components/schemas/ProductImage" } },
                        reviews: { type: "array", items: { $ref: "#/components/schemas/Review" } },
                    },
                },
                ShippingInfo: {
                    type: "object",
                    required: ["address", "city", "pinCode", "phoneNo"],
                    properties: {
                        address: { type: "string", example: "123 Green Lane" },
                        city: { type: "string", example: "Dhaka" },
                        pinCode: { type: "integer", example: 1212 },
                        phoneNo: { type: "string", example: "01700000000" },
                    },
                },
                OrderItem: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        price: { type: "number" },
                        quantity: { type: "integer" },
                        image: { type: "object" },
                        product: { type: "string", description: "Product ObjectId" },
                    },
                },
                Order: {
                    type: "object",
                    properties: {
                        _id: { type: "string" },
                        shippinginfo: { $ref: "#/components/schemas/ShippingInfo" },
                        orderitems: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
                        paymentinfo: {
                            type: "object",
                            properties: { id: { type: "string" }, status: { type: "string" } },
                        },
                        itemsprice: { type: "number" },
                        tax: { type: "number" },
                        shippingcost: { type: "number" },
                        totalprice: { type: "number" },
                        orderstatus: { type: "string", enum: ["processing", "shipped", "delivered"] },
                        paidat: { type: "string", format: "date-time" },
                        deliveredat: { type: "string", format: "date-time" },
                    },
                },
                SuccessMessage: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string", example: "Operation successful" },
                    },
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: false },
                        error: {
                            type: "object",
                            properties: {
                                statusCode: { type: "integer", example: 404 },
                                message: { type: "string", example: "Resource not found" },
                            },
                        },
                    },
                },
            },
        },
        security: [{ cookieAuth: [] }],
    },
    apis: ["./backend/routes/*.js"],
};

export const swaggerSpec = swaggerJSDoc(options);

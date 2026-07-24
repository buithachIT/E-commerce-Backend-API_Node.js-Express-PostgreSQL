"use strict";

const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "E-commerce Backend API - BuiThachh",
      version: "1.0.0",
      description:
        "REST API for e-commerce: auth (login, forgot password, email verification), products, cart, vouchers, checkout review. All routes except /api-docs require header `x-api-key`. Protected routes also need `authorization` + `x-client-id`.",
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3055}`,
        description: "Local",
      },
      ...(process.env.APP_URL &&
      !String(process.env.APP_URL).includes("localhost")
        ? [
            {
              url: process.env.APP_URL,
              description: "Production",
            },
          ]
        : []),
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
        BearerAuth: {
          type: "apiKey",
          in: "header",
          name: "authorization",
          description: "Access token JWT (không cần prefix Bearer)",
        },
        ClientId: {
          type: "apiKey",
          in: "header",
          name: "x-client-id",
          description: "User/shop id (metadata.clientId hoặc user.id sau login)",
        },
        RefreshTokenAuth: {
          type: "apiKey",
          in: "header",
          name: "x-refresh-token",
          description:
            "Refresh token JWT từ login (không bỏ vào Authorization, không gửi trong body)",
        },
      },
      schemas: {
        SuccessResponse: {
          type: "object",
          properties: {
            message: { type: "string" },
            status: { type: "integer", example: 200 },
            metadata: {},
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            status: { type: "string", example: "error" },
            code: { type: "integer", example: 400 },
            message: { type: "string" },
          },
        },
        CartProduct: {
          type: "object",
          required: ["product_id", "quantity"],
          properties: {
            product_id: { type: "string", format: "uuid" },
            quantity: { type: "integer", minimum: 1 },
            old_quantity: {
              type: "integer",
              description: "Bắt buộc khi update quantity",
            },
          },
        },
        DiscountProductLine: {
          type: "object",
          properties: {
            product_id: { type: "string", format: "uuid" },
            product_price: { type: "number" },
            quantity: { type: "integer", minimum: 1 },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    tags: [
      { name: "Access", description: "Auth: signup, login, logout, forgot password, email verification" },
      { name: "Product", description: "Sản phẩm shop" },
      { name: "Cart", description: "Giỏ hàng user" },
      { name: "Checkout", description: "Xem lại đơn trước khi đặt" },
      { name: "Discount", description: "Mã giảm giá" },
    ],
    paths: {
      "/v1/api/shop/signup": {
        post: {
          tags: ["Access"],
          summary: "Đăng ký shop",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Đăng ký thành công" },
            403: { description: "Email đã tồn tại / lỗi validate" },
          },
        },
      },
      "/v1/api/shop/signin": {
        post: {
          tags: ["Access"],
          summary: "Đăng nhập",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string" },
                    password: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description:
                "Trả accessToken, refreshToken, user. Dùng accessToken + userId cho header các API sau.",
            },
          },
        },
      },
      "/v1/api/shop/logout": {
        post: {
          tags: ["Access"],
          summary: "Đăng xuất",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          responses: { 200: { description: "Logout thành công" } },
        },
      },
      "/v1/api/shop/refresh-token": {
        post: {
          tags: ["Access"],
          summary: "Refresh access token",
          description:
            "Cần 3 header: `x-api-key`, `x-client-id`, `x-refresh-token`.\n\n" +
            "Không dùng Bearer/Authorization cho API này.\n\n" +
            "Refresh token chỉ dùng **1 lần** (rotation) — sau mỗi lần 200 phải lấy `refreshToken` mới trong response.",
          security: [
            { ApiKeyAuth: [] },
            { ClientId: [] },
            { RefreshTokenAuth: [] },
          ],
          responses: {
            200: { description: "New accessToken + refreshToken pair" },
            401: {
              description:
                "Thiếu/sai x-client-id hoặc x-refresh-token, hoặc token đã dùng rồi",
            },
          },
        },
      },
      "/v1/api/shop/forgot-password": {
        post: {
          tags: ["Access"],
          summary: "Send password reset email",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Reset email sent if account exists" } },
        },
      },
      "/v1/api/shop/reset-password": {
        post: {
          tags: ["Access"],
          summary: "Reset password with token from email",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "newPassword"],
                  properties: {
                    token: { type: "string" },
                    newPassword: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Password updated" } },
        },
      },
      "/v1/api/shop/verify-email": {
        post: {
          tags: ["Access"],
          summary: "Verify email address with token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token"],
                  properties: {
                    token: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Email verified" } },
        },
      },
      "/v1/api/shop/resend-verification": {
        post: {
          tags: ["Access"],
          summary: "Resend email verification link",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Verification email sent" } },
        },
      },
      "/v1/api/shop/me": {
        get: {
          tags: ["Access"],
          summary: "Get current logged-in user profile",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          responses: {
            200: {
              description:
                "Returns id, email, user_name, avatar_url, email_verified, created_at",
            },
          },
        },
      },

      "/v1/api/product": {
        post: {
          tags: ["Product"],
          summary: "Tạo sản phẩm (Electronic / Clothing)",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: [
                    "product_name",
                    "product_thumb",
                    "product_price",
                    "product_quantity",
                    "product_type",
                    "product_attributes",
                  ],
                  properties: {
                    product_name: { type: "string" },
                    product_thumb: { type: "string" },
                    product_description: { type: "string" },
                    product_price: { type: "number" },
                    product_quantity: { type: "integer" },
                    product_type: {
                      type: "string",
                      enum: ["Electronics", "Clothing"],
                    },
                    product_attributes: {
                      type: "object",
                      description:
                        "Electronics: manufacturer, model, color | Clothing: brand, size, material",
                    },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Tạo thành công" } },
        },
      },
      "/v1/api/product/{product_id}": {
        patch: {
          tags: ["Product"],
          summary: "Cập nhật sản phẩm",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          parameters: [
            {
              name: "product_id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    product_type: {
                      type: "string",
                      enum: ["Electronics", "Clothing"],
                    },
                    product_name: { type: "string" },
                    product_price: { type: "number" },
                    product_attributes: { type: "object" },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Cập nhật thành công" } },
        },
      },
      "/v1/api/product/publish/{id}": {
        put: {
          tags: ["Product"],
          summary: "Publish sản phẩm",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: { 200: { description: "Published" } },
        },
      },
      "/v1/api/product/un-publish/{id}": {
        put: {
          tags: ["Product"],
          summary: "Unpublish sản phẩm",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: { 200: { description: "Unpublished" } },
        },
      },
      "/v1/api/product/drafts/all": {
        get: {
          tags: ["Product"],
          summary: "Danh sách draft của shop",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/v1/api/product/published/all": {
        get: {
          tags: ["Product"],
          summary: "Danh sách published của shop",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/v1/api/product/find-all": {
        get: {
          tags: ["Product"],
          summary: "Tìm tất cả product đã publish (public)",
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 50 },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
          ],
          responses: { 200: { description: "OK" } },
        },
      },
      "/v1/api/product/search/{keySearch}": {
        get: {
          tags: ["Product"],
          summary: "Full-text search product",
          parameters: [
            {
              name: "keySearch",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { 200: { description: "OK" } },
        },
      },

      "/v1/api/cart": {
        get: {
          tags: ["Cart"],
          summary: "Lấy giỏ hàng",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          responses: { 200: { description: "Danh sách item trong cart" } },
        },
        delete: {
          tags: ["Cart"],
          summary: "Xóa toàn bộ giỏ hàng",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          responses: { 200: { description: "Cleared" } },
        },
      },
      "/v1/api/cart/add": {
        post: {
          tags: ["Cart"],
          summary: "Thêm sản phẩm vào giỏ",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["product"],
                  properties: {
                    product: { $ref: "#/components/schemas/CartProduct" },
                  },
                },
                example: {
                  product: {
                    product_id: "00000000-0000-0000-0000-000000000001",
                    quantity: 1,
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Added" } },
        },
      },
      "/v1/api/cart/update": {
        post: {
          tags: ["Cart"],
          summary: "Cập nhật số lượng (dùng delta qua old_quantity)",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["product"],
                  properties: {
                    product: { $ref: "#/components/schemas/CartProduct" },
                  },
                },
                example: {
                  product: {
                    product_id: "00000000-0000-0000-0000-000000000001",
                    quantity: 3,
                    old_quantity: 1,
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Updated" } },
        },
      },
      "/v1/api/cart/item/{productId}": {
        delete: {
          tags: ["Cart"],
          summary: "Xóa 1 item khỏi giỏ",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          parameters: [
            {
              name: "productId",
              in: "path",
              required: true,
              schema: { type: "string", format: "uuid" },
            },
          ],
          responses: { 200: { description: "Deleted" } },
        },
      },

      "/v1/api/checkout/review": {
        post: {
          tags: ["Checkout"],
          summary: "Review đơn hàng trước khi đặt (chưa trừ kho / chưa tạo order)",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["cartId", "shop_order_ids"],
                  properties: {
                    cartId: { type: "integer" },
                    shop_order_ids: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          shopId: { type: "integer" },
                          shop_discounts: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                code: { type: "string" },
                              },
                            },
                          },
                          item_products: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                productId: {
                                  type: "string",
                                  format: "uuid",
                                },
                                quantity: { type: "integer" },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                example: {
                  cartId: 1,
                  shop_order_ids: [
                    {
                      shopId: 24,
                      shop_discounts: [{ code: "SUMMER20" }],
                      item_products: [
                        {
                          productId: "00000000-0000-0000-0000-000000000001",
                          quantity: 2,
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
          responses: {
            200: {
              description:
                "checkout_order + shop_order_ids (giá lấy từ DB, đã áp discount)",
            },
          },
        },
      },

      "/v1/api/discount": {
        post: {
          tags: ["Discount"],
          summary: "Tạo mã giảm giá (shop)",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: [
                    "code",
                    "name",
                    "type",
                    "value",
                    "start_date",
                    "end_date",
                  ],
                  properties: {
                    code: { type: "string", example: "SUMMER20" },
                    name: { type: "string" },
                    description: { type: "string" },
                    type: {
                      type: "string",
                      enum: ["fixed_amount", "percentage"],
                    },
                    value: { type: "number" },
                    max_value: { type: "number" },
                    max_uses: { type: "integer", description: "0 = không giới hạn" },
                    max_uses_per_user: { type: "integer" },
                    min_order_value: { type: "number" },
                    start_date: { type: "string", format: "date-time" },
                    end_date: { type: "string", format: "date-time" },
                    is_active: { type: "boolean", default: true },
                    applies_to: {
                      type: "string",
                      enum: ["all", "specific"],
                      default: "all",
                    },
                    product_ids: {
                      type: "array",
                      items: { type: "string", format: "uuid" },
                    },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "Created" } },
        },
        get: {
          tags: ["Discount"],
          summary: "Lấy tất cả mã của shop đang login",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          responses: { 200: { description: "OK" } },
        },
      },
      "/v1/api/discount/amount": {
        post: {
          tags: ["Discount"],
          summary: "Tính tiền sau khi áp mã",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["code", "shopId", "products"],
                  properties: {
                    code: { type: "string" },
                    shopId: { type: "integer" },
                    products: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/DiscountProductLine",
                      },
                    },
                  },
                },
                example: {
                  code: "SUMMER20",
                  shopId: 1,
                  products: [
                    {
                      product_id: "00000000-0000-0000-0000-000000000001",
                      product_price: 100000,
                      quantity: 2,
                    },
                  ],
                },
              },
            },
          },
          responses: {
            200: {
              description:
                "totalOrderValue, discountAmount, totalPriceAfterDiscount",
            },
          },
        },
      },
      "/v1/api/discount/products": {
        get: {
          tags: ["Discount"],
          summary: "Sản phẩm áp dụng được mã giảm giá",
          security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }, { ClientId: [] }],
          parameters: [
            {
              name: "code",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "shopId",
              in: "query",
              required: true,
              schema: { type: "integer" },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 50 },
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1 },
            },
          ],
          responses: {
            200: { description: "{ discount, products }" },
          },
        },
      },
    },
  },
  // Có thể gắn JSDoc trong route sau; hiện path nằm trong definition ở trên
  apis: [],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

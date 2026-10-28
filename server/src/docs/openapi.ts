import { authPaths, authSchemas } from "./auth.js";
import { cartPaths, cartSchemas } from "./cart.js";
import { orderPaths, orderSchemas } from "./orders.js";

export const openApiDocument = {
  openapi: "3.0.3",

  info: {
    title: "SDET Practice Lab API",
    version: "1.0.0",
    description: [
      "API documentation for the SDET Practice Lab shopping application.",
      "",
      "Demo application: payments are simulated.",
      "Executing write operations changes actual demo data.",
      "",
      "Documented: health, products, authentication, cart and orders.",
      "",
      "All monetary amounts are expressed in integer paise.",
      "Example prices and stock quantities are illustrative.",
      "",
      "For authenticated requests, execute POST /auth/login first.",
      "The browser manages the session cookie automatically.",
      "You do not need to enter a cookie in the Authorize dialog.",
    ].join("\n"),
  },

  servers: [
    {
      url: "/api",
      description: "API on the same origin as this documentation",
    },
  ],

  tags: [
    {
      name: "Health",
      description: "API process availability",
    },
    {
      name: "Products",
      description: "Public product catalogue and product details",
    },
    {
      name: "Authentication",
      description:
        "Account registration and browser-managed session authentication",
    },
    {
      name: "Cart",
      description: "Authenticated account carts and guest-cart transfers",
    },
    {
      name: "Orders",
      description:
        "Simulated checkout, account order history and saved receipts",
    },
  ],

  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        operationId: "getHealth",
        summary: "Check API process health",
        description:
          "Confirms that the API process responds. This endpoint does not check database connectivity.",

        responses: {
          "200": {
            description: "The API process is responding.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["status", "service"],
                  properties: {
                    status: {
                      type: "string",
                      enum: ["ok"],
                    },
                    service: {
                      type: "string",
                      enum: ["sdet-practice-lab-api"],
                    },
                  },
                },
                example: {
                  status: "ok",
                  service: "sdet-practice-lab-api",
                },
              },
            },
          },
        },
      },
    },

    "/products": {
      get: {
        tags: ["Products"],
        operationId: "getProducts",
        summary: "Get the product catalogue",
        description: [
          "Returns all products, including out-of-stock products.",
          "Authentication is not required.",
          "Products are ordered by display order, then product ID.",
          "Search, filtering, sorting and pagination currently happen in the frontend.",
          "This endpoint does not expose query parameters for those operations.",
        ].join(" "),

        responses: {
          "200": {
            description:
              "The catalogue was retrieved. An empty catalogue returns an empty products array and total 0.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["products", "total"],
                  properties: {
                    products: {
                      type: "array",
                      items: {
                        $ref: "#/components/schemas/Product",
                      },
                    },
                    total: {
                      type: "integer",
                      minimum: 0,
                      description: "Number of products in the returned array.",
                    },
                  },
                },
                example: {
                  products: [
                    {
                      id: "keyboard",
                      name: "Orbit Mechanical Keyboard",
                      description:
                        "A comfortable keyboard for everyday coding and testing.",
                      category: "Workspace",
                      pricePaise: 649900,
                      stock: 18,
                      icon: "⌨️",
                    },
                  ],
                  total: 1,
                },
              },
            },
          },

          "503": {
            description:
              "The catalogue could not be retrieved, for example because the database is unavailable.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiError",
                },
                example: {
                  error: {
                    code: "CATALOGUE_UNAVAILABLE",
                    message:
                      "Products are temporarily unavailable. Please try again.",
                  },
                },
              },
            },
          },
        },
      },
    },

    "/products/{productId}": {
      get: {
        tags: ["Products"],
        operationId: "getProduct",
        summary: "Get a product by ID",
        description: [
          "Returns one product using its exact product ID.",
          "Authentication is not required.",
          "An existing out-of-stock product still returns 200 with stock 0.",
        ].join(" "),

        parameters: [
          {
            name: "productId",
            in: "path",
            required: true,
            description: "The product ID returned by the catalogue endpoint.",
            schema: {
              type: "string",
            },
            example: "keyboard",
          },
        ],

        responses: {
          "200": {
            description: "The product was found.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["product"],
                  properties: {
                    product: {
                      $ref: "#/components/schemas/Product",
                    },
                  },
                },
                example: {
                  product: {
                    id: "keyboard",
                    name: "Orbit Mechanical Keyboard",
                    description:
                      "A comfortable keyboard for everyday coding and testing.",
                    category: "Workspace",
                    pricePaise: 649900,
                    stock: 18,
                    icon: "⌨️",
                  },
                },
              },
            },
          },

          "404": {
            description: "No product exists with the supplied ID.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiError",
                },
                example: {
                  error: {
                    code: "PRODUCT_NOT_FOUND",
                    message: "We couldn’t find a product with that ID.",
                  },
                },
              },
            },
          },

          "503": {
            description:
              "The product could not be retrieved, for example because the database is unavailable.",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/ApiError",
                },
                example: {
                  error: {
                    code: "CATALOGUE_UNAVAILABLE",
                    message:
                      "Products are temporarily unavailable. Please try again.",
                  },
                },
              },
            },
          },
        },
      },
    },

    ...authPaths,
    ...cartPaths,
    ...orderPaths,
  },

  components: {
    securitySchemes: {
      sessionCookie: {
        type: "apiKey",
        in: "cookie",
        name: "sdet_session",
        description: [
          "Obtained through POST /auth/login.",
          "The browser manages this HttpOnly cookie automatically.",
          "Use the same hostname for login and subsequent requests.",
          "Do not paste a session token into the Authorize dialog.",
        ].join(" "),
      },
    },

    schemas: {
      Product: {
        type: "object",
        required: [
          "id",
          "name",
          "description",
          "category",
          "pricePaise",
          "stock",
          "icon",
        ],
        properties: {
          id: {
            type: "string",
            description: "Unique product identifier.",
            example: "keyboard",
          },

          name: {
            type: "string",
            example: "Orbit Mechanical Keyboard",
          },

          description: {
            type: "string",
            example: "A comfortable keyboard for everyday coding and testing.",
          },

          category: {
            type: "string",
            description: "Product category.",
            example: "Workspace",
          },

          pricePaise: {
            type: "integer",
            description:
              "Unit price in integer paise. Divide by 100 to display Indian rupees.",
            example: 649900,
          },

          stock: {
            type: "integer",
            description: [
              "Current inventory quantity.",
              "Zero indicates that the product is out of stock.",
              "Adding items to a cart does not reserve or reduce stock.",
            ].join(" "),
            example: 18,
          },

          icon: {
            type: "string",
            description: "Display icon for the product.",
            example: "⌨️",
          },
        },
      },

      ApiError: {
        type: "object",
        required: ["error"],
        properties: {
          error: {
            type: "object",
            required: ["code", "message"],
            properties: {
              code: {
                type: "string",
                description: "Machine-readable error code.",
                example: "PRODUCT_NOT_FOUND",
              },

              message: {
                type: "string",
                description: "Human-readable error message.",
                example: "We couldn’t find a product with that ID.",
              },
            },
          },
        },
      },

      ...authSchemas,
      ...cartSchemas,
      ...orderSchemas,
    },
  },
};

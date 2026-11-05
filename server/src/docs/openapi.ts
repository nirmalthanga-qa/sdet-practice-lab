import { wishlistPaths, wishlistSchemas } from './wishlist.js';
import { discountPaths, discountSchemas } from './discounts.js';
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
    { name: "Wishlist", description: "Save and reorder account products." },
    { name: "Admin discounts", description: "Create and manage discount codes." },
    { name: "Admin inventory", description: "Inventory tools for authorized administrators." },
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
    ...wishlistPaths,
    ...discountPaths,
    "/admin/products/{productId}": {
  "delete": {
    "operationId": "deleteAdminProduct",
    "tags": [
      "Admin inventory"
    ],
    "summary": "Permanently delete a product",
    "description": "Also deletes linked account-cart items. Past order snapshots are preserved. Repeated deletion of a missing product returns 404. After an unconfirmed response, reload inventory before retrying.",
    "security": [
      {
        "sessionCookie": []
      }
    ],
    "parameters": [
      {
        "name": "productId",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "minLength": 1,
          "maxLength": 200
        }
      }
    ],
    "responses": {
      "204": {
        "description": "Product deleted. No response body."
      },
      "400": {
        "description": "Invalid product ID.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "401": {
        "description": "Sign in required.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "403": {
        "description": "Administrator required.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "404": {
        "description": "Product does not exist.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "503": {
        "description": "Deletion outcome unconfirmed.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      }
    }
  }
},
    "/categories": {
  "get": {
    "tags": [
      "Products"
    ],
    "operationId": "listCategories",
    "summary": "List all categories, including empty categories",
    "responses": {
      "200": {
        "description": "Available categories.",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": [
                "categories"
              ],
              "properties": {
                "categories": {
                  "type": "array",
                  "items": {
                    "type": "object",
                    "required": [
                      "name"
                    ],
                    "properties": {
                      "name": {
                        "type": "string",
                        "minLength": 1,
                        "maxLength": 60
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "503": {
        "description": "Categories unavailable."
      }
    }
  }
},
    "/admin/categories": {
  "post": {
    "tags": [
      "Admin inventory"
    ],
    "operationId": "createCategory",
    "summary": "Create a category",
    "description": "Names are trimmed, repeated whitespace is collapsed, and duplicates are rejected regardless of case.",
    "security": [
      {
        "sessionCookie": []
      }
    ],
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "required": [
              "name"
            ],
            "properties": {
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 60
              }
            },
            "additionalProperties": false
          },
          "example": {
            "name": "Gaming"
          }
        }
      }
    },
    "responses": {
      "201": {
        "description": "Category created.",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": [
                "category"
              ],
              "properties": {
                "category": {
                  "type": "object",
                  "required": [
                    "name"
                  ],
                  "properties": {
                    "name": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 60
                    }
                  }
                }
              }
            }
          }
        }
      },
      "400": {
        "description": "Invalid name."
      },
      "401": {
        "description": "Sign in required."
      },
      "403": {
        "description": "Admin access required."
      },
      "409": {
        "description": "Category already exists."
      },
      "415": {
        "description": "JSON required."
      },
      "503": {
        "description": "Outcome unconfirmed. Reload categories before retrying."
      }
    }
  }
},
    "/admin/inventory/import": {
  "post": {
    "operationId": "importAdminInventory",
    "tags": [
      "Admin inventory"
    ],
    "summary": "Atomically replace stock totals after preview",
    "description": "All rows succeed or the transaction rolls back. expectedStock must match current stock. After an uncertain response, check inventory before preparing another import.",
    "security": [
      {
        "sessionCookie": []
      }
    ],
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "items"
            ],
            "properties": {
              "items": {
                "type": "array",
                "minItems": 1,
                "maxItems": 100,
                "items": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "productId",
                    "stock",
                    "expectedStock"
                  ],
                  "properties": {
                    "productId": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 200
                    },
                    "stock": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 2147483647
                    },
                    "expectedStock": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 2147483647
                    }
                  }
                }
              }
            }
          },
          "example": {
            "items": [
              {
                "productId": "keyboard",
                "expectedStock": 18,
                "stock": 25
              }
            ]
          }
        }
      }
    },
    "responses": {
      "200": {
        "description": "All stock totals saved.",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": [
                "updatedProductCount"
              ],
              "properties": {
                "updatedProductCount": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 100
                }
              }
            }
          }
        }
      },
      "400": {
        "description": "Invalid payload or duplicate product IDs.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "401": {
        "description": "Sign in required.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "403": {
        "description": "Administrator required.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "409": {
        "description": "Inventory changed or product missing. All writes rolled back.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "415": {
        "description": "JSON required.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "503": {
        "description": "Outcome unconfirmed. Inspect inventory before retrying.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      }
    }
  }
},
    "/admin/products": {
  "post": {
    "operationId": "createAdminProduct",
    "tags": [
      "Admin inventory"
    ],
    "summary": "Create a new product",
    "security": [
      {
        "sessionCookie": []
      }
    ],
    "requestBody": {
      "required": true,
      "content": {
        "application/json": {
          "schema": {
            "type": "object",
            "additionalProperties": false,
            "required": [
              "id",
              "name",
              "description",
              "category",
              "icon",
              "pricePaise",
              "stock",
              "displayOrder"
            ],
            "properties": {
              "id": {
                "type": "string",
                "minLength": 1,
                "maxLength": 100,
                "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
              },
              "name": {
                "type": "string",
                "minLength": 1,
                "maxLength": 150
              },
              "description": {
                "type": "string",
                "minLength": 1,
                "maxLength": 2000
              },
              "category": {
                "type": "string",
                "minLength": 1, "maxLength": 60
              },
              "icon": {
                "type": "string",
                "minLength": 1,
                "maxLength": 32
              },
              "pricePaise": {
                "type": "integer",
                "minimum": 0,
                "maximum": 2147483647
              },
              "stock": {
                "type": "integer",
                "minimum": 0,
                "maximum": 2147483647
              },
              "displayOrder": {
                "type": "integer",
                "minimum": 0,
                "maximum": 2147483647
              }
            }
          },
          "example": {
            "id": "wireless-mouse",
            "name": "Orbit Wireless Mouse",
            "description": "A comfortable mouse for everyday work.",
            "category": "Workspace",
            "pricePaise": 149950,
            "stock": 20,
            "icon": "🖱️",
            "displayOrder": 10
          }
        }
      }
    },
    "responses": {
      "201": {
        "description": "Product created.",
        "content": {
          "application/json": {
            "schema": {
              "type": "object",
              "required": [
                "product"
              ],
              "properties": {
                "product": {
                  "type": "object",
                  "additionalProperties": false,
                  "required": [
                    "id",
                    "name",
                    "description",
                    "category",
                    "icon",
                    "pricePaise",
                    "stock",
                    "displayOrder"
                  ],
                  "properties": {
                    "id": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 100,
                      "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
                    },
                    "name": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 150
                    },
                    "description": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 2000
                    },
                    "category": {
                      "type": "string",
                      "minLength": 1, "maxLength": 60
                    },
                    "icon": {
                      "type": "string",
                      "minLength": 1,
                      "maxLength": 32
                    },
                    "pricePaise": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 2147483647
                    },
                    "stock": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 2147483647
                    },
                    "displayOrder": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 2147483647
                    }
                  }
                }
              }
            }
          }
        }
      },
      "400": {
        "description": "Invalid product fields.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "401": {
        "description": "Sign in required.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "403": {
        "description": "Administrator required.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "409": {
        "description": "Product ID already exists.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "415": {
        "description": "JSON required.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "503": {
        "description": "Creation unconfirmed. Check inventory before retrying with the same ID.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      }
    }
  }
},
    "/admin/inventory": {
      get: {
        operationId: "getAdminInventory",
        tags: ["Admin inventory"],
        summary: "List inventory as an administrator",
        security: [{ sessionCookie: [] }],
        responses: {
          "200": {
            description: "Inventory sorted by display order and product ID.",
            content: { "application/json": { schema: {
              type: "object", required: ["items"],
              properties: { items: { type: "array", items: {
                type: "object", required: ["id", "name", "stock", "pricePaise"],
                properties: {
                  id: { type: "string" }, name: { type: "string" },
                  stock: { type: "integer" }, pricePaise: { type: "integer" },
                },
              } } },
            } } },
          },
          "401": { description: "Missing or expired session." },
          "403": { description: "Signed-in account does not have inventory access (ADMIN_REQUIRED)." },
          "503": { description: "Session or inventory temporarily unavailable." },
        },
      },
    },
    "/admin/inventory/{productId}/stock": {
      "put": {
        "tags": [
          "Admin inventory"
        ],
        "operationId": "setAdminProductStock",
        "summary": "Set a product’s stock quantity",
        "description": "Sets the absolute stock quantity. Zero marks the product out of stock. Executing this request changes inventory.",
        "security": [
          {
            "sessionCookie": []
          }
        ],
        "parameters": [
          {
            "name": "productId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            },
            "example": "keyboard"
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "stock": {
                    "type": "integer",
                    "minimum": 0,
                    "maximum": 2147483647,
                    "example": 5
                  }
                },
                "required": [
                  "stock"
                ],
                "additionalProperties": false
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Stock saved.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "productId": {
                      "type": "string",
                      "example": "keyboard"
                    },
                    "stock": {
                      "type": "integer",
                      "minimum": 0,
                      "maximum": 2147483647,
                      "example": 5
                    }
                  },
                  "required": [
                    "productId",
                    "stock"
                  ]
                }
              }
            }
          },
          "400": {
            "description": "INVALID_STOCK: quantity is outside the allowed range or the JSON object is invalid.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiError"
                }
              }
            }
          },
          "401": {
            "description": "UNAUTHENTICATED: missing or expired session.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiError"
                }
              }
            }
          },
          "403": {
            "description": "ADMIN_REQUIRED: signed-in customer lacks inventory access.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiError"
                }
              }
            }
          },
          "404": {
            "description": "PRODUCT_NOT_FOUND: no matching product.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiError"
                }
              }
            }
          },
          "415": {
            "description": "UNSUPPORTED_MEDIA_TYPE: send application/json.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiError"
                }
              }
            }
          },
          "503": {
            "description": "SESSION_UNAVAILABLE or INVENTORY_UPDATE_FAILED. Reload inventory to confirm its current value.",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ApiError"
                }
              }
            }
          }
        }
      }
    },
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
          "Returns matching products. Without parameters, returns the full catalogue.",
          "Search is a case-insensitive literal name match. Filters combine.",
          "Default ordering is display order then ID. Pass page or pageSize to paginate. Pages beyond the last return an empty products array.",
        ].join(" "),
        parameters: [
          { name: "page", in: "query", description: "Starts at 1. Defaults to 1 when only pageSize is supplied.", schema: { type: "integer", minimum: 1, maximum: 1000000 } },
          { name: "pageSize", in: "query", description: "Defaults to 6 when only page is supplied.", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { type: "string", minLength: 1, maxLength: 60 } },
          { name: "inStock", in: "query", description: "True excludes sold-out products.", schema: { type: "boolean" } },
          { name: "maxPricePaise", in: "query", schema: { type: "integer", minimum: 0, maximum: 2147483647 } },
          { name: "sort", in: "query", schema: { type: "string", enum: ["default", "price-asc", "price-desc"] } },
        ],
        responses: {
          "400": {
            description: "Invalid, repeated or unknown parameter (INVALID_CATALOGUE_QUERY).",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ApiError" } } },
          },
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
                    page: { type: "integer", minimum: 1, description: "Present for paginated requests." },
                    pageSize: { type: "integer", minimum: 1, maximum: 100, description: "Present for paginated requests." },
                    totalPages: { type: "integer", minimum: 0, description: "Present for paginated requests." },
                    total: {
                      type: "integer",
                      minimum: 0,
                      description: "Number of all matching products before pagination.",
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
      ...wishlistSchemas,
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
            description: "Existing category name from GET /categories.",
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

      ...discountSchemas,
      ...authSchemas,
      ...cartSchemas,
      ...orderSchemas,
    },
  },
};

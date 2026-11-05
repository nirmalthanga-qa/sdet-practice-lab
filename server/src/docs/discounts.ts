export const discountSchemas = {
  "Discount": {
    "type": "object",
    "required": [
      "code",
      "type",
      "percent",
      "amountPaise",
      "minimumSubtotalPaise",
      "expiresAt",
      "isActive",
      "createdAt",
      "updatedAt"
    ],
    "properties": {
      "code": {
        "type": "string"
      },
      "type": {
        "type": "string",
        "enum": [
          "PERCENTAGE",
          "FIXED"
        ]
      },
      "minimumSubtotalPaise": {
        "type": "integer",
        "minimum": 0,
        "maximum": 2147483647,
        "default": 0
      },
      "expiresAt": {
        "type": "string",
        "format": "date-time"
      },
      "isActive": {
        "type": "boolean",
        "default": true
      },
      "percent": {
        "type": "integer",
        "nullable": true,
        "minimum": 1,
        "maximum": 100
      },
      "amountPaise": {
        "type": "integer",
        "nullable": true,
        "minimum": 1,
        "maximum": 2147483647
      },
      "createdAt": {
        "type": "string",
        "format": "date-time"
      },
      "updatedAt": {
        "type": "string",
        "format": "date-time"
      }
    }
  },
  "CreateDiscount": {
    "oneOf": [
      {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "code",
          "type",
          "expiresAt",
          "percent"
        ],
        "properties": {
          "code": {
            "type": "string",
            "minLength": 3,
            "maxLength": 32,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9-]{2,31}$",
            "description": "Trimmed and normalized to uppercase; codes are unique regardless of case."
          },
          "type": {
            "type": "string",
            "enum": [
              "PERCENTAGE"
            ]
          },
          "minimumSubtotalPaise": {
            "type": "integer",
            "minimum": 0,
            "maximum": 2147483647,
            "default": 0
          },
          "expiresAt": {
            "type": "string",
            "format": "date-time",
            "description": "Future ISO 8601 timestamp with seconds and timezone (Z or offset), without fractional seconds. Expired when server time is at or after this instant."
          },
          "isActive": {
            "type": "boolean",
            "default": true
          },
          "percent": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100
          }
        }
      },
      {
        "type": "object",
        "additionalProperties": false,
        "required": [
          "code",
          "type",
          "expiresAt",
          "amountPaise"
        ],
        "properties": {
          "code": {
            "type": "string",
            "minLength": 3,
            "maxLength": 32,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9-]{2,31}$",
            "description": "Trimmed and normalized to uppercase; codes are unique regardless of case."
          },
          "type": {
            "type": "string",
            "enum": [
              "FIXED"
            ]
          },
          "minimumSubtotalPaise": {
            "type": "integer",
            "minimum": 0,
            "maximum": 2147483647,
            "default": 0
          },
          "expiresAt": {
            "type": "string",
            "format": "date-time",
            "description": "Future ISO 8601 timestamp with seconds and timezone (Z or offset), without fractional seconds. Expired when server time is at or after this instant."
          },
          "isActive": {
            "type": "boolean",
            "default": true
          },
          "amountPaise": {
            "type": "integer",
            "minimum": 1,
            "maximum": 2147483647,
            "description": "Fixed INR discount in paise. 10000 means ₹100."
          }
        }
      }
    ]
  }
};

export const discountPaths = {
  "/admin/discounts/{code}": {
  "delete": {
    "tags": [
      "Admin discounts"
    ],
    "operationId": "deleteAdminDiscount",
    "summary": "Permanently delete a discount code",
    "description": "Admin-only. Removes the code from the discount list. Repeating deletion returns 404. Reload the list after an unconfirmed response before retrying.",
    "security": [
      {
        "sessionCookie": []
      }
    ],
    "parameters": [
      {
        "name": "code",
        "in": "path",
        "required": true,
        "schema": {
          "type": "string",
          "minLength": 3,
          "maxLength": 32,
          "pattern": "^[A-Za-z0-9][A-Za-z0-9-]{2,31}$"
        }
      }
    ],
    "responses": {
      "204": {
        "description": "Discount deleted. No response body."
      },
      "400": {
        "description": "Invalid discount code.",
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
        "description": "Discount does not exist.",
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/ApiError"
            }
          }
        }
      },
      "503": {
        "description": "Deletion could not be confirmed. Reload discounts.",
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
  "/admin/discounts": {
    "get": {
      "tags": [
        "Admin discounts"
      ],
      "security": [
        {
          "sessionCookie": []
        }
      ],
      "operationId": "listAdminDiscounts",
      "summary": "List active, inactive and expired discounts",
      "responses": {
        "200": {
          "description": "Discount records; isActive alone does not imply the code is unexpired.",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "discounts"
                ],
                "properties": {
                  "discounts": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Discount"
                    }
                  }
                }
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
          "description": "Administrator access required.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiError"
              }
            }
          }
        },
        "503": {
          "description": "Unavailable or unconfirmed outcome. Reload the discount list.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiError"
              }
            }
          }
        }
      }
    },
    "post": {
      "tags": [
        "Admin discounts"
      ],
      "security": [
        {
          "sessionCookie": []
        }
      ],
      "operationId": "createAdminDiscount",
      "summary": "Create a discount code",
      "description": "Codes can be applied at checkout. Existing order totals and discount snapshots are not changed. Codes and discount terms are immutable in this API; status can be changed separately.",
      "requestBody": {
        "required": true,
        "content": {
          "application/json": {
            "schema": {
              "$ref": "#/components/schemas/CreateDiscount"
            },
            "examples": {
              "percentage": {
                "value": {
                  "code": "SAVE10",
                  "type": "PERCENTAGE",
                  "percent": 10,
                  "minimumSubtotalPaise": 100000,
                  "expiresAt": "2030-12-31T18:29:59Z",
                  "isActive": true
                }
              },
              "fixed": {
                "value": {
                  "code": "LESS100",
                  "type": "FIXED",
                  "amountPaise": 10000,
                  "minimumSubtotalPaise": 50000,
                  "expiresAt": "2030-12-31T18:29:59Z",
                  "isActive": true
                }
              }
            }
          }
        }
      },
      "responses": {
        "201": {
          "description": "Created.",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "discount"
                ],
                "properties": {
                  "discount": {
                    "$ref": "#/components/schemas/Discount"
                  }
                }
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
          "description": "Administrator access required.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiError"
              }
            }
          }
        },
        "503": {
          "description": "Unavailable or unconfirmed outcome. Reload the discount list.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiError"
              }
            }
          }
        },
        "400": {
          "description": "Invalid fields, value or expiry.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiError"
              }
            }
          }
        },
        "409": {
          "description": "Code already exists.",
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
        }
      }
    }
  },
  "/admin/discounts/{code}/status": {
    "patch": {
      "tags": [
        "Admin discounts"
      ],
      "security": [
        {
          "sessionCookie": []
        }
      ],
      "operationId": "setAdminDiscountStatus",
      "summary": "Activate or deactivate a discount",
      "description": "Setting an already-current status succeeds. Expired discounts may be deactivated but cannot be activated.",
      "parameters": [
        {
          "name": "code",
          "in": "path",
          "required": true,
          "schema": {
            "type": "string",
            "minLength": 3,
            "maxLength": 32,
            "pattern": "^[A-Za-z0-9][A-Za-z0-9-]{2,31}$",
            "description": "Trimmed and normalized to uppercase; codes are unique regardless of case."
          }
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
                "isActive"
              ],
              "properties": {
                "isActive": {
                  "type": "boolean"
                }
              }
            },
            "example": {
              "isActive": false
            }
          }
        }
      },
      "responses": {
        "200": {
          "description": "Updated.",
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "discount"
                ],
                "properties": {
                  "discount": {
                    "$ref": "#/components/schemas/Discount"
                  }
                }
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
          "description": "Administrator access required.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiError"
              }
            }
          }
        },
        "503": {
          "description": "Unavailable or unconfirmed outcome. Reload the discount list.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiError"
              }
            }
          }
        },
        "400": {
          "description": "Invalid code or status.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiError"
              }
            }
          }
        },
        "404": {
          "description": "Code not found.",
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/ApiError"
              }
            }
          }
        },
        "409": {
          "description": "Expired code cannot be activated.",
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
        }
      }
    }
  }
};

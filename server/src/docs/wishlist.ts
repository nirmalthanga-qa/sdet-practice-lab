const security = [{ sessionCookie: [] }];
const version = { type: 'integer', minimum: 0, maximum: 2147483646 };
const request = (reorder = false) => ({ required: true, content: { 'application/json': { schema: {
  type: 'object', additionalProperties: false,
  required: reorder ? ['expectedVersion', 'productIds'] : ['expectedVersion'],
  properties: { expectedVersion: version, ...(reorder ? { productIds: { type: 'array', maxItems: 100, uniqueItems: true, items: { type: 'string', minLength: 1 } } } : {}) },
} } } });
const responses = {
  '200': { description: 'Current account wishlist, in saved order. Use its version as expectedVersion for the next write.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Wishlist' } } } },
  '400': { description: 'Invalid body or duplicate IDs.' },
  '401': { description: 'Sign in first. Wishlist ownership always comes from the session.' },
  '404': { description: 'Product to save no longer exists.' },
  '409': { description: 'Stale version, changed product set, or 100-item limit. Reload before retrying.' },
  '415': { description: 'Send application/json for writes.' },
  '503': { description: 'Unavailable or outcome unconfirmed. Reload before another write.' },
};
export const wishlistSchemas = {
  Wishlist: { type: 'object', required: ['version', 'items'], properties: {
    version: { type: 'integer', minimum: 0 },
    items: { type: 'array', maxItems: 100, items: { $ref: '#/components/schemas/Product' } },
  } },
};
export const wishlistPaths = {
  '/wishlist': { get: { tags: ['Wishlist'], security, summary: 'Read your wishlist', responses: { '200': responses['200'], '401': responses['401'], '503': responses['503'] } } },
  '/wishlist/items/{productId}': {
    parameters: [{ name: 'productId', in: 'path', required: true, schema: { type: 'string' } }],
    put: { tags: ['Wishlist'], security, summary: 'Save a product', description: 'Out-of-stock products can be saved. Does not reserve stock. A product is never duplicated. Fetch the current version before each write.', requestBody: request(), responses },
    delete: { tags: ['Wishlist'], security, summary: 'Remove a saved product', requestBody: request(), responses },
  },
  '/wishlist/order': { put: { tags: ['Wishlist'], security, summary: 'Reorder your wishlist', description: 'Send every currently saved product ID exactly once, in the desired order, plus expectedVersion. Deleted products disappear automatically.', requestBody: request(true), responses } },
};

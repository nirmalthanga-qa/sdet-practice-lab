import { inventoryImportSchema } from '../validation/inventoryImport.js';
import { Prisma } from '../generated/prisma/client.js';
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { z } from "zod";

export const adminInventoryRouter = Router();
adminInventoryRouter.use(requireAuth, requireAdmin);

adminInventoryRouter.get("/", async (_request, response) => {
  try {
    const items = await prisma.product.findMany({
      select: { id: true, name: true, stock: true, pricePaise: true },
      orderBy: [{ displayOrder: "asc" }, { id: "asc" }],
    });
    response.json({ items });
  } catch {
    response.status(503).json({
      error: {
        code: "INVENTORY_UNAVAILABLE",
        message: "Inventory is temporarily unavailable.",
      },
    });
  }
});

const stockUpdateSchema = z.strictObject({
  stock: z.number().int().min(0).max(2_147_483_647),
});

adminInventoryRouter.put("/:productId/stock", async (request, response) => {
  if (!request.is("application/json")) {
    response.status(415).json({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "Send the request body as application/json.",
      },
    });
    return;
  }

  const parsed = stockUpdateSchema.safeParse(request.body);

  if (!parsed.success) {
    response.status(400).json({
      error: {
        code: "INVALID_STOCK",
        message: "Enter a whole-number stock quantity from 0 to 2147483647.",
      },
    });
    return;
  }

  const { productId } = request.params;
  const { stock } = parsed.data;

  try {
    const result = await prisma.product.updateMany({
      where: { id: productId },
      data: { stock },
    });

    if (result.count === 0) {
      response.status(404).json({
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "We couldn’t find a product with that ID.",
        },
      });
      return;
    }

    response.status(200).json({ productId, stock });
  } catch {
    response.status(503).json({
      error: {
        code: "INVENTORY_UPDATE_FAILED",
        message:
          "We couldn’t confirm the stock update. Reload inventory to check.",
      },
    });
  }
});


class InventoryConflict extends Error {}

adminInventoryRouter.post('/import', async (request, response) => {
  if (!request.is('application/json')) {
    response.status(415).json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send application/json.' } });
    return;
  }
  const parsed = inventoryImportSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: {
      code: 'INVALID_INVENTORY_IMPORT', message: 'Provide 1–100 unique products with valid stock quantities.',
      fields: z.flattenError(parsed.error).fieldErrors,
    } });
    return;
  }
  try {
    // Consistent lock order reduces deadlock risk across overlapping imports.
    const items = [...parsed.data.items].sort((a, b) => a.productId.localeCompare(b.productId));
    await prisma.$transaction(async (transaction) => {
      for (const item of items) {
        const result = await transaction.product.updateMany({
          where: { id: item.productId, stock: item.expectedStock },
          data: { stock: item.stock },
        });
        // Throwing rolls back every earlier update in this import.
        if (result.count !== 1) throw new InventoryConflict();
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
    response.status(200).json({ updatedProductCount: items.length });
  } catch (error) {
    if (error instanceof InventoryConflict ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034')) {
      response.status(409).json({ error: {
        code: 'INVENTORY_CHANGED',
        message: 'A product was removed or stock changed since preview. No rows from this import were saved. Select the file again and review current stock.',
      } });
      return;
    }
    response.status(503).json({ error: {
      code: 'IMPORT_UNCONFIRMED',
      message: 'The import outcome could not be confirmed. Reload inventory and check stock before preparing another import.',
    } });
  }
});

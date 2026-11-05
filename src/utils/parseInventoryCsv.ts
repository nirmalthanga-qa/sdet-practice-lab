export type InventoryCsvRow = {
  line: number;
  productId: string;
  stockText: string;
  stock: number | null;
  error: string;
};

// This import format has two single-line fields; quoted fields are accepted.
function columns(line: string): string[] | null {
  const match = /^("(?:[^"]|"")*"|[^",]*),("(?:[^"]|"")*"|[^",]*)$/.exec(line);
  if (!match) return null;
  return match.slice(1).map((value) =>
    (value.startsWith('"') ? value.slice(1, -1).replace(/""/g, '"') : value).trim());
}

export function parseInventoryCsv(text: string): InventoryCsvRow[] {
  const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const header = columns(lines[0] ?? '');
  if (!header || header[0] !== 'productId' || header[1] !== 'stock') {
    throw new Error('The first line must be productId,stock in that order.');
  }
  if (lines.length < 2) throw new Error('Add at least one product row.');
  if (lines.length > 101) throw new Error('Import at most 100 product rows at a time.');
  const rows = lines.slice(1).map((line, index): InventoryCsvRow => {
    const values = columns(line);
    if (!values) return { line: index + 2, productId: '', stockText: '', stock: null, error: 'Expected two comma-separated fields on one line.' };
    const [productId, stockText] = values;
    const stock = Number(stockText);
    const validStock = /^\d+$/.test(stockText) && Number.isSafeInteger(stock) && stock <= 2_147_483_647;
    return { line: index + 2, productId, stockText, stock: validStock ? stock : null,
      error: !productId ? 'Product ID is required.' : !validStock ? 'Stock must be a whole number from 0 to 2147483647.' : '' };
  });
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.productId, (counts.get(row.productId) ?? 0) + 1);
  return rows.map((row) => row.productId && (counts.get(row.productId) ?? 0) > 1
    ? { ...row, error: [row.error, 'Duplicate product ID in this file.'].filter(Boolean).join(' ') } : row);
}

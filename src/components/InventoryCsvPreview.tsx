import { useEffect, useRef, useState } from 'react';
import { parseInventoryCsv } from '../utils/parseInventoryCsv';
import type { InventoryCsvRow } from '../utils/parseInventoryCsv';

type PreviewRow = InventoryCsvRow & { name?: string; currentStock?: number };
type Inventory = { id: string; name: string; stock: number };
function isInventory(value: unknown): value is Inventory {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'name' in value && typeof value.name === 'string' &&
    'stock' in value && typeof value.stock === 'number' && Number.isSafeInteger(value.stock) && value.stock >= 0;
}

export default function InventoryCsvPreview({ onSaved }: { onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [needsPreview, setNeedsPreview] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const savingRef = useRef(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [fileName, setFileName] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function preview(file: File | undefined) {
    if (savingRef.current) return;
    setConfirmed(false); setNeedsPreview(false); setSaveMessage('');
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRows([]); setError(''); setFileName(file?.name ?? ''); setBusy(false);
    if (!file) return;
    if (!/\.csv$/i.test(file.name) || file.size > 100_000) {
      setError('Choose a CSV file no larger than 100 KB.'); return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      if (controller.signal.aborted) return;
      const parsed = parseInventoryCsv(text);
      const response = await fetch('/api/admin/inventory', {
        credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
      });
      if (!response.ok) throw new Error(response.status === 401 ? 'Please sign in again.' :
        response.status === 403 ? 'Administrator access is required.' : 'Inventory is unavailable. Select the file again to retry.');
      const data: unknown = await response.json();
      if (typeof data !== 'object' || data === null || !('items' in data) ||
        !Array.isArray(data.items) || !data.items.every(isInventory)) throw new Error('Invalid inventory response. Select the file again to retry.');
      const inventory = new Map(data.items.map((item) => [item.id, item]));
      if (controller.signal.aborted) return;
      setRows(parsed.map((row) => {
        const product = inventory.get(row.productId);
        return { ...row, name: product?.name, currentStock: product?.stock,
          error: row.error || (!product ? 'Unknown product ID. Create the product first.' : '') };
      }));
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Preview failed. Select the file again to retry.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function saveImport() {
    if (savingRef.current || busy || needsPreview || !confirmed || rows.length === 0 ||
      rows.some((row) => row.error || row.stock === null || row.currentStock === undefined)) return;
    savingRef.current = true; setSaving(true); setError(''); setSaveMessage('');
    const controller = new AbortController();
    controllerRef.current?.abort(); controllerRef.current = controller;
    try {
      const response = await fetch('/api/admin/inventory/import', {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: rows.map((row) => ({
          productId: row.productId, expectedStock: row.currentStock, stock: row.stock,
        })) }),
      });
      if (!response.ok) throw new Error(response.status === 409
        ? 'Stock changed or a product was removed. No rows were saved. Select the file again and review the new preview.'
        : response.status === 401 ? 'Please sign in again. Prepare a fresh preview before saving.'
        : response.status === 403 ? 'Administrator access is required.'
        : response.status === 400 ? 'The import was rejected. Check the file and prepare a fresh preview.'
        : 'Save could not be confirmed. Refresh inventory and check stock before preparing another import.');
      const data: unknown = await response.json();
      if (typeof data !== 'object' || data === null || !('updatedProductCount' in data) ||
        data.updatedProductCount !== rows.length) throw new Error('Save could not be confirmed. Refresh inventory and check stock before preparing another import.');
      if (controller.signal.aborted) return;
      setSaveMessage(`${rows.length} product stock totals saved successfully.`);
      setRows([]); setConfirmed(false); setNeedsPreview(true);
      onSaved();
    } catch (cause) {
      if (!controller.signal.aborted) {
        setNeedsPreview(true); setConfirmed(false);
        setError(cause instanceof Error ? cause.message : 'Connection failed. Check inventory before preparing another import.');
      }
    } finally {
      savingRef.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  const invalidCount = rows.filter((row) => row.error).length;
  return (
    <section className="inventory-csv-preview" aria-labelledby="csv-preview-title">
      <h2 id="csv-preview-title">Import stock CSV</h2>
      <p>Review the preview, confirm replacement of stock totals, then save all rows together.</p>
      <p id="csv-format-help" className="field-help">UTF-8 CSV, up to 100 KB and 100 rows. Header: productId,stock.
        Use one product per line. Stock values replace current totals; they are not added to existing stock.</p>
      <div className="checkout-field">
        <label htmlFor="inventory-csv-file">Stock CSV file</label>
        <input ref={inputRef} id="inventory-csv-file" type="file" disabled={saving} accept=".csv,text/csv"
          aria-describedby="csv-format-help" onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            void preview(file);
            // Allow choosing the same file again after correcting it.
            event.currentTarget.value = '';
          }} />
      </div>
      <button className="clear-search-button" type="button" disabled={saving || (!fileName && !busy)}
        onClick={() => { void preview(undefined); if (inputRef.current) inputRef.current.value = ''; }}>Clear preview</button>
      <p role="status" aria-atomic="true">{saving ? 'Saving inventory…' : saveMessage || (busy ? 'Reading file and checking inventory…' : rows.length
        ? `${fileName}: ${rows.length} rows, ${invalidCount} invalid. ${invalidCount ? 'Correct the errors and select the file again.' : 'All rows are valid for preview.'}` : '')}</p>
      <p className="field-error" role="alert">{error}</p>
      {rows.length > 0 && <div className="inventory-scroll" role="region" aria-label="CSV preview table" tabIndex={0}>
        <table className="inventory-table">
          <caption>{fileName} — current stock is a snapshot taken during preview</caption>
          <thead><tr><th scope="col">CSV line</th><th scope="col">Product</th><th scope="col">Current stock</th><th scope="col">Proposed stock</th><th scope="col">Validation</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.line}>
            <th scope="row">{row.line}</th><td>{row.productId || '—'}{row.name && <p>{row.name}</p>}</td>
            <td>{row.currentStock ?? '—'}</td><td>{row.stockText || '—'}</td>
            <td className={row.error ? 'field-error' : undefined}>{row.error || 'Valid'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
      {rows.length > 0 && <div className="csv-confirm-actions">
        <label>
          <input type="checkbox" checked={confirmed} disabled={saving || busy || needsPreview || invalidCount > 0}
            onChange={(event) => setConfirmed(event.target.checked)} />
          {' '}I understand these values replace the current stock totals for all listed products.
        </label>
        <button className="primary-link" type="button"
          disabled={!confirmed || saving || busy || needsPreview || invalidCount > 0}
          onClick={() => { void saveImport(); }}>{saving ? 'Saving…' : 'Confirm and save stock'}</button>
      </div>}
    </section>
  );
}

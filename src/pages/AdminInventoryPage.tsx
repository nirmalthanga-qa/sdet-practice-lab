import DeleteProductButton from '../components/DeleteProductButton';
import InventoryCsvPreview from '../components/InventoryCsvPreview';
import AddProductForm from '../components/AddProductForm';
import { useCart } from '../hooks/useCart';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

type InventoryItem = {
  id: string;
  name: string;
  stock: number;
  pricePaise: number;
};

type InventoryState =
  | { status: 'loading' | 'forbidden' | 'expired' | 'error' }
  | { status: 'ready'; items: InventoryItem[] };

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

function isInventoryItem(value: unknown): value is InventoryItem {
  return typeof value === 'object' && value !== null &&
    'id' in value && typeof value.id === 'string' &&
    'name' in value && typeof value.name === 'string' &&
    'stock' in value && typeof value.stock === 'number' && Number.isSafeInteger(value.stock) &&
    'pricePaise' in value && typeof value.pricePaise === 'number' && Number.isSafeInteger(value.pricePaise);
}

export default function AdminInventoryPage() {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [deletionMessage, setDeletionMessage] = useState('');
  const { refreshAuth } = useAuth();
  const { retryCatalogue } = useCart();
  const [state, setState] = useState<InventoryState>({ status: 'loading' });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadInventory() {
      try {
        const response = await fetch('/api/admin/inventory', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          setState({ status: response.status === 401 ? 'expired' : 'forbidden' });
          return;
        }
        if (!response.ok) throw new Error('Inventory unavailable');

        const data: unknown = await response.json();
        if (typeof data !== 'object' || data === null || !('items' in data) ||
            !Array.isArray(data.items) || !data.items.every(isInventoryItem)) {
          throw new Error('Invalid inventory response');
        }
        if (!controller.signal.aborted) setState({ status: 'ready', items: data.items });
      } catch {
        if (!controller.signal.aborted) setState({ status: 'error' });
      }
    }

    void loadInventory();
    return () => controller.abort();
  }, [version]);

  return (
    <section className="shop-section admin-inventory-page" aria-labelledby="inventory-title">
      <h1 id="inventory-title" ref={headingRef} tabIndex={-1}>Admin inventory</h1>
      <p role="status" aria-atomic="true">{deletionMessage}</p>
      {state.status === 'ready' && <InventoryCsvPreview onSaved={() => {
        setVersion((current) => current + 1);
        retryCatalogue();
      }} />}
      {state.status === 'ready' && <AddProductForm onCreated={() => {
        setVersion((current) => current + 1);
        retryCatalogue();
      }} />}

      {state.status === 'loading' && <p role="status">Loading inventory…</p>}
      {state.status === 'forbidden' && <p role="alert">Administrator access is required.</p>}
      {state.status === 'expired' && (
        <>
          <p role="alert">Your session has expired.</p>
          <button className="primary-link" type="button" onClick={refreshAuth}>Sign in again</button>
        </>
      )}
      {state.status === 'error' && (
        <>
          <p role="alert">Inventory could not be loaded.</p>
          <button className="primary-link" type="button" onClick={() => {
            setState({ status: 'loading' });
            setVersion((current) => current + 1);
          }}>Retry inventory</button>
        </>
      )}
      {state.status === 'ready' && (state.items.length === 0 ? (
        <p>No products in inventory.</p>
      ) : (
        <div className="inventory-scroll" role="region" aria-label="Inventory table" tabIndex={0}>
          <table className="inventory-table">
            <caption>Current product stock and prices</caption>
            <thead>
              <tr>
                <th scope="col">Product</th><th scope="col">Product ID</th>
                <th scope="col">Stock</th><th scope="col">Unit price</th><th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.items.map((item) => (
                <tr key={item.id}>
                  <th scope="row">{item.name}</th><td>{item.id}</td>
                  <td><StockEditor key={`${item.id}:${item.stock}`} item={item} /></td><td>{currency.format(item.pricePaise / 100)}</td>
                  <td><DeleteProductButton product={item} onDeleted={(alreadyMissing) => {
                    setState((current) => current.status === 'ready'
                      ? { ...current, items: current.items.filter((product) => product.id !== item.id) } : current);
                    setDeletionMessage(alreadyMissing ? `${item.name} was already removed.` : `${item.name} deleted successfully.`);
                    setVersion((current) => current + 1);
                    retryCatalogue();
                    headingRef.current?.focus();
                  }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}


function StockEditor({ item }: { item: InventoryItem }) {
  const [value, setValue] = useState(String(item.stock));
  const [savedStock, setSavedStock] = useState(item.stock);
  const [busy, setBusy] = useState(false);
  const [needsReload, setNeedsReload] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const inputId = `stock-${item.id}`;

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function submit(reload: boolean) {
    if (controllerRef.current) return;
    const stock = Number(value);
    if (!reload && (!/^\d+$/.test(value) || !Number.isSafeInteger(stock) || stock > 2_147_483_647)) {
      setError('Enter a whole number from 0 to 2147483647.');
      return;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(reload ? '/api/admin/inventory' :
        `/api/admin/inventory/${encodeURIComponent(item.id)}/stock`, {
        method: reload ? 'GET' : 'PUT',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        ...(reload ? {} : {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock }),
        }),
      });
      if (!response.ok) {
        throw new Error(response.status === 401 ? 'Your session has expired. Sign in again, then reload this page.' :
          response.status === 403 ? 'Administrator access is required.' :
          'Unable to confirm stock. Reload stock before making another change.');
      }
      const data: unknown = await response.json();
      let confirmedStock: number;
      if (reload) {
        if (typeof data !== 'object' || data === null || !('items' in data) ||
          !Array.isArray(data.items) || !data.items.every(isInventoryItem)) {
          throw new Error('Invalid inventory response. Try reloading stock again.');
        }
        const current = data.items.find((product) => product.id === item.id);
        if (!current) throw new Error('This product no longer exists. Refresh the inventory page.');
        confirmedStock = current.stock;
      } else {
        if (typeof data !== 'object' || data === null || !('productId' in data) ||
          data.productId !== item.id || !('stock' in data) || data.stock !== stock) {
          throw new Error('Unable to confirm stock. Reload stock before making another change.');
        }
        confirmedStock = stock;
      }
      if (controller.signal.aborted) return;
      setSavedStock(confirmedStock);
      setValue(String(confirmedStock));
      setNeedsReload(false);
      setMessage(`${item.name}: stock ${reload ? 'reloaded' : 'saved'} as ${confirmedStock}.`);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setNeedsReload(true);
      setError(cause instanceof Error ? cause.message : 'Unable to confirm stock. Reload stock to check.');
    } finally {
      if (!controller.signal.aborted) {
        controllerRef.current = null;
        setBusy(false);
      }
    }
  }

  return (
    <form className="inventory-stock-form" noValidate onSubmit={(event) => {
      event.preventDefault();
      if (!needsReload) void submit(false);
    }}>
      <label htmlFor={inputId}>Stock for {item.name}</label>
      <p className="field-help">Last confirmed: {savedStock}. Saving replaces the stock total.</p>
      <div className="inventory-stock-actions">
        <input id={inputId} type="text" inputMode="numeric" value={value}
          disabled={busy || needsReload} aria-invalid={Boolean(error)}
          aria-describedby={`${inputId}-error`}
          onChange={(event) => { setValue(event.target.value); setError(''); setMessage(''); }} />
        <button type="submit" className="clear-search-button"
          disabled={busy || needsReload || value === String(savedStock)}>
          {busy ? 'Working…' : 'Save stock'}
        </button>
        <button type="button" className="clear-search-button" disabled={busy}
          onClick={() => { void submit(true); }}>Reload stock</button>
      </div>
      <div className="feedback-slot">
        <p role="status" aria-atomic="true">{message}</p>
        <p id={`${inputId}-error`} className="field-error" role="alert">{error}</p>
      </div>
    </form>
  );
}

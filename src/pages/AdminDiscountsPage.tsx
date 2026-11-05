import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { changeDiscountStatus, createDiscount, deleteDiscount, DiscountApiError, listDiscounts } from '../api/discounts';
import type { Discount } from '../api/discounts';
import { buildDiscount } from '../utils/discountForm';
import type { DiscountFormValues } from '../utils/discountForm';

const initial: DiscountFormValues = { code: '', type: 'PERCENTAGE', value: '', minimum: '0', expiresAt: '', isActive: true };
const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
function errorText(error: unknown) { return error instanceof Error ? error.message : 'Connection failed. Reload discounts before trying again.'; }

export default function AdminDiscountsPage() {
  const { authState } = useAuth();
  if (authState.status !== 'authenticated' || !authState.user.isAdmin) {
    return <section className="shop-section"><h1>Discounts</h1><p role="alert">Administrator access is required.</p></section>;
  }
  return <DiscountManager key={authState.user.id} />;
}

function DiscountManager() {
  const { refreshAuth } = useAuth();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [values, setValues] = useState(initial);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [needsReload, setNeedsReload] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [accessError, setAccessError] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now);
  const mutationRef = useRef<AbortController | null>(null);
  const loadBusyRef = useRef(true);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => { window.clearInterval(timer); mutationRef.current?.abort(); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const items = await listDiscounts(controller.signal);
        if (controller.signal.aborted) return;
        setDiscounts(items); setLoaded(true); setNeedsReload(false); setError('');
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(errorText(cause)); setNeedsReload(true);
        if (cause instanceof DiscountApiError && [401, 403].includes(cause.status)) setAccessError(cause.status);
      } finally {
        if (!controller.signal.aborted) { loadBusyRef.current = false; setLoading(false); }
      }
    }
    void load(); return () => controller.abort();
  }, [version]);

  function reload() {
    if (mutationRef.current || loadBusyRef.current) return;
    loadBusyRef.current = true; setLoading(true); setMessage('');
    setVersion((current) => current + 1);
  }
  async function save(existing?: Discount) {
    if (mutationRef.current || loadBusyRef.current || !loaded || needsReload) return;
    setError(''); setMessage('');
    let input;
    try { if (!existing) input = buildDiscount(values); }
    catch (cause) { setError(errorText(cause)); return; }
    const controller = new AbortController(); mutationRef.current = controller;
    setBusyCode(existing?.code ?? '__create__');
    try {
      const result = existing
        ? await changeDiscountStatus(existing.code, !existing.isActive, controller.signal)
        : await createDiscount(input!, controller.signal);
      if (controller.signal.aborted) return;
      setDiscounts((current) => [result, ...current.filter((item) => item.code !== result.code)]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.code.localeCompare(b.code)));
      setNow(Date.now());
      setMessage(existing ? `${result.code} ${result.isActive ? 'activated' : 'deactivated'}.` : `${result.code} created.`);
      if (!existing) setValues(initial);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setError(errorText(cause)); setNeedsReload(true);
      if (cause instanceof DiscountApiError && [401, 403].includes(cause.status)) setAccessError(cause.status);
    } finally {
      if (!controller.signal.aborted) { mutationRef.current = null; setBusyCode(null); }
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || mutationRef.current || loadBusyRef.current || needsReload || !loaded) return;
    const code = deleteTarget;
    const controller = new AbortController(); mutationRef.current = controller;
    setBusyCode(code); setDeleteError(''); setError(''); setMessage('');
    try {
      const result = await deleteDiscount(code, controller.signal);
      if (controller.signal.aborted) return;
      dialogRef.current?.close(); setDeleteTarget(null);
      setDiscounts((current) => current.filter((discount) => discount.code !== code));
      setMessage(result === 'missing' ? `${code} was already removed.` : `${code} deleted successfully.`);
      headingRef.current?.focus();
    } catch (cause) {
      if (controller.signal.aborted) return;
      setNeedsReload(true);
      setDeleteError(`${errorText(cause)} Close this dialog and reload discounts before making more changes.`);
      if (cause instanceof DiscountApiError && [401, 403].includes(cause.status)) {
        dialogRef.current?.close(); setAccessError(cause.status);
      }
    } finally {
      if (!controller.signal.aborted) { mutationRef.current = null; setBusyCode(null); }
    }
  }

  if (accessError) return <section className="shop-section"><h1>Discounts</h1>
    <p role="alert">{accessError === 401 ? 'Your session expired. Please sign in again.' : 'Administrator access is required.'}</p>
    <button className="primary-link" type="button" onClick={refreshAuth}>Check account</button>
  </section>;

  const blocked = loading || busyCode !== null || needsReload || !loaded;
  return <section className="shop-section" aria-labelledby="discounts-title">
    <h1 id="discounts-title" ref={headingRef} tabIndex={-1}>Admin discounts</h1>
    <p>Create percentage or fixed-amount codes for customers to apply at checkout.</p>
    <button className="clear-search-button" type="button" aria-disabled={loading || busyCode !== null} onClick={reload}>Reload discounts</button>
    <p className="refresh-status" role="status" aria-atomic="true">{loading ? loaded ? 'Refreshing discounts…' : 'Loading discounts…' : busyCode ? deleteTarget ? 'Deleting discount…' : 'Saving discount…' : message}</p>
    <p className="refresh-status field-error" role="alert">{error}{needsReload && ' Reload discounts before making more changes.'}</p>

    <form className="checkout-form discount-create-form" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <h2>Create discount</h2>
      <fieldset className="admin-product-fields" disabled={busyCode === '__create__'}>
        <legend>All fields are required</legend>
        <div className="checkout-field"><label htmlFor="discount-code">Code</label>
          <input id="discount-code" required maxLength={32} value={values.code} autoCapitalize="characters"
            onChange={(event) => setValues({ ...values, code: event.target.value })} />
        </div>
        <div className="category-field"><label htmlFor="discount-type">Discount type</label>
          <select id="discount-type" value={values.type} onChange={(event) => setValues({ ...values, type: event.target.value === 'FIXED' ? 'FIXED' : 'PERCENTAGE', value: '' })}>
            <option value="PERCENTAGE">Percentage</option><option value="FIXED">Fixed amount</option>
          </select>
        </div>
        <div className="checkout-field"><label htmlFor="discount-value">{values.type === 'PERCENTAGE' ? 'Percentage (1–100)' : 'Discount amount (₹)'}</label>
          <input id="discount-value" required type="text" inputMode={values.type === 'PERCENTAGE' ? 'numeric' : 'decimal'} maxLength={20} value={values.value}
            onChange={(event) => setValues({ ...values, value: event.target.value })} />
        </div>
        <div className="checkout-field"><label htmlFor="discount-minimum">Minimum order subtotal (₹)</label>
          <input id="discount-minimum" required type="text" inputMode="decimal" maxLength={20} value={values.minimum}
            onChange={(event) => setValues({ ...values, minimum: event.target.value })} />
        </div>
        <div className="checkout-field"><label htmlFor="discount-expiry">Expires at</label>
          <input id="discount-expiry" required type="datetime-local" value={values.expiresAt} aria-describedby="discount-timezone"
            onChange={(event) => setValues({ ...values, expiresAt: event.target.value })} />
          <p id="discount-timezone" className="field-help">Your local timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}. The code expires at this exact time.</p>
        </div>
        <label className="discount-active-field"><input type="checkbox" checked={values.isActive}
          onChange={(event) => setValues({ ...values, isActive: event.target.checked })} /> Active when created</label>
        <button className="primary-link checkout-submit" type="submit" aria-disabled={blocked}>Create discount</button>
      </fieldset>
    </form>

    <h2>Existing discounts</h2>
    {loaded && discounts.length === 0 && <p>No discount codes yet.</p>}
    {discounts.length > 0 && <div className="inventory-scroll" role="region" aria-label="Discount table" tabIndex={0}>
      <table className="inventory-table"><caption>Discount terms and status · expiry times shown in your local timezone</caption>
        <thead><tr><th scope="col">Code</th><th scope="col">Discount</th><th scope="col">Minimum subtotal</th><th scope="col">Expires</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead>
        <tbody>{discounts.map((discount) => {
          const expired = Date.parse(discount.expiresAt) <= now;
          const cannotActivate = expired && !discount.isActive;
          return <tr key={discount.code}><th scope="row">{discount.code}</th>
            <td>{discount.type === 'PERCENTAGE' ? `${discount.percent}%` : currency.format((discount.amountPaise ?? 0) / 100)}</td>
            <td>{currency.format(discount.minimumSubtotalPaise / 100)}</td>
            <td><time dateTime={discount.expiresAt}>{dateFormat.format(new Date(discount.expiresAt))}</time></td>
            <td>{expired ? 'Expired' : discount.isActive ? 'Active' : 'Inactive'}</td>
            <td><div className="discount-row-actions"><button className="clear-search-button discount-status-button" type="button" aria-disabled={blocked || cannotActivate}
              aria-label={`${discount.isActive ? 'Deactivate' : 'Activate'} ${discount.code}`}
              onClick={() => { if (!blocked && !cannotActivate) void save(discount); }}>
              {busyCode === discount.code && !deleteTarget ? 'Saving…' : discount.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button className="delete-product-button" type="button" aria-label={`Delete discount ${discount.code}`}
              aria-disabled={blocked} onClick={() => {
                if (blocked || mutationRef.current || loadBusyRef.current) return;
                setDeleteTarget(discount.code); setDeleteError('');
                dialogRef.current?.showModal(); cancelRef.current?.focus();
              }}>Delete</button>
            </div></td>
          </tr>;
        })}</tbody>
      </table>
    </div>}
    <dialog ref={dialogRef} className="confirmation-dialog" aria-labelledby="delete-discount-title"
      aria-describedby="delete-discount-description" onCancel={(event) => {
        if (mutationRef.current) event.preventDefault();
      }} onClose={() => setDeleteTarget(null)}>
      <h2 id="delete-discount-title">Delete discount {deleteTarget}?</h2>
      <p id="delete-discount-description">This permanently removes the discount code. To keep it for later, cancel and deactivate it instead.</p>
      <div className="dialog-actions">
        <button ref={cancelRef} className="dialog-cancel-button" type="button" disabled={busyCode !== null}
          onClick={() => dialogRef.current?.close()}>{deleteError ? 'Close' : 'Cancel'}</button>
        <button className="delete-product-button" type="button" disabled={busyCode !== null || needsReload}
          onClick={() => { void confirmDelete(); }}>{busyCode !== null ? 'Deleting…' : 'Yes, delete discount'}</button>
      </div>
      <p className="refresh-status" role="status">{busyCode !== null ? 'Deleting discount…' : ''}</p>
      <p className="refresh-status field-error" role="alert">{deleteError}</p>
    </dialog>
  </section>;
}

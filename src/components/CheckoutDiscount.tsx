import { useEffect, useRef, useState } from 'react';
import { quoteDiscount } from '../api/orders';
import { checkoutItemsKey } from '../types/order';
import type { CheckoutItem, DiscountQuote } from '../types/order';
export type AppliedDiscount = DiscountQuote & { itemsKey: string };

type Props = { items: CheckoutItem[]; disabled: boolean; applied: AppliedDiscount | null; onBusyChange: (busy: boolean) => void; onChange: (quote: AppliedDiscount | null) => void };
export default function CheckoutDiscount({ items, disabled, applied, onChange, onBusyChange }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const key = checkoutItemsKey(items);
  useEffect(() => () => { controllerRef.current?.abort(); onBusyChange(false); }, [onBusyChange]);
  async function apply() {
    if (disabled || controllerRef.current) return;
    const normalized = code.trim().toUpperCase();
    setError(''); onChange(null);
    if (!/^[A-Z0-9][A-Z0-9-]{2,31}$/.test(normalized)) {
      setError('Enter a code of 3–32 letters, digits or hyphens.'); return;
    }
    const controller = new AbortController(); controllerRef.current = controller; setBusy(true); onBusyChange(true);
    try {
      const quote = await quoteDiscount(normalized, items, controller.signal);
      if (!controller.signal.aborted) { onChange({ ...quote, itemsKey: key }); setCode(normalized); }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Unable to check the code. Try again.');
    } finally {
      if (!controller.signal.aborted) { controllerRef.current = null; setBusy(false); onBusyChange(false); }
    }
  }
  function clear() {
    controllerRef.current?.abort(); controllerRef.current = null;
    setBusy(false); onBusyChange(false); setCode(''); setError(''); onChange(null);
  }
  const current = applied?.itemsKey === key ? applied : null;
  return <section className="checkout-discount" aria-labelledby="checkout-discount-title">
    <h2 id="checkout-discount-title">Discount code</h2>
    <form onSubmit={(event) => { event.preventDefault(); void apply(); }}>
      <div className="checkout-field"><label htmlFor="checkout-discount-code">Code (optional)</label>
        <input id="checkout-discount-code" value={code} maxLength={32} autoCapitalize="characters" disabled={disabled || busy}
          onChange={(event) => { setCode(event.target.value); setError(''); onChange(null); }} />
      </div>
      <div className="cart-actions">
        <button className="clear-search-button" type="submit" disabled={disabled || busy}>{busy ? 'Checking…' : 'Apply code'}</button>
        <button className="clear-search-button" type="button" disabled={disabled || (!code && !applied)} onClick={clear}>Remove code</button>
      </div>
    </form>
    <div className="feedback-slot">
      <p className="refresh-status" role="status" aria-atomic="true">{busy ? 'Checking discount…' : current ? `${current.discountCode} applied.` : applied ? 'Your cart changed. Apply the code again.' : 'Apply a code to include it in your order.'}</p>
      <p className="refresh-status field-error" role="alert">{error}</p>
    </div>
    <p className="field-help">Codes are checked again when placing the order. Only one code per order.</p>
  </section>;
}

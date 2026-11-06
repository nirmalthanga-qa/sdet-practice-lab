import { useEffect, useRef, useState } from 'react';
import { cancelOrder, OrderApiError } from '../api/orders';
import type { Order } from '../types/order';
export default function CancelOrderButton({ orderId, onCancelled }: { orderId: string; onCancelled: (order: Order) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  useEffect(() => () => controllerRef.current?.abort(), []);
  async function confirm() {
    if (controllerRef.current || blocked) return;
    const controller = new AbortController(); controllerRef.current = controller;
    setBusy(true); setError('');
    try {
      const order = await cancelOrder(orderId, controller.signal);
      if (!controller.signal.aborted) { dialogRef.current?.close(); onCancelled(order); }
    } catch (cause) {
      if (!controller.signal.aborted) {
        const definite = cause instanceof OrderApiError && [400, 401, 404, 409, 415].includes(cause.status);
        setBlocked(definite);
        setError((cause instanceof Error ? cause.message : 'Connection failed.') +
          (definite ? ' Close and reload the order after resolving this issue.' : ' Retry cancellation for this order; stock will not be restored twice.'));
      }
    } finally {
      if (!controller.signal.aborted) { controllerRef.current = null; setBusy(false); }
    }
  }
  return <>
    <button className="delete-product-button" type="button" onClick={() => {
      dialogRef.current?.showModal(); keepRef.current?.focus();
    }}>Cancel order</button>
    <dialog ref={dialogRef} className="confirmation-dialog" aria-labelledby="cancel-order-title"
      aria-describedby="cancel-order-description" onCancel={(event) => { if (controllerRef.current) event.preventDefault(); }}>
      <h2 id="cancel-order-title">Cancel this order?</h2>
      <p id="cancel-order-description">This cancels the whole order and returns quantities to products still in the catalogue. Your order history stays available. Payment is simulated; no real refund is needed.</p>
      <div className="dialog-actions">
        <button ref={keepRef} className="dialog-cancel-button" type="button" disabled={busy}
          onClick={() => dialogRef.current?.close()}>{error ? 'Close' : 'Keep order'}</button>
        <button className="delete-product-button" type="button" disabled={busy || blocked}
          onClick={() => { void confirm(); }}>{busy ? 'Cancelling…' : error ? 'Retry cancellation' : 'Yes, cancel order'}</button>
      </div>
      <div className="feedback-slot">
        <p className="refresh-status" role="status">{busy ? 'Cancelling your order…' : ''}</p>
        <p className="refresh-status field-error" role="alert">{error}</p>
      </div>
    </dialog>
  </>;
}

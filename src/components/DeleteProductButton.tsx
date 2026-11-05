import { useEffect, useRef, useState } from 'react';

type Props = { product: { id: string; name: string }; onDeleted: (alreadyMissing: boolean) => void };

export default function DeleteProductButton({ product, onDeleted }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  const titleId = `delete-product-title-${product.id}`;
  const descriptionId = `delete-product-description-${product.id}`;
  useEffect(() => () => controllerRef.current?.abort(), []);

  async function deleteProduct() {
    if (controllerRef.current || needsReload) return;
    const controller = new AbortController(); controllerRef.current = controller;
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/admin/products/${encodeURIComponent(product.id)}`, {
        method: 'DELETE', credentials: 'same-origin', signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (response.status === 204 || response.status === 404) {
        dialogRef.current?.close();
        onDeleted(response.status === 404);
        return;
      }
      throw new Error(response.status === 401 ? 'Your session expired. Sign in again and reload inventory.' :
        response.status === 403 ? 'Administrator access is required.' :
        'Deletion could not be confirmed. Close this dialog and reload the page before trying again.');
    } catch (cause) {
      if (!controller.signal.aborted) {
        setNeedsReload(true);
        setError(cause instanceof Error ? cause.message : 'Check inventory before trying again.');
      }
    } finally {
      if (!controller.signal.aborted) { controllerRef.current = null; setBusy(false); }
    }
  }

  return <>
    <button className="delete-product-button" type="button" aria-label={`Delete ${product.name}`}
      onClick={() => { dialogRef.current?.showModal(); cancelRef.current?.focus(); }}>Delete product</button>
    <dialog ref={dialogRef} className="confirmation-dialog" aria-labelledby={titleId}
      aria-describedby={descriptionId} onCancel={(event) => { if (controllerRef.current) event.preventDefault(); }}>
      <h2 id={titleId}>Delete {product.name}?</h2>
      <p id={descriptionId}>This permanently removes the product and its account-cart items. Past orders are kept.</p>
      <p>Product ID: {product.id}</p>
      <div className="dialog-actions">
        <button ref={cancelRef} className="dialog-cancel-button" type="button" disabled={busy}
          onClick={() => dialogRef.current?.close()}>{needsReload ? 'Close' : 'Cancel'}</button>
        <button className="delete-product-button" type="button" disabled={busy || needsReload}
          onClick={() => { void deleteProduct(); }}>{busy ? 'Deleting…' : 'Yes, delete product'}</button>
      </div>
      <p role="status" aria-atomic="true">{busy ? 'Deleting product…' : ''}</p>
      <p role="alert" className="field-error">{error}</p>
    </dialog>
  </>;
}

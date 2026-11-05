import { useEffect, useRef, useState } from 'react';
import { isCategory } from '../hooks/useCategories';

export default function CreateCategoryForm({ onCreated }: { onCreated: (name: string) => void }) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);
  async function create() {
    if (controllerRef.current) return;
    setMessage(''); setError('');
    if (!name.trim()) { setError('Enter a category name.'); return; }
    const controller = new AbortController(); controllerRef.current = controller; setBusy(true);
    try {
      const response = await fetch('/api/admin/categories', {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(response.status === 409 ? 'That category already exists. Reload categories and select it.' :
        response.status === 400 ? 'Use 1–60 characters: letters, numbers, spaces, &, parentheses, apostrophes or hyphens.' :
        response.status === 401 ? 'Please sign in again.' : response.status === 403 ? 'Administrator access is required.' :
        'Creation could not be confirmed. Reload categories before retrying.');
      const data: unknown = await response.json();
      if (response.status !== 201 || typeof data !== 'object' || data === null ||
        !('category' in data) || !isCategory(data.category)) throw new Error('Reload categories to check whether creation succeeded.');
      if (controller.signal.aborted) return;
      onCreated(data.category.name); setName(''); setMessage(`Category ${data.category.name} created and selected.`);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Reload categories before retrying.');
    } finally { if (!controller.signal.aborted) { controllerRef.current = null; setBusy(false); } }
  }
  return <form className="category-create-form checkout-form" onSubmit={(event) => { event.preventDefault(); void create(); }}>
    <div className="checkout-field">
      <label htmlFor="new-category-name">New category name</label>
      <input id="new-category-name" value={name} required maxLength={60} disabled={busy}
        aria-describedby="category-name-help" onChange={(event) => { setName(event.target.value); setError(''); setMessage(''); }} />
      <p id="category-name-help" className="field-help">For example, Gaming or Accessories. Names are unique regardless of letter case.</p>
    </div>
    <button className="clear-search-button" type="submit" disabled={busy}>{busy ? 'Adding category…' : 'Add category'}</button>
    <p role="status" aria-atomic="true">{message}</p><p className="field-error" role="alert">{error}</p>
  </form>;
}

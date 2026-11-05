import CreateCategoryForm from './CreateCategoryForm';
import { useCategories } from '../hooks/useCategories';
import { useEffect, useRef, useState } from 'react';
import { isProduct } from '../utils/isProduct';
import type { Product } from '../types/product';

type Props = { onCreated: (product: Product) => void };
const initial = { id: '', name: '', description: '', category: '', price: '', stock: '0', icon: '📦', displayOrder: '0' };
const fields = [
  { name: 'id', label: 'Product ID', max: 100, pattern: '[a-z0-9]+(-[a-z0-9]+)*', help: 'Unique lowercase letters, numbers and hyphens, such as wireless-mouse.' },
  { name: 'name', label: 'Product name', max: 150 },
  { name: 'price', label: 'Price (₹)', pattern: '[0-9]+([.][0-9]{1,2})?', help: 'Up to two decimal places. For example, 1499.50.' },
  { name: 'stock', label: 'Initial stock', pattern: '[0-9]+' },
  { name: 'icon', label: 'Product icon', max: 32, help: 'Enter an emoji or short text.' },
  { name: 'displayOrder', label: 'Display order', pattern: '[0-9]+', help: 'Lower numbers appear first in default sorting.' },
] as const;

export default function AddProductForm({ onCreated }: Props) {
  const { categories, status: categoryStatus, reload: reloadCategories } = useCategories();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);

  async function createProduct() {
    if (requestRef.current || categoryStatus !== 'ready') return;
    setError(''); setMessage('');
    // Convert decimal text to paise without floating-point multiplication.
    const [rupees, fraction = ''] = values.price.split('.');
    const pricePaise = Number(rupees) * 100 + Number(fraction.padEnd(2, '0'));
    const stock = Number(values.stock);
    const displayOrder = Number(values.displayOrder);
    if (!values.name.trim() || !values.description.trim() || !values.icon.trim() ||
      ![pricePaise, stock, displayOrder].every((n) => Number.isSafeInteger(n) && n >= 0 && n <= 2_147_483_647)) {
      setError('Complete every field. Price must be at most ₹21,474,836.47; stock and display order must be whole numbers from 0 to 2147483647.');
      return;
    }
    const controller = new AbortController();
    requestRef.current = controller; setBusy(true);
    try {
      const response = await fetch('/api/admin/products', {
        method: 'POST', credentials: 'same-origin', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: values.id, name: values.name.trim(), description: values.description.trim(),
          category: values.category, icon: values.icon.trim(), pricePaise, stock, displayOrder,
        }),
      });
      if (!response.ok) {
        throw new Error(response.status === 409 ? 'This product ID already exists. Check inventory before choosing another ID.' :
          response.status === 401 ? 'Your session has expired. Sign in again.' :
          response.status === 403 ? 'Administrator access is required.' :
          response.status === 400 ? 'Check the product details and field limits.' :
          'Creation could not be confirmed. Check inventory for this ID before retrying with the same ID.');
      }
      const data: unknown = await response.json();
      if (response.status !== 201 || typeof data !== 'object' || data === null ||
        !('product' in data) || !isProduct(data.product) || data.product.id !== values.id) {
        throw new Error('Creation could not be confirmed. Check inventory before retrying with the same ID.');
      }
      if (controller.signal.aborted) return;
      onCreated(data.product);
      setMessage(`${data.product.name} created successfully. It is now available in the shop.`);
      setValues(initial);
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message :
        'Connection failed. Check inventory before retrying with the same product ID.');
    } finally {
      if (!controller.signal.aborted) { requestRef.current = null; setBusy(false); }
    }
  }

  return (
    <section className="admin-add-product" aria-labelledby="add-product-title">
      <h2 id="add-product-title">Add product</h2>
      <CreateCategoryForm onCreated={(name) => {
        setValues((current) => ({ ...current, category: name })); reloadCategories();
      }} />
      <p role="status">{categoryStatus === 'loading' ? 'Loading categories…' : ''}</p>
      {categoryStatus === 'error' && <p role="alert">Categories could not be loaded. Reload to try again.</p>}
      <button className="clear-search-button" type="button" disabled={busy || categoryStatus === 'loading'} onClick={reloadCategories}>Reload categories</button>
      <form className="checkout-form" aria-busy={busy} onSubmit={(event) => {
        event.preventDefault(); void createProduct();
      }}>
        <fieldset disabled={busy} className="admin-product-fields">
          <legend>Product details — all fields required</legend>
          {fields.map((field) => (
            <div className="checkout-field" key={field.name}>
              <label htmlFor={`new-product-${field.name}`}>{field.label}</label>
              <input id={`new-product-${field.name}`} name={field.name} required type="text"
                maxLength={'max' in field ? field.max : 20}
                pattern={'pattern' in field ? field.pattern : undefined}
                inputMode={field.name === 'price' ? 'decimal' : field.name === 'stock' || field.name === 'displayOrder' ? 'numeric' : 'text'}
                aria-describedby={'help' in field ? `new-product-${field.name}-help` : undefined}
                value={values[field.name]} onChange={(event) => {
                  setValues({ ...values, [field.name]: event.target.value }); setError(''); setMessage('');
                }} />
              {'help' in field && <p className="field-help" id={`new-product-${field.name}-help`}>{field.help}</p>}
            </div>
          ))}
          <div className="checkout-field">
            <label htmlFor="new-product-description">Description</label>
            <textarea id="new-product-description" required maxLength={2000} rows={3}
              value={values.description} onChange={(event) => setValues({ ...values, description: event.target.value })} />
          </div>
          <div className="category-field">
            <label htmlFor="new-product-category">Category</label>
            <select id="new-product-category" required disabled={categoryStatus !== 'ready'} value={values.category}
              onChange={(event) => setValues({ ...values, category: event.target.value })}>
              <option value="">Select category</option>
              {values.category && !categories.some((category) => category.name === values.category) &&
                <option value={values.category}>{values.category}</option>}
              {categories.map((category) => <option key={category.name} value={category.name}>{category.name}</option>)}
            </select>
          </div>
          <button className="primary-link checkout-submit" type="submit" disabled={categoryStatus !== 'ready'}>{busy ? 'Creating…' : 'Create product'}</button>
        </fieldset>
        <p role="status" aria-atomic="true">{busy ? 'Creating product…' : message}</p>
        <p role="alert" className="field-error">{error}</p>
      </form>
    </section>
  );
}

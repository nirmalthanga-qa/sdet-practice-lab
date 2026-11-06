import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

type Account = {
  id: string; fullName: string; email: string; createdAt: string;
  orderCount: number; isAdmin: boolean;
};
type Result = { page: number; hasNext: boolean; users: Account[] };

function isAccount(value: unknown): value is Account {
  if (typeof value !== 'object' || !value) return false;
  return 'id' in value && typeof value.id === 'string' &&
    'fullName' in value && typeof value.fullName === 'string' &&
    'email' in value && typeof value.email === 'string' &&
    'createdAt' in value && typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    'orderCount' in value && typeof value.orderCount === 'number' &&
    Number.isSafeInteger(value.orderCount) && value.orderCount >= 0 &&
    'isAdmin' in value && typeof value.isAdmin === 'boolean';
}

async function failure(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.error?.message === 'string' ? data.error.message : fallback;
}

export default function AdminUsersPage() {
  const { authState } = useAuth();
  if (authState.status !== 'authenticated' || !authState.user.isAdmin) {
    return <section className="shop-section"><h1>User accounts</h1><p role="alert">Administrator access is required.</p></section>;
  }
  return <Accounts key={authState.user.id} />;
}

function Accounts() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [target, setTarget] = useState<Account | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const locked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/admin/users?page=' + page, { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error(await failure(response, 'Accounts could not be loaded.'));
        const data = await response.json();
        if (data.page !== page || typeof data.hasNext !== 'boolean' || !Array.isArray(data.users) || !data.users.every(isAccount)) {
          throw new Error('Invalid account list. Please reload.');
        }
        if (!controller.signal.aborted) setResult(data);
      } catch (cause) {
        if (!controller.signal.aborted) {
          setResult(null);
          setError(cause instanceof Error ? cause.message : 'Could not load accounts.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [page, revision]);

  function loadPage(next: number) {
    setLoading(true);
    setError('');
    setPage(next);
    setRevision(value => value + 1);
  }

  async function confirm() {
    if (!target || locked.current) return;
    locked.current = true;
    setDeleting(true);
    setNotice('');
    try {
      const response = await fetch('/api/admin/users/' + encodeURIComponent(target.id), { method: 'DELETE' });
      if (response.status !== 204) throw new Error(await failure(response, 'Deletion could not be confirmed.'));
      setNotice('Deleted account for ' + target.email + '.');
      loadPage(page > 1 && result?.users.length === 1 ? page - 1 : page);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Deletion could not be confirmed. Reload accounts.');
    } finally {
      locked.current = false;
      setDeleting(false);
      dialog.current?.close();
      setTarget(null);
      title.current?.focus({ preventScroll: true });
    }
  }

  return <section className="shop-section admin-users" aria-labelledby="users-title">
    <h1 id="users-title" ref={title} tabIndex={-1}>User accounts</h1>
    <button className="clear-search-button" type="button" disabled={loading || deleting}
      onClick={() => { setNotice(''); loadPage(page); }}>Reload accounts</button>
    <div className="feedback-slot">
      <p role="status">{loading ? 'Loading accounts…' : notice}</p>
      <p role="alert" className="field-error">{error}</p>
    </div>
    {result && <div className="inventory-scroll" role="region" aria-label="Registered accounts" tabIndex={0}>
      <table className="inventory-table"><caption>Registered accounts</caption>
        <thead><tr>{['Name', 'Email', 'Registered', 'Orders', 'Account action'].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{result.users.map(user => <tr key={user.id}>
          <th scope="row">{user.fullName}</th><td>{user.email}</td>
          <td>{new Date(user.createdAt).toLocaleDateString()}</td><td>{user.orderCount}</td>
          <td>{user.isAdmin ? 'Protected administrator' :
            <button className="delete-product-button" type="button" disabled={loading || deleting || Boolean(error)}
              aria-label={'Delete account for ' + user.email}
              onClick={() => { setTarget(user); dialog.current?.showModal(); }}>Delete account</button>}
          </td></tr>)}</tbody>
      </table>{result.users.length === 0 && <p>No accounts on this page.</p>}
    </div>}
    <nav className="shop-pagination" aria-label="Account pages">
      <button type="button" className="clear-search-button" disabled={loading || deleting || page <= 1} onClick={() => loadPage(page - 1)}>Previous</button>
      <p>Page {page}</p>
      <button type="button" className="clear-search-button" disabled={loading || deleting || !result?.hasNext} onClick={() => loadPage(page + 1)}>Next</button>
    </nav>
    <dialog ref={dialog} className="confirmation-dialog" aria-labelledby="delete-user-title" aria-describedby="delete-user-details"
      onCancel={event => { if (locked.current) event.preventDefault(); }} onClose={() => setTarget(null)}>
      <h2 id="delete-user-title">Delete this account?</h2>
      <p id="delete-user-details">This permanently deletes {target?.email}, its active sessions, saved cart and wishlist. Existing orders keep their items and totals. The account link and delivery details are removed, and stock levels stay the same.</p>
      <div className="dialog-actions">
        <button type="button" className="dialog-cancel-button" disabled={deleting} onClick={() => dialog.current?.close()}>Keep account</button>
        <button type="button" className="dialog-confirm-button" disabled={deleting} onClick={() => void confirm()}>{deleting ? 'Deleting…' : 'Delete account'}</button>
      </div>
    </dialog>
  </section>;
}

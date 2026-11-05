import { useEffect, useRef, useState } from 'react';
export type Category = { name: string };
export function isCategory(value: unknown): value is Category {
  return typeof value === 'object' && value !== null && 'name' in value &&
    typeof value.name === 'string' && value.name.trim().length > 0;
}
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const loadedRef = useRef(false);
  const refreshingRef = useRef(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/categories', { cache: 'no-store', signal: controller.signal });
        if (!response.ok) throw new Error('Categories unavailable');
        const data: unknown = await response.json();
        if (typeof data !== 'object' || data === null || !('categories' in data) ||
          !Array.isArray(data.categories) || !data.categories.every(isCategory) ||
          new Set(data.categories.map((category) => category.name)).size !== data.categories.length) throw new Error('Invalid categories');
        if (!controller.signal.aborted) { loadedRef.current = true; setCategories(data.categories); setStatus('ready'); setRefreshError(''); }
      } catch {
        if (!controller.signal.aborted) {
          if (!loadedRef.current) setStatus('error');
          setRefreshError('Categories could not be refreshed. Previously loaded choices remain available.');
        }
      } finally {
        if (!controller.signal.aborted) { refreshingRef.current = false; setRefreshing(false); }
      }
    }
    void load(); return () => controller.abort();
  }, [version]);
  function reload() {
    if (refreshingRef.current) return;
    refreshingRef.current = true; setRefreshing(true); setRefreshError('');
    if (!loadedRef.current) setStatus('loading');
    setVersion((current) => current + 1);
  }
  return { categories, status, refreshing, refreshError, reload };
}

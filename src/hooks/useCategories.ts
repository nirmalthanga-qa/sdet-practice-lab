import { useEffect, useState } from 'react';
export type Category = { name: string };
export function isCategory(value: unknown): value is Category {
  return typeof value === 'object' && value !== null && 'name' in value &&
    typeof value.name === 'string' && value.name.trim().length > 0;
}
export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
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
        if (!controller.signal.aborted) { setCategories(data.categories); setStatus('ready'); }
      } catch { if (!controller.signal.aborted) setStatus('error'); }
    }
    void load(); return () => controller.abort();
  }, [version]);
  function reload() { setStatus('loading'); setVersion((current) => current + 1); }
  return { categories, status, reload };
}

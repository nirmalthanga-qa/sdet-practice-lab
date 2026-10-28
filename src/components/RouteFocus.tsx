import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

export default function RouteFocus() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);

  useEffect(() => {
    // Preserve normal focus on initial page load.
    if (previousPath.current === pathname) {
      return;
    }

    previousPath.current = pathname;

    const main = document.getElementById('main-content');

    main?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}
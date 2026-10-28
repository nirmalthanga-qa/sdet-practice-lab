import type { MouseEvent } from 'react';

export default function BackToTop() {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    // Preserve normal modified-click behaviour.
    if (
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = document.getElementById('page-top');

    if (!target) {
      return;
    }

    event.preventDefault();

    target.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  return (
    <div className="back-to-top-container">
      <a
        className="back-to-top-link"
        href="#page-top"
        onClick={handleClick}
      >
        Back to top <span aria-hidden="true">↑</span>
      </a>
    </div>
  );
}
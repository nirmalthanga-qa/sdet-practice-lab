import { useSyncExternalStore } from 'react';

function subscribeToScroll(callback: () => void) {
  window.addEventListener('scroll', callback, { passive: true });
  return () => window.removeEventListener('scroll', callback);
}

function isPastScrollThreshold() {
  return window.scrollY > 300;
}

function getServerSnapshot() {
  return false;
}

export default function BackToTop() {
  const visible = useSyncExternalStore(
    subscribeToScroll,
    isPastScrollThreshold,
    getServerSnapshot,
  );
  function handleBackToTop() {
    const target = document.getElementById("main-content");

    target?.focus({ preventScroll: true });

    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }

  if (!visible) return null;

  return (
    <div className="back-to-top-container">
      <button
        className="back-to-top-button"
        type="button"
        onClick={handleBackToTop}
      >
        <svg
          className="back-to-top-house"
          viewBox="0 0 64 64"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className="back-to-top-house-body"
            d="M32 5 59 28H52V58H12V28H5Z"
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <path
            className="back-to-top-house-arrow"
            d="M32 47V27M23 36 32 27 41 36"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span>Back to top</span>
      </button>
    </div>
  );
}

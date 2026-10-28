export default function DeliveryHelp() {
  return (
    <section
      className="delivery-help"
      aria-labelledby="delivery-help-title"
    >
      <h2 id="delivery-help-title">Need help with delivery details?</h2>

      <p id="delivery-help-description" className="field-help">
        Read the guide below or open it in a separate tab.
      </p>

      <iframe
        className="delivery-help-frame"
        src="/delivery-help.html"
        title="Practice delivery guide"
        aria-describedby="delivery-help-description"
        loading="lazy"
        sandbox=""
      />

      <a
        className="back-to-shop"
        href="/delivery-help.html"
        target="_blank"
        rel="noopener noreferrer"
      >
        Open delivery guide in a new tab
      </a>
    </section>
  );
}
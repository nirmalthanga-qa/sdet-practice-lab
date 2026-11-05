import { useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';

const styles = `
  :host { display: block; margin-block: 1.5rem; }
  section { padding: 1rem; border: 1px solid #64748b; border-radius: .75rem; }
  h2 { margin: 0; }
  label { display: block; font-weight: 600; margin-block: .75rem .4rem; }
  .controls { display: flex; flex-wrap: wrap; gap: .75rem; }
  input, button { box-sizing: border-box; min-height: 44px; padding: .5rem .8rem;
    border: 1px solid #94a3b8; border-radius: .5rem; font: inherit; }
  input { width: 10rem; max-width: 100%; background: #0f172a; color: #f8fafc; }
  button { background: #5eead4; color: #0f172a; font-weight: 700; cursor: pointer; }
  :focus-visible { outline: 3px solid #5eead4; outline-offset: 3px; }
  [role=status] { margin: .75rem 0 0; }
`;

export default function DeliveryEstimate() {
  const [root, setRoot] = useState<ShadowRoot | null>(null);
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [invalid, setInvalid] = useState(false);

  function attachHost(host: HTMLDivElement | null) {
    if (host) setRoot(host.shadowRoot ?? host.attachShadow({ mode: 'open' }));
  }

  function checkDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = pin.trim();
    const invalidFormat = !/^[1-9][0-9]{5}$/.test(value);
    setInvalid(invalidFormat);
    if (invalidFormat) {
      setMessage('Enter a six-digit PIN code starting with 1–9.');
    } else if (value === '560001') {
      setMessage('Estimated delivery: 2–3 business days.');
    } else {
      setMessage('Demo delivery is unavailable for this PIN code.');
    }
  }

  return (
    <div ref={attachHost}>
      {root && createPortal(
        <>
          <style>{styles}</style>
          <section aria-labelledby="estimate-title">
            <h2 id="estimate-title">Delivery estimate</h2>
            <p id="pin-help">Try 560001 for a simulated delivery estimate.</p>
            <form onSubmit={checkDelivery} noValidate>
              <label htmlFor="estimate-pin">Delivery PIN code</label>
              <div className="controls">
                <input id="estimate-pin" type="text" inputMode="numeric" required
                  aria-invalid={invalid}
                  aria-describedby={invalid ? 'pin-help estimate-result' : 'pin-help'}
                  value={pin} onChange={(event) => {
                    setPin(event.target.value);
                    setMessage('');
                    setInvalid(false);
                  }}
                />
                <button type="submit">Check delivery</button>
              </div>
              <p id="estimate-result" role="status" aria-atomic="true">{message}</p>
            </form>
          </section>
        </>, root
      )}
    </div>
  );
}

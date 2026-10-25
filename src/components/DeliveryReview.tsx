import type { DeliveryDetails } from '../types/delivery';

type DeliveryReviewProps = {
  details: DeliveryDetails;
};

export default function DeliveryReview({
  details,
}: DeliveryReviewProps) {
  return (
    <section
      className="delivery-review"
      aria-labelledby="delivery-review-title"
    >
      <h2 id="delivery-review-title">Review your delivery details</h2>

      <dl className="delivery-review-details">
        <div>
          <dt>Full name</dt>
          <dd>{details.fullName}</dd>
        </div>

        <div>
          <dt>Email</dt>
          <dd>{details.email}</dd>
        </div>

        <div>
          <dt>Delivery address</dt>
          <dd className="review-address">{details.address}</dd>
        </div>

        <div>
          <dt>City</dt>
          <dd>{details.city}</dd>
        </div>

        <div>
          <dt>PIN code</dt>
          <dd>{details.postalCode}</dd>
        </div>
      </dl>

      <p className="field-help">
        Need to change something? Edit the form above and validate again.
        No order has been placed.
      </p>
    </section>
  );
}
export default function ProductInformation() {
  return (
    <section
      className="product-information"
      aria-labelledby="product-information-title"
    >
      <h2 id="product-information-title">Before you order</h2>

      <details className="product-information-item">
        <summary>Delivery information</summary>

        <div className="product-information-content">
          <p>
            Enter a fictional delivery address during checkout.
            This practice shop does not ship physical products.
          </p>

          <p>
            We check the format of your six-digit Indian PIN code.
            This does not confirm delivery availability.
          </p>
        </div>
      </details>

      <details className="product-information-item">
        <summary>Payment information</summary>

        <div className="product-information-content">
          <p>
            All payments are simulated. No money is charged, and
            you do not need to enter card or bank details.
          </p>

          <p>
            The order total equals the product subtotal. No additional
            delivery charges or taxes are added.
          </p>
        </div>
      </details>

      <details className="product-information-item">
        <summary>Stock and your cart</summary>

        <div className="product-information-content">
          <p>
            Adding a product to your cart does not reserve stock.
            Availability is checked again when you place your order.
          </p>

          <p>
            A confirmed order reduces stock. If availability changes
            before checkout, you may need to update your cart.
          </p>
        </div>
      </details>
    </section>
  );
}
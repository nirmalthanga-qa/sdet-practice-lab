import { Link } from 'react-router';
import LearningTrackCard from '../components/LearningTrackCard';

const shoppingFeatures = [
  {
    number: '01',
    title: 'Explore the collection',
    description:
      'Search workspace and audio essentials. Filter by category, stock and maximum price, sort the results, and browse across pages.',
  },
  {
    number: '02',
    title: 'Make it your cart',
    description:
      'Shop as a guest or create an account. Adjust quantities, review prices, and transfer your guest items into your account cart.',
  },
  {
    number: '03',
    title: 'Complete a practice order',
    description:
      'Sign in, enter fictional delivery details, review your order and complete a simulated checkout. View your saved receipt afterward.',
  },
  {
    number: '04',
    title: 'Explore your order history',
    description:
      'Revisit your latest orders and explore daily spending or order counts through an interactive chart and accessible data table.',
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <p className="eyebrow">SDET PRACTICE LAB · DEMO SHOP</p>

        <h1 id="hero-title">
          Everyday essentials.
          <br />
          <span>Explore. Shop. Practise.</span>
        </h1>

        <p className="hero-description">
          Explore a complete practice shopping journey—from finding
          products and building your cart to placing simulated orders
          and reviewing your purchase history.
        </p>

        <div className="cart-actions">
          <Link className="primary-link" to="/shop">
            Explore the shop
            <span aria-hidden="true"> →</span>
          </Link>

          <Link className="primary-link" to="/orders">
            My orders
          </Link>
        </div>

        <p className="sample-data-note">
          A portfolio and testing project by Nirmal Kumar.
          All payments are simulated. No money is charged and
          no products are shipped.
        </p>
      </section>

      <section
        className="tracks-section"
        aria-labelledby="shopping-features-title"
      >
        <div className="section-heading">
          <p className="eyebrow">EXPLORE THE EXPERIENCE</p>

          <h2 id="shopping-features-title">
            Your shopping journey starts here.
          </h2>

          <p>
            These features are ready to explore. Use fictional
            information when creating an account or placing an order.
          </p>
        </div>

        <div className="tracks-grid">
          {shoppingFeatures.map((feature) => (
            <LearningTrackCard
              key={feature.number}
              number={feature.number}
              title={feature.title}
              description={feature.description}
              status="Available"
            />
          ))}
        </div>
      </section>
    </>
  );
}
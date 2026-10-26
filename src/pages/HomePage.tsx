import { Link } from 'react-router';
import LearningTrackCard from '../components/LearningTrackCard';

const shoppingFeatures = [
  {
    number: '01',
    title: 'Explore products',
    description:
      'Search everyday essentials, filter by category and availability, and compare prices.',
  },
  {
    number: '02',
    title: 'Build your cart',
    description:
      'Add your favourites, adjust quantities and review your subtotal before checkout.',
  },
  {
    number: '03',
    title: 'Try checkout',
    description:
      'Practise entering delivery details and reviewing them. Use fictional information.',
  },
  {
    number: '04',
    title: 'Coming next',
    description:
      'Customer accounts, simulated orders and interactive shopping insights are on the way.',
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
          Discover workspace and audio essentials in a shopping application
          built for hands-on quality engineering practice.
        </p>

        <Link className="primary-link" to="/shop">
          Explore the shop
          <span aria-hidden="true"> →</span>
        </Link>

        <p className="sample-data-note">
          A portfolio and testing project. No real purchases or payments.
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
            Browse the collection, build your cart and try the delivery form.
          </p>
        </div>

        <div className="tracks-grid">
          {shoppingFeatures.map((feature) => (
            <LearningTrackCard
              key={feature.number}
              number={feature.number}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </section>
    </>
  );
}
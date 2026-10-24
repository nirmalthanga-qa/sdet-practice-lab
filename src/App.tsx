import './App.css';

const learningTracks = [
  {
    number: '01',
    title: 'Practice Shop',
    description:
      'Explore a shopping application built for hands-on UI and API testing.',
  },
  {
    number: '02',
    title: 'Learning Hub',
    description:
      'Learn TypeScript, Playwright, accessibility, APIs and performance testing.',
  },
  {
    number: '03',
    title: 'CI/CD & Cloud',
    description:
      'Connect Git, GitHub Actions, Docker and Azure to your testing workflow.',
  },
  {
    number: '04',
    title: 'AI SDET Lab',
    description:
      'Build toward AI agents, Playwright MCP and Jira-to-test workflows.',
  },
];

function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <header className="site-header">
        <a className="brand" href="/" aria-label="SDET Practice Lab home">
          <span className="brand-icon" aria-hidden="true">
            {'</>'}
          </span>

          <span>SDET Practice Lab</span>
        </a>

        <span className="project-status">Building step by step</span>
      </header>

      <main id="main-content">
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">LEARN. PRACTISE. AUTOMATE.</p>

          <h1 id="hero-title">
            Build confidence.
            <br />
            <span>Engineer quality.</span>
          </h1>

          <p className="hero-description">
            A hands-on space to learn quality engineering—from your first
            TypeScript function to reliable automation and AI-driven testing.
          </p>

          <a className="primary-link" href="#learning-tracks">
            Explore the learning tracks
            <span aria-hidden="true"> →</span>
          </a>
        </section>

        <section
          id="learning-tracks"
          className="tracks-section"
          aria-labelledby="tracks-title"
        >
          <div className="section-heading">
            <p className="eyebrow">OUR PROJECT ROADMAP</p>
            <h2 id="tracks-title">Four spaces. One learning journey.</h2>
            <p>We’ll build each area together, one working feature at a time.</p>
          </div>

          <div className="tracks-grid">
            {learningTracks.map((track) => (
              <article className="track-card" key={track.number}>
                <span className="track-number" aria-hidden="true">
                  {track.number}
                </span>

                <h3>{track.title}</h3>
                <p>{track.description}</p>
                <span className="track-status">Planned</span>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <p>SDET Practice Lab · Learn by building. Improve by testing.</p>
      </footer>
    </>
  );
}

export default App;
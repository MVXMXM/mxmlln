import { getExperiments } from './getExperiments';

export default function Home() {
  const experiments = getExperiments();

  return (
    <>
      <header className="sketchbook-hero">
        <p className="sketchbook-subhead">taste is a function of tinkering</p>
        <h1 className="sketchbook-title">Interaction Sketchbook</h1>
      </header>
      <section className="experiments-section">
        <div className="experiments-grid">
          {experiments.map((exp) => (
            <a
              key={exp.id}
              href={exp.path}
              className="experiment-card"
              data-exp={exp.id}
            >
              <div className="experiment-preview-wrapper">
                <iframe
                  src={exp.path}
                  className="experiment-preview"
                  title={`Experiment ${exp.id}`}
                />
              </div>
            </a>
          ))}
        </div>
      </section>
    </>
  );
}

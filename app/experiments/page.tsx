import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

interface Experiment {
  id: string;
  path: string;
}

const NEXTJS_EXPERIMENTS = ['006', '012', '013', '026', '027', '028'];

function getExperiments(): Experiment[] {
  const staticDir = join(process.cwd(), 'public', 'static');
  
  try {
    const entries = readdirSync(staticDir);
    
    const staticExperiments = entries
      .filter((entry) => {
        if (!/^\d{3}$/.test(entry)) return false;
        const fullPath = join(staticDir, entry);
        if (!statSync(fullPath).isDirectory()) return false;
        return existsSync(join(fullPath, 'index.html'));
      })
      .map((dir) => ({
        id: dir,
        path: NEXTJS_EXPERIMENTS.includes(dir) 
          ? `/experiments/${dir}` 
          : `/static/${dir}/index.html`,
      }));
    
    const appDir = join(process.cwd(), 'app', 'experiments');
    const nextjsOnly = NEXTJS_EXPERIMENTS
      .filter(id => !staticExperiments.find(e => e.id === id))
      .filter(id => existsSync(join(appDir, id, 'page.tsx')))
      .map(id => ({ id, path: `/experiments/${id}` }));
    
    return [...staticExperiments, ...nextjsOnly].sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Error reading experiments directory:', error);
    return [];
  }
}

export default function Home() {
  const experiments = getExperiments();
  
  return (
    <>
      <header className="sketchbook-hero">
        <p className="sketchbook-subhead">taste is a function of tinkering.</p>
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

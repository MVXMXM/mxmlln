import { readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface Experiment {
  id: string;
  path: string;
}

// Full Next.js experiments (not static redirects)
const NEXTJS_EXPERIMENTS = ['006', '007', '010', '025'];

// Get list of experiment directories
function getExperiments(): Experiment[] {
  const __filename = fileURLToPath(import.meta.url);
  const appDir = dirname(__filename);
  const staticDir = join(appDir, '..', 'public', 'static');
  
  try {
    const entries = readdirSync(staticDir);
    
    const staticExperiments = entries
      .filter((entry) => {
        // Only include numbered directories with index.html
        if (!/^\d{3}$/.test(entry)) return false;
        
        const fullPath = join(staticDir, entry);
        if (!statSync(fullPath).isDirectory()) return false;
        
        // Check if index.html exists
        return existsSync(join(fullPath, 'index.html'));
      })
      .map((dir) => ({
        id: dir,
        // Use Next.js route for full pages, static path for others
        path: NEXTJS_EXPERIMENTS.includes(dir) 
          ? `/${dir}` 
          : `/static/${dir}/index.html`,
      }));
    
    // Add Next.js-only experiments (not in static folder)
    const nextjsOnly = NEXTJS_EXPERIMENTS
      .filter(id => !staticExperiments.find(e => e.id === id))
      .filter(id => existsSync(join(appDir, id, 'page.tsx')))
      .map(id => ({ id, path: `/${id}` }));
    
    return [...staticExperiments, ...nextjsOnly].sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('Error reading experiments directory:', error);
    return [];
  }
}

export default function Home() {
  const experiments = getExperiments();
  
  return (
    <section className="experiments-section">
      <div className="experiments-grid">
        {experiments.map((exp) => (
          <a
            key={exp.id}
            href={exp.path}
            className="experiment-card"
          >
            <div className="experiment-preview-wrapper">
              <iframe
                src={exp.path}
                className="experiment-preview"
                title={`Experiment ${exp.id}`}
              />
            </div>
            <div className="experiment-number">
              {exp.id}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

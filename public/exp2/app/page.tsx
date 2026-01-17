import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

interface Experiment {
  id: string;
  path: string;
}

// Get list of experiment directories at build time
function getExperiments(): Experiment[] {
  // Get the directory of this file (app/)
  const __filename = fileURLToPath(import.meta.url);
  const appDir = dirname(__filename);
  
  try {
    const entries = readdirSync(appDir);
    
    return entries
      .filter((entry) => {
        // Only include numbered directories (e.g., 001, 002, etc.)
        if (!/^\d{3}$/.test(entry)) return false;
        
        const fullPath = join(appDir, entry);
        return statSync(fullPath).isDirectory();
      })
      .sort()
      .map((dir) => ({
        id: dir,
        path: `/${dir}`,
      }));
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

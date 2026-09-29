import FolioGallery from './FolioGallery';
import { getExperiments } from '../getExperiments';

export default function FolioPage() {
  const experiments = getExperiments();
  return <FolioGallery experiments={experiments} />;
}

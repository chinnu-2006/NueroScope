import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '../components/ui/Button.jsx';

export default function NotFound() {
  return (
    <div className="p-8 h-full flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl grid place-items-center
                        bg-gradient-primary shadow-glow mb-6 text-white">
          <Compass size={26} strokeWidth={1.75} />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
          That route doesn't exist. Head back to the overview to keep exploring.
        </p>
        <div className="mt-6 inline-flex">
          <Link to="/overview">
            <Button variant="primary">Back to Overview</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

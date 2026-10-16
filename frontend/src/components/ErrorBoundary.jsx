import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/** Catches any render-time error below in the tree. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[NeuroScope] Uncaught render error:', error, info);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;
    const msg = this.state.error?.message || 'Something went wrong rendering this view.';
    return (
      <div className="min-h-screen grid place-items-center p-8 bg-surface-base text-ink-primary">
        <div className="max-w-md w-full card-elevated p-6 text-center">
          <div className="mx-auto h-12 w-12 rounded-lg grid place-items-center mb-4
                          bg-[color:var(--accent-red)]/15 text-[color:var(--accent-red)]">
            <AlertTriangle size={22} />
          </div>
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-sm text-ink-secondary mt-2 leading-relaxed">
            The UI hit an unexpected error. Try again or reload the page.
          </p>
          <pre className="mt-4 text-[11px] text-ink-muted bg-white/[0.04] rounded p-2 overflow-auto max-h-32 text-left">
            {msg}
          </pre>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={this.reset}
              className="btn-primary h-9 px-4 text-sm font-medium inline-flex items-center gap-2"
            >
              <RotateCcw size={14} />
              Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="h-9 px-4 rounded-md text-sm text-ink-secondary hover:bg-surface-hover hover:text-ink-primary transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}

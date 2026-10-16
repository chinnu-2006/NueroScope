/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base: 'var(--bg-base)',
          panel: 'var(--bg-panel)',
          elevated: 'var(--bg-elevated)',
          hover: 'var(--bg-hover)',
          active: 'var(--bg-active)',
        },
        ink: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
          inverse: 'var(--text-inverse)',
        },
        accent: {
          blue: 'var(--accent-blue)',
          'blue-strong': 'var(--accent-blue-strong)',
          cyan: 'var(--accent-cyan)',
          emerald: 'var(--accent-emerald)',
          amber: 'var(--accent-amber)',
          red: 'var(--accent-red)',
          purple: 'var(--accent-purple)',
          pink: 'var(--accent-pink)',
        },
        node: {
          frontend: 'var(--node-frontend)',
          backend: 'var(--node-backend)',
          api: 'var(--node-api)',
          db: 'var(--node-db)',
          cache: 'var(--node-cache)',
          external: 'var(--node-external)',
          utility: 'var(--node-utility)',
          service: 'var(--node-service)',
        },
        hairline: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          strong: 'var(--border-strong)',
        },
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
      boxShadow: {
        soft: 'var(--shadow-sm)',
        card: 'var(--shadow-md)',
        floating: 'var(--shadow-lg)',
        glow: 'var(--shadow-glow-blue)',
      },
      transitionDuration: {
        fast: 'var(--dur-fast)',
        base: 'var(--dur-base)',
        slow: 'var(--dur-slow)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-brand': 'var(--gradient-brand)',
      },
      fontSize: {
        '2xs': '0.6875rem',
      },
    },
  },
  plugins: [],
};

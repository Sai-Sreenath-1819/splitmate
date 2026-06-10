/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
          hover: 'var(--glass-hover)',
          card: 'var(--glass-card)',
          'card-strong': 'var(--glass-card-strong)',
        },
        brand: {
          accent: 'var(--accent)',
          accent2: 'var(--accent2)',
          green: 'var(--green)',
          red: 'var(--red)',
          amber: 'var(--amber)',
        },
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)',
      },
      boxShadow: {
        glow: '0 8px 30px var(--accent-glow)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // Every color is a CSS custom property defined in index.css, so light/dark
      // swap in one place and utility classes need no `dark:` variant.
      colors: {
        surface: 'var(--surface-1)',
        plane: 'var(--plane)',
        ink: 'var(--text-primary)',
        'ink-2': 'var(--text-secondary)',
        muted: 'var(--text-muted)',
        grid: 'var(--gridline)',
        baseline: 'var(--baseline)',
        hairline: 'var(--border)',
        wash: 'var(--wash)',
        series: 'var(--series-1)',
        good: 'var(--status-good)',
        warning: 'var(--status-warning)',
        serious: 'var(--status-serious)',
        critical: 'var(--status-critical)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss';

export default { content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'], theme: { extend: { colors: { ink: '#263238', mist: '#E3F2FD', sky: '#90CAF9', ocean: '#2196F3', coral: '#0d47a1' }, fontFamily: { sans: ['var(--font-manrope)', 'sans-serif'], display: ['var(--font-space-grotesk)', 'sans-serif'] } } }, plugins: [] } satisfies Config;

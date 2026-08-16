import { defineConfig } from 'vite';

const relaxations = [
  ["style-src 'self';", "style-src 'self' 'unsafe-inline';"],
  ["connect-src 'self';", "connect-src 'self' ws: wss:;"]
];

export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH || '/',
  build: { target: 'es2022' },
  plugins: command === 'serve' ? [{
    name: 'development-csp',
    transformIndexHtml(html) {
      return relaxations.reduce((current, [directive, relaxed]) => {
        // A silent no-op here breaks dev with CSP violations that look like app bugs.
        if (!current.includes(directive)) throw new Error(`index.html no longer contains the CSP directive "${directive}"`);
        return current.replace(directive, relaxed);
      }, html);
    }
  }] : []
}));

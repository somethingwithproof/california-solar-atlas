import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: command === 'serve' ? [{
    name: 'development-csp',
    transformIndexHtml(html) {
      return html
        .replace("style-src 'self';", "style-src 'self' 'unsafe-inline';")
        .replace("connect-src 'self';", "connect-src 'self' ws: wss:;");
    }
  }] : []
}));

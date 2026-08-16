import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  plugins: command === 'serve' ? [{
    name: 'development-csp-websocket',
    transformIndexHtml(html) {
      return html.replace("connect-src 'self';", "connect-src 'self' ws: wss:;");
    }
  }] : []
}));

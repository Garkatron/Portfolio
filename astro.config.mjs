import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://astronaut.github.io',
  base: '/ComicPortfolio',
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});

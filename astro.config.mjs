import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://astronaut.github.io',
  base: '/Portfolio',

  vite: {
    plugins: [tailwindcss()],
  },
})
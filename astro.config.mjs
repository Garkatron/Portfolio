import { readdirSync, readFileSync } from 'node:fs'
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

// Locales are discovered from src/i18n/*.json, so adding a language is just
// adding a dictionary file. The default locale lives in src/data/site.json.
const site = JSON.parse(readFileSync(new URL('./src/data/site.json', import.meta.url), 'utf8'))
const locales = readdirSync(new URL('./src/i18n/', import.meta.url))
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace(/\.json$/, ''))

export default defineConfig({
  site: site.baseUrl,
  base: '/',
  integrations: [react()],
  i18n: {
    locales,
    defaultLocale: site.defaultLocale,
    routing: { prefixDefaultLocale: false },
  },
  markdown: {
    shikiConfig: { theme: 'tokyo-night' },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
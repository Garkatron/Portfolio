// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    site: 'https://Garkatron.github.io',
    base: '/Portfolio/',
    vite: {
        plugins: [tailwindcss()],
    },
})
export const BASE_PATH = {
    BASE_PATH: "/app"
};
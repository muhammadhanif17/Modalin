import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base './' agar hasil build bisa diserve dari GitHub Pages
// (https://<user>.github.io/<repo>/) maupun Vercel tanpa 404 aset.
export default defineConfig({ base: './', plugins: [react()] });

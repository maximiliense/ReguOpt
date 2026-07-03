import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	build: {
		target: 'es2022', // required for top-level await (WASM)
		rollupOptions: {
			output: {
				// Use function form to skip during SSR where modules are externalized
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('katex')) return 'katex';
						if (/\/d3[-/]/.test(id) || id.includes('/d3/')) return 'd3';
					}
				}
			}
		}
	},
	optimizeDeps: {
		exclude: ['fep_engine'] // WASM: no Vite pre-bundling
	},
	assetsInclude: ['**/*.wasm']
});

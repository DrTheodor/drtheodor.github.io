// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from "@tailwindcss/vite";
import icon from "astro-icon";

// https://astro.build/config
export default defineConfig({
	site: 'https://theo.is-a.dev',
	integrations: [
		mdx(), 
		sitemap(),
		icon(),
	],
	vite: {
		plugins: [
			tailwindcss(), 
		]
	}
});

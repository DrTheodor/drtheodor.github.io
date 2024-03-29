import { defineCollection, z } from 'astro:content';

export const collections = {
	projects: defineCollection({
		type: 'content',
		schema: z.object({
			title: z.string(),
			description: z.string(),
			img: z.string(),
			img_alt: z.string().optional(),
		}),
	})
};

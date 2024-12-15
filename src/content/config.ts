import { defineCollection, z } from "astro:content";

const post = defineCollection({
	schema: z.object({
		title: z.string(),
		description: z.string(),
		publishDate: z.date(),
		tags: z.array(z.string()),
		draft: z.boolean().optional(),
	}),
});

export const collections = {
	post,
};

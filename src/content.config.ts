import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Static blog: Markdown files under src/data/blog/<lang>/<slug>.md.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/data/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };

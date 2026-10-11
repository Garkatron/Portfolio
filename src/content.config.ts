import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Static blog: one folder per post under src/data/blog/<lang>/<slug>/, with
// `index.md` as the post itself so its images can live alongside it.
const blog = defineCollection({
  loader: glob({ pattern: "**/index.md", base: "./src/data/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };

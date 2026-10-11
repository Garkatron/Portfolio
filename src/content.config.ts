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
    // Optional cover shown above the title: an image or ASCII art, either as a
    // path relative to the post folder (./cover.jpg, ./cover.ascii). Resolved in
    // src/lib/cover.js, not here, because the two kinds need different loading.
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    // `genIndex: true` builds a table of contents from the post's own headings.
    // Off by default: a two-paragraph post does not need one.
    genIndex: z.boolean().default(false),
  }),
});

export const collections = { blog };

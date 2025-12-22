import { z } from 'zod';

export const mapSchema = z.object({
  report: z.object({
    title: z.string().default(''),
    text: z.string().default(''),
    sections: z.array(z.object({
      section: z.object({
        heading: z.string().default(''),
        text: z.string().default(''),
        content: z.array(z.object({
          subsection: z.object({
            subheading: z.string().default(''),
            text: z.string().default(''),
            subsubsection: z.array(z.object({
              subsubheading: z.string().default(''),
              text: z.string().default(''),
            })).default([]),
          }),
        })).default([]),
      }),
    })).default([]),
  }),
});

export type Map = z.infer<typeof mapSchema>;
export type Report = Map; // Alias for backward compatibility

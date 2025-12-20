import { z } from 'zod';

export const reportSchema = z.object({
  report: z.object({
    title: z.string(),
    sections: z.array(z.object({
      section: z.object({
        heading: z.string(),
        text: z.string(),
        content: z.array(z.object({
          subsection: z.object({
            subheading: z.string(),
            text: z.string(),
            subsubsection: z.array(z.object({
              subsubheading: z.string(),
              text: z.string(),
            })),
          }),
        }))
      }),
    })),
  }),
});

export type Report = z.infer<typeof reportSchema>;

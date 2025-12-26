import { z } from 'zod';

export interface Map {
  title: string;
  text: string;
  sections: Map[];
}

export const mapSchema: z.ZodType<Map> = z.lazy(() => z.object({
  title: z.string().default(''),
  text: z.string().default(''),
  sections: z.array(mapSchema).default([]),
}));

export const mapReplacementResponseSchema = z.object({
  nodes: z.array(mapSchema),
});

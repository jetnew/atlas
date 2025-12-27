import { z } from 'zod';

export interface Map {
  title: string;
  text?: string;
  sections: Map[];
}

export const mapSchema: z.ZodType<Map> = z.lazy(() => z.object({
  title: z.string().default(''),
  text: z.string().default(''),
  sections: z.array(mapSchema).default([]),
}));

// Diff schemas for map updates

// Add a node at a specific position (ID = target position path)
export const addDiffSchema = z.object({
  add: z.string(),          // Target position ID (e.g., "root-1-3" = add as 4th child of root-1)
  node: mapSchema,          // The new node to add
});

// Delete a node by its ID (cascades to children automatically)
export const deleteDiffSchema = z.object({
  delete: z.string(),       // Node ID to delete (e.g., "root-1-3-2")
});

// Update/replace a node entirely (including its sections)
export const updateDiffSchema = z.object({
  update: z.string(),       // Node ID to update
  node: mapSchema,          // Full replacement (title, text, sections)
});

// Union of diff types - each is distinguishable by its unique key (add/delete/update)
export const mapDiffSchema = z.union([
  addDiffSchema,
  deleteDiffSchema,
  updateDiffSchema,
]);

export type AddDiff = z.infer<typeof addDiffSchema>;
export type DeleteDiff = z.infer<typeof deleteDiffSchema>;
export type UpdateDiff = z.infer<typeof updateDiffSchema>;
export type MapDiff = z.infer<typeof mapDiffSchema>;


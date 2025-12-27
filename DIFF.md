# Diff-Based Map Updates

This document describes the diff-based approach for updating the project map, replacing the previous node replacement approach.

## Overview

Instead of generating complete replacement nodes for selected map nodes, the system now generates **diff operations** that are applied incrementally to the map. This provides finer-grained control and better streaming UX.

## Diff Types

There are three types of diff operations, defined in `lib/schemas/map.ts`:

### 1. Add Diff
Insert a new node at a specific position.

```typescript
{ add: "root-1-3", node: { title: "...", text: "...", sections: [...] } }
```

- `add`: Target position ID (e.g., `"root-1-3"` means insert as the 4th child of `root-1`)
- `node`: The complete node to insert

### 2. Delete Diff
Remove a node and all its children.

```typescript
{ delete: "root-1-3-2" }
```

- `delete`: Node ID to remove (cascades to all descendants)

### 3. Update Diff
Replace a node entirely (including its sections).

```typescript
{ update: "root-1", node: { title: "...", text: "...", sections: [...] } }
```

- `update`: Node ID to replace
- `node`: The complete replacement node

## Node ID Format

Node IDs use a path-based format:
- `"root"` - The root node
- `"root-0"` - First child of root
- `"root-1-3"` - Fourth child of the second child of root
- `"root-1-3-2"` - Third child of `root-1-3`

The path represents indices into the `sections` arrays at each level.

## Architecture

### Schema (`lib/schemas/map.ts`)

```typescript
export const addDiffSchema = z.object({
  add: z.string(),
  node: mapSchema,
});

export const deleteDiffSchema = z.object({
  delete: z.string(),
});

export const updateDiffSchema = z.object({
  update: z.string(),
  node: mapSchema,
});

export const mapDiffSchema = z.union([
  addDiffSchema,
  deleteDiffSchema,
  updateDiffSchema,
]);
```

### Diff Application (`lib/mapUtils.ts`)

Key functions:

- `applyDiff(map, diff)`: Apply a single diff operation
- `applyDiffs(map, diffs)`: Apply an array of diffs in order
- `normalizeNode(node)`: Ensure node has all required fields with defaults

Diffs are applied in the order they are generated. The LLM is responsible for accounting for index shifts (e.g., if deleting `root-1`, subsequent references to `root-2` should use `root-1`).

### API Endpoint (`app/api/map/route.ts`)

The `/api/map` endpoint:
1. Receives selected nodes and user prompt
2. Generates diffs using GPT-5.2 with `streamObject`
3. Streams diffs back to the client
4. Applies diffs and saves the final map to the database

Response schema:
```typescript
z.object({ diffs: z.array(mapDiffSchema) })
```

### Client (`components/MapPanel.tsx`)

The client:
1. Uses `useObject` hook to stream diffs from the API
2. Filters incomplete diffs during streaming (via `isCompleteDiff`)
3. Applies complete diffs incrementally using `applyDiffs`
4. Updates the map visualization in real-time

## Streaming Considerations

During streaming, diff objects may be incomplete. The `isCompleteDiff` helper validates:
- Delete diffs: Must have a string `delete` field
- Add/Update diffs: Must have a `node` object with a `title` string

The `normalizeNode` helper ensures all nodes have required fields:
- `title`: Defaults to `""`
- `text`: Defaults to `""`
- `sections`: Defaults to `[]`

## Example

User selects node `root-1` (titled "Research") and prompts: "Split this into two sections"

Generated diffs:
```json
{
  "diffs": [
    {
      "update": "root-1",
      "node": {
        "title": "Literature Review",
        "text": "Review of existing work",
        "sections": []
      }
    },
    {
      "add": "root-2",
      "node": {
        "title": "Data Collection",
        "text": "Methods for gathering data",
        "sections": []
      }
    }
  ]
}
```

## Benefits

1. **Finer-grained control**: Add, delete, or update individual nodes independently
2. **Efficient**: Only specify what changes, not entire subtrees
3. **Better streaming**: Each diff can be applied as it arrives
4. **Composable**: Multiple operations in a single request
5. **Clear semantics**: Maps directly to user intent (add/delete/update)

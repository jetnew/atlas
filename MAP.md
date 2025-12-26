# Map Rendering and Streaming Architecture

This document details how the ReactFlow canvas is rendered and streamed when `/api/report` and `/api/map` endpoints are called.

## Overview

The map visualization system consists of:
- **MapPanel.tsx** - Main container managing state and API interactions
- **Map.tsx** - ReactFlow canvas rendering the hierarchical tree
- **formatMap.ts** - Parser converting markdown to Map structure
- **/api/report** - Generates initial report and streams markdown
- **/api/map** - Handles node replacement with structured object streaming

---

## Process Flow: `/api/report` (Initial Report Generation)

### 1. Trigger Condition

When `MapPanel` mounts and detects no existing map:

```
MapPanel.tsx:191-196
useEffect(() => {
  if (currentProject && !currentProject.map && !reportGeneratedRef.current) {
    reportGeneratedRef.current = true;
    generateReport('');
  }
}, [currentProject, generateReport]);
```

### 2. API Request Flow

```
┌─────────────────┐     useCompletion      ┌─────────────────┐
│   MapPanel      │ ───────────────────────▶│  /api/report    │
│                 │                         │                 │
│  generateReport │                         │  POST request   │
│  (body: {       │                         │  with projectId │
│    projectId    │                         │                 │
│  })             │                         │                 │
└─────────────────┘                         └─────────────────┘
```

### 3. Server-Side Processing (`/api/report/route.ts`)

1. **Fetch project data** from Supabase (prompt, questions, answers)
2. **Fetch source summaries** for context
3. **Stream text generation** using `streamText()` with OpenAI GPT-5.2
4. **Fire-and-forget save**: After stream completes, parse and save map to database

```
route.ts:111-120
(async () => {
  const fullText = await result.text;
  const map = parseReportToMap(fullText);
  await saveMapToDatabase(projectId, map, supabase);
})();

return result.toUIMessageStreamResponse();
```

### 4. Client-Side Streaming Reception

The `useCompletion` hook receives streaming text chunks:

```
MapPanel.tsx:105-116
const {
  completion: reportText,  // Streaming markdown text
  complete: generateReport,
  isLoading: isGeneratingReport
} = useCompletion({
  api: '/api/report',
  body: { projectId },
  onFinish: () => {
    getProjectData(projectId);  // Refresh to get saved map
  },
});
```

### 5. Real-Time Markdown Parsing

As `reportText` updates, `useMemo` parses it into a Map structure:

```
MapPanel.tsx:199-230
const map = useMemo(() => {
  // Priority: streaming report text > database
  if (reportText) {
    return parseReportToMap(reportText);
  }
  return currentProject?.map || null;
}, [reportText, currentProject?.map, ...]);
```

### 6. Markdown Parser Details (`formatMap.ts:16-122`)

The parser handles streaming gracefully:

```
Streaming Safety:
- Excludes incomplete last line if no trailing newline
- Builds hierarchical tree as headings arrive
- Uses stack-based parent tracking for proper nesting

Parsing Rules:
- # (level 1) → Root title
- ## (level 2+) → Nested sections
- Non-heading lines → Text content for current node
- Horizontal rules (---, ***, ___) → Ignored
```

**Data Structure:**
```typescript
interface Map {
  title: string;
  text: string;
  sections: Map[];  // Recursive children
}
```

### 7. ReactFlow Node Generation (`Map.tsx:51-144`)

The `useMemo` transforms Map structure into ReactFlow nodes/edges:

```
Processing Steps:
1. Recursive traversal with processNode()
2. Path-based IDs for stability (e.g., "root-0-1-2")
3. Color assignment: root's children get unique colors, inherited downward
4. d3-hierarchy stratify() builds tree structure
5. tree().nodeSize() calculates positions with dynamic separation
6. Convert to ReactFlow Node[] and Edge[] arrays
```

**Layout Configuration:**
```typescript
NODE_WIDTH = 300
NODE_HEIGHT = 120
HORIZONTAL_SPACING = 20
VERTICAL_SPACING = 120
```

### 8. Debounced Node/Edge Synchronization (`Map.tsx:148-173`)

Nodes and edges are synchronized using `requestAnimationFrame` debouncing to prevent ReactFlow from being overwhelmed by rapid streaming updates:

```typescript
const pendingUpdateRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);
const rafRef = useRef<number | null>(null);

useEffect(() => {
  pendingUpdateRef.current = { nodes: initialNodes, edges: initialEdges };

  if (rafRef.current === null) {
    rafRef.current = requestAnimationFrame(() => {
      if (pendingUpdateRef.current) {
        setNodes(pendingUpdateRef.current.nodes);
        setEdges(pendingUpdateRef.current.edges);
      }
      rafRef.current = null;
    });
  }

  return () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };
}, [initialNodes, initialEdges, setNodes, setEdges]);
```

This batches rapid updates so ReactFlow only receives the latest state once per animation frame (~16ms), preventing rendering glitches where nodes would temporarily disappear during streaming.

---

## Process Flow: `/api/map` (Node Replacement)

### 1. Trigger Condition

User selects nodes and submits a prompt:

```
MapPanel.tsx:286-315
const handleSend = useCallback(() => {
  if (selectedNodes.length > 0 && userInput.trim() && map) {
    const nodeIds = selectedNodes.map(n => n.id);
    const filteredIds = filterRedundantNodes(nodeIds);

    setIsReplacingNodes(true);
    setReplacementNodeIds(filteredIds);

    submitReplacement({
      projectId,
      prompt: userInput,
      selectedNodes,
      currentMap: map,
    });
  }
}, [...]);
```

### 2. Redundancy Filtering

Before sending, child nodes are filtered if parent is selected:

```
filterRedundantNodes(['root-0', 'root-0-1', 'root-1'])
// Returns: ['root-0', 'root-1'] (root-0-1 removed as child of root-0)
```

### 3. API Request Flow

```
┌─────────────────┐     useObject           ┌─────────────────┐
│   MapPanel      │ ───────────────────────▶│   /api/map      │
│                 │                         │                 │
│ submitReplacement│                         │  POST request   │
│ ({              │                         │  - projectId    │
│   projectId,    │                         │  - prompt       │
│   prompt,       │                         │  - selectedNodes│
│   selectedNodes,│                         │  - currentMap   │
│   currentMap    │                         │                 │
│ })              │                         │                 │
└─────────────────┘                         └─────────────────┘
```

### 4. Server-Side Processing (`/api/map/route.ts`)

1. **Validate request** with Zod schema
2. **Filter redundant nodes** (parent selection removes children)
3. **Build replacement prompt** with node context
4. **Stream object generation** using `streamObject()` with schema

```typescript
const result = await streamObject({
  model: openai('gpt-4o-mini'),
  prompt: systemPrompt,
  schema: mapReplacementResponseSchema,  // { nodes: Map[] }
});
```

5. **Fire-and-forget save**: Merge replacement into map and save

### 5. Client-Side Structured Streaming

The `useObject` hook receives partial objects as they stream:

```
MapPanel.tsx:119-168
const {
  object: replacementObject,  // Partial { nodes: Map[] }
  submit: submitReplacement,
  isLoading: isReplacingLoading,
} = useObject({
  api: '/api/map',
  schema: mapReplacementResponseSchema,
  onFinish: (event) => {
    // Final merge into project state
    if (event.object?.nodes?.length > 0 && project) {
      const updatedMap = replaceNodeInMap(...) or replaceSiblingNodesInMap(...);
      setCurrentProject({ ...project, map: updatedMap });
    }
    setIsReplacingNodes(false);
    setSelectedNodes([]);
  },
});
```

### 6. Real-Time Map Merging During Stream

As `replacementObject` updates, the map merges in replacements:

```
MapPanel.tsx:199-223
const map = useMemo(() => {
  if (isReplacingNodes && replacementObject?.nodes && replacementNodeIds.length > 0) {
    const baseMap = currentProject.map as MapType;

    if (replacementNodeIds.length === 1) {
      // Single node: replace in-place
      return replaceNodeInMap(baseMap, replacementNodeIds[0], replacementObject.nodes[0]);
    } else {
      // Multiple siblings: replace all together
      return replaceSiblingNodesInMap(baseMap, replacementNodeIds, replacementObject.nodes);
    }
  }
  // ... fallback to reportText or database
}, [isReplacingNodes, replacementObject, replacementNodeIds, ...]);
```

### 7. ReactFlow Re-rendering

The Map component receives the merged map and re-renders:

```
MapPanel.tsx:375
<Map report={map} onSelectionChange={handleSelectionChange} />
```

The `useMemo` in Map.tsx recalculates node positions via d3-hierarchy, and the `useEffect` synchronizes the new nodes/edges to ReactFlow state.

---

## ReactFlow Rendering Pipeline

### Node Types

Custom `MapNodeComponent` registered as "map" type:

```
Map.tsx:19-21
const nodeTypes = {
  map: MapNodeComponent,
};
```

### Visual Configuration

```
Map.tsx:274-295
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodeTypes={nodeTypes}
  fitView
  fitViewOptions={{ maxZoom: 1, minZoom: 1 }}
  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
  minZoom={0.3}
  maxZoom={3}
  panOnScroll
/>
```

### Selection Handling

Selections propagate to MapPanel for replacement workflows:

```
Map.tsx:254-266
const handleSelectionChange: OnSelectionChangeFunc = useCallback(
  ({ nodes: selectedNodes }) => {
    if (onSelectionChange) {
      const selected = selectedNodes.map((node) => ({
        id: node.id,
        label: node.data.label,
        text: node.data.text,
      }));
      onSelectionChange(selected);
    }
  },
  [onSelectionChange]
);
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                         /api/report Flow                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Supabase ──▶ Server ──▶ streamText() ──▶ Markdown chunks          │
│                              │                                      │
│                              ▼                                      │
│  useCompletion ◀── toUIMessageStreamResponse()                     │
│       │                                                             │
│       ▼                                                             │
│  reportText ──▶ parseReportToMap() ──▶ Map structure               │
│                                              │                      │
│                                              ▼                      │
│  useMemo(processNode) ──▶ ReactFlow nodes/edges                    │
│                                              │                      │
│                                              ▼                      │
│  useEffect(setNodes) ──▶ Merged updates ──▶ ReactFlow canvas       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          /api/map Flow                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  User selection + prompt ──▶ submitReplacement()                   │
│                                    │                                │
│                                    ▼                                │
│  Server ──▶ streamObject() ──▶ Partial { nodes: Map[] }           │
│                    │                                                │
│                    ▼                                                │
│  useObject ◀── toTextStreamResponse()                              │
│       │                                                             │
│       ▼                                                             │
│  replacementObject ──▶ replaceNodeInMap() ──▶ Merged Map          │
│                                                      │              │
│                                                      ▼              │
│  useMemo(processNode) ──▶ ReactFlow nodes/edges (forceLayout)     │
│                                                      │              │
│                                                      ▼              │
│  useEffect(setNodes) ──▶ Position recalc ──▶ ReactFlow canvas     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Implementation Details

### Streaming Stability Mechanisms

1. **Path-based node IDs** (`root-0-1-2`) ensure stable identity during streaming
2. **Trailing newline detection** prevents partial heading parsing
3. **Direct state synchronization** keeps ReactFlow in sync with computed layout

### Performance Optimizations

1. **useMemo** for expensive tree processing
2. **useCallback** for stable function references
3. **Refs** (`currentProjectRef`, `replacementNodeIdsRef`) avoid stale closures in async callbacks
4. **Fire-and-forget saves** don't block streaming response

### Error Handling

- API errors logged and gracefully handled
- `onError` callback in `useObject` clears replacement state
- Invalid request bodies return 400 with Zod error details

---

## Deep Dive: Node Replacement Mechanics

This section provides an in-depth explanation of how node replacement works, from user selection to final map update.

### Path-Based Node ID System

Every node in the map has a unique path-based ID that encodes its position in the tree hierarchy:

```
ID Format: "root-{index}-{index}-..."

Examples:
  "root"       → The root node (document title)
  "root-0"     → First child of root
  "root-1"     → Second child of root
  "root-0-2"   → Third child of the first child of root
  "root-1-0-3" → Fourth child of first child of second child of root
```

This ID system is defined in `Map.tsx:61-101`:

```typescript
const processNode = (
  node: MapType,
  parentId: string | null,
  isRoot: boolean,
  colorIndex: number,
  depth: number,
  path: string  // ← Path-based ID
): string => {
  const currentId = path;
  // ...
  if (node.sections) {
    node.sections.forEach((child, index) => {
      const childPath = `${path}-${index}`;  // ← Appends child index
      processNode(child, currentId, false, childColorIndex, depth + 1, childPath);
    });
  }
};

// Initial call with "root"
processNode(report, null, true, 0, 0, "root");
```

### Path Parsing Utilities (`mapUtils.ts`)

```typescript
// Parse path into components
parseNodePath("root-0-1") → ["root", "0", "1"]

// Get parent ID
getParentId("root-0-1") → "root-0"
getParentId("root-0")   → "root"
getParentId("root")     → null

// Check ancestor relationship
isAncestor("root-0", "root-0-1")   → true
isAncestor("root-0", "root-1-0")   → false

// Get index within parent's sections array
getNodeIndex("root-0-2") → 2
getNodeIndex("root")     → -1
```

### Step 1: User Selection in ReactFlow

When user selects nodes (click, shift-click, or drag-select):

```typescript
// Map.tsx:254-266
const handleSelectionChange: OnSelectionChangeFunc = useCallback(
  ({ nodes: selectedNodes }) => {
    if (onSelectionChange) {
      const selected = selectedNodes.map((node) => ({
        id: node.id,       // e.g., "root-0-1"
        label: node.data.label,
        text: node.data.text,
      }));
      onSelectionChange(selected);  // → Sent to MapPanel
    }
  },
  [onSelectionChange]
);
```

### Step 2: Redundancy Filtering

Before replacement, child nodes are filtered if their parent is also selected:

```typescript
// mapUtils.ts:43-50
function filterRedundantNodes(nodeIds: string[]): string[] {
  return nodeIds.filter(nodeId => {
    // Remove node if any other selected node is its ancestor
    return !nodeIds.some(otherId =>
      otherId !== nodeId && isAncestor(otherId, nodeId)
    );
  });
}
```

**Example:**
```
User selects: ["root-0", "root-0-1", "root-0-2", "root-1"]

isAncestor("root-0", "root-0-1") → true (remove "root-0-1")
isAncestor("root-0", "root-0-2") → true (remove "root-0-2")

Filtered result: ["root-0", "root-1"]
```

**Why this matters:** Replacing a parent node already replaces all its children. Including children would cause duplicate or conflicting replacements.

### Step 3: Detecting Replacement Mode

The system determines if it's a single-node or multi-sibling replacement:

```typescript
// MapPanel.tsx:291-304
if (selectedNodes.length > 0 && userInput.trim() && map) {
  const nodeIds = selectedNodes.map(n => n.id);
  const filteredIds = filterRedundantNodes(nodeIds);

  setIsReplacingNodes(true);
  setReplacementNodeIds(filteredIds);

  submitReplacement({
    projectId,
    prompt: userInput,
    selectedNodes: selectedNodes,
    currentMap: map,
  });
}
```

### Step 4: Server-Side Prompt Construction

The server builds a context-aware prompt:

```typescript
// route.ts:44-82
function buildReplacementPrompt(
  prompt: string,
  selectedNodes: { id: string; label: string; text?: string }[],
  currentMap: MapType,
  isSingleNode: boolean
): string {
  // Get full node data including child count
  const selectedContext = selectedNodes.map(node => {
    const fullNode = getNodeByPath(currentMap, node.id);
    const childCount = fullNode?.sections?.length || 0;
    return `- "${node.label}"${node.text ? `: ${node.text}` : ''}${childCount > 0 ? ` (has ${childCount} children)` : ''}`;
  }).join('\n');

  return `You are a mind map editor...
Selected ${nodeWord}:
${selectedContext}

User's request: ${prompt}

Generate ${isSingleNode ? 'a replacement node' : `${nodeCount} replacement nodes`}...`;
}
```

### Step 5: Streaming Object Generation

The server uses Vercel AI SDK's `streamObject()` to stream structured data:

```typescript
// route.ts:127-131
const result = await streamObject({
  model: openai('gpt-4o-mini'),
  prompt: systemPrompt,
  schema: mapReplacementResponseSchema,  // { nodes: Map[] }
});

return result.toTextStreamResponse();
```

The schema enforces the structure:
```typescript
// schemas/map.ts
const mapSchema = z.object({
  title: z.string(),
  text: z.string(),
  sections: z.array(z.lazy(() => mapSchema)),
});

const mapReplacementResponseSchema = z.object({
  nodes: z.array(mapSchema),
});
```

### Step 6: Client-Side Streaming Reception

The `useObject` hook receives partial objects as they stream:

```typescript
// MapPanel.tsx:119-168
const {
  object: replacementObject,  // Partial<{ nodes: Map[] }>
  submit: submitReplacement,
  isLoading: isReplacingLoading,
} = useObject({
  api: '/api/map',
  schema: mapReplacementResponseSchema,
  onFinish: (event) => {
    // Final merge when stream completes
    // ...
  },
});
```

**Streaming progression example:**
```
t=0:   { }
t=1:   { nodes: [] }
t=2:   { nodes: [{ title: "New" }] }
t=3:   { nodes: [{ title: "New Section", text: "" }] }
t=4:   { nodes: [{ title: "New Section", text: "Description...", sections: [] }] }
t=5:   { nodes: [{ title: "New Section", text: "Description here", sections: [{ title: "Child" }] }] }
...
```

### Step 7: Real-Time Map Merging

As `replacementObject` updates, the map is reconstructed with partial replacements:

```typescript
// MapPanel.tsx:199-223
const map = useMemo(() => {
  if (isReplacingNodes && replacementObject?.nodes && replacementNodeIds.length > 0) {
    const baseMap = currentProject.map as MapType;

    if (replacementNodeIds.length === 1) {
      return replaceNodeInMap(
        baseMap,
        replacementNodeIds[0],
        replacementObject.nodes[0] as MapType
      );
    } else {
      return replaceSiblingNodesInMap(
        baseMap,
        replacementNodeIds,
        replacementObject.nodes as MapType[]
      );
    }
  }
  // ...
}, [isReplacingNodes, replacementObject, replacementNodeIds, ...]);
```

### Step 8: Single Node Replacement (`replaceNodeInMap`)

```typescript
// mapUtils.ts:84-107
function replaceNodeInMap(
  map: Map,
  nodeId: string,
  replacement: Map
): Map {
  const newMap = cloneMap(map);  // Deep clone to avoid mutation

  if (nodeId === 'root') {
    return replacement;  // Replace entire map
  }

  const parentId = getParentId(nodeId);
  if (!parentId) return newMap;

  const parent = getNodeByPath(newMap, parentId);  // Navigate to parent
  if (!parent || !parent.sections) return newMap;

  const index = getNodeIndex(nodeId);
  if (index >= 0 && index < parent.sections.length) {
    parent.sections[index] = replacement;  // Replace at index
  }

  return newMap;
}
```

**Visual example:**
```
Before (nodeId = "root-1"):
{
  title: "Report",
  sections: [
    { title: "Section A", ... },     // root-0
    { title: "OLD SECTION", ... },   // root-1 ← SELECTED
    { title: "Section C", ... }      // root-2
  ]
}

After:
{
  title: "Report",
  sections: [
    { title: "Section A", ... },     // root-0
    { title: "NEW SECTION", ... },   // root-1 ← REPLACED
    { title: "Section C", ... }      // root-2
  ]
}
```

### Step 9: Multi-Sibling Replacement (`replaceSiblingNodesInMap`)

```typescript
// mapUtils.ts:114-144
function replaceSiblingNodesInMap(
  map: Map,
  nodeIds: string[],
  replacements: Map[]
): Map {
  if (nodeIds.length === 0) return map;

  const newMap = cloneMap(map);
  const parentId = getParentId(nodeIds[0]);

  if (!parentId) {
    if (nodeIds.includes('root')) {
      return replacements[0] || map;
    }
    return newMap;
  }

  const parent = getNodeByPath(newMap, parentId);
  if (!parent || !parent.sections) return newMap;

  // Sort indices to find contiguous range
  const indices = nodeIds.map(getNodeIndex).sort((a, b) => a - b);
  const minIndex = indices[0];
  const maxIndex = indices[indices.length - 1];

  // Splice: remove range, insert replacements
  parent.sections.splice(minIndex, maxIndex - minIndex + 1, ...replacements);

  return newMap;
}
```

**Visual example:**
```
Before (nodeIds = ["root-1", "root-2"]):
{
  title: "Report",
  sections: [
    { title: "Section A" },    // root-0
    { title: "OLD B" },        // root-1 ← SELECTED
    { title: "OLD C" },        // root-2 ← SELECTED
    { title: "Section D" }     // root-3
  ]
}

replacements = [
  { title: "NEW B" },
  { title: "NEW C" },
  { title: "NEW C.5" }  // Can have different count!
]

After:
{
  title: "Report",
  sections: [
    { title: "Section A" },    // root-0
    { title: "NEW B" },        // root-1 ← REPLACED
    { title: "NEW C" },        // root-2 ← REPLACED
    { title: "NEW C.5" },      // root-3 ← NEW (inserted)
    { title: "Section D" }     // root-4 ← SHIFTED
  ]
}
```

**Note:** The splice operation allows the replacement count to differ from the original selection count.

### Step 10: Final State Update

When streaming completes, `onFinish` updates the project state with the final merged map:

```typescript
// MapPanel.tsx:126-162
onFinish: (event) => {
  const project = currentProjectRef.current;
  const nodeIds = replacementNodeIdsRef.current;

  if (event.object?.nodes && event.object.nodes.length > 0 && project) {
    const baseMap = project.map as MapType;
    let updatedMap: MapType;

    if (nodeIds.length === 1) {
      updatedMap = replaceNodeInMap(baseMap, nodeIds[0], event.object.nodes[0]);
    } else {
      updatedMap = replaceSiblingNodesInMap(baseMap, nodeIds, event.object.nodes);
    }

    setCurrentProject({ ...project, map: updatedMap });
  }

  setIsReplacingNodes(false);
  setReplacementNodeIds([]);
  setSelectedNodes([]);
},
```

### Step 11: Background Database Save

The server saves the merged map to Supabase in the background:

```typescript
// route.ts:134-160
(async () => {
  try {
    const finalObject = await result.object;

    if (finalObject?.nodes?.length > 0) {
      let updatedMap: MapType;

      if (isSingleNode) {
        updatedMap = replaceNodeInMap(currentMap, filteredIds[0], finalObject.nodes[0]);
      } else {
        updatedMap = replaceSiblingNodesInMap(currentMap, filteredIds, finalObject.nodes);
      }

      await saveMapToDatabase(projectId, updatedMap, supabase);
    }
  } catch (error) {
    console.error('Failed to save map to database:', error);
  }
})();
```

### Complete Replacement Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Node Replacement Flow                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. User Selection                                                          │
│     ┌─────────────┐                                                         │
│     │ ReactFlow   │ ──▶ selectedNodes: [{id: "root-1", label: "..."}]      │
│     │ (Map.tsx)   │                                                         │
│     └─────────────┘                                                         │
│            │                                                                │
│            ▼                                                                │
│  2. Filter Redundant Nodes                                                  │
│     ┌─────────────────────────────────────────────────────────┐             │
│     │ filterRedundantNodes(["root-0", "root-0-1", "root-1"])  │             │
│     │ → ["root-0", "root-1"]  (child "root-0-1" removed)      │             │
│     └─────────────────────────────────────────────────────────┘             │
│            │                                                                │
│            ▼                                                                │
│  3. Submit to API                                                           │
│     ┌─────────────────────────────────────────────┐                         │
│     │ submitReplacement({                         │                         │
│     │   projectId, prompt, selectedNodes,         │                         │
│     │   currentMap                                │                         │
│     │ })                                          │                         │
│     └─────────────────────────────────────────────┘                         │
│            │                                                                │
│            ▼                                                                │
│  4. Server: streamObject()                                                  │
│     ┌─────────────────────────────────────────────┐                         │
│     │ Streams: { nodes: [{ title: "...", ... }] } │                         │
│     └─────────────────────────────────────────────┘                         │
│            │                                                                │
│            ▼                                                                │
│  5. Client: useObject receives partial objects                              │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │ t=0: { }                                                        │     │
│     │ t=1: { nodes: [{ title: "New" }] }                              │     │
│     │ t=2: { nodes: [{ title: "New Section", text: "...", ... }] }    │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│            │                                                                │
│            ▼ (on each update)                                               │
│  6. Real-time merge via useMemo                                             │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │ if (replacementNodeIds.length === 1) {                          │     │
│     │   replaceNodeInMap(baseMap, nodeId, partialNode)                │     │
│     │ } else {                                                        │     │
│     │   replaceSiblingNodesInMap(baseMap, nodeIds, partialNodes)      │     │
│     │ }                                                               │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│            │                                                                │
│            ▼                                                                │
│  7. ReactFlow re-renders with merged map                                    │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │ processNode() generates updated nodes/edges                     │     │
│     │ useEffect syncs nodes/edges to ReactFlow state                  │     │
│     │ Canvas updates smoothly during streaming                        │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│            │                                                                │
│            ▼ (on stream complete)                                           │
│  8. Final state update                                                      │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │ onFinish: setCurrentProject({ ...project, map: finalMap })      │     │
│     │ setIsReplacingNodes(false)                                      │     │
│     │ setSelectedNodes([])                                            │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│            │                                                                │
│            ▼ (background, fire-and-forget)                                  │
│  9. Database save                                                           │
│     ┌─────────────────────────────────────────────────────────────────┐     │
│     │ await saveMapToDatabase(projectId, mergedMap, supabase)         │     │
│     └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Edge Cases Handled

1. **Root node replacement**: Returns the replacement directly as the new map
2. **Empty selections**: Returns original map unchanged
3. **Non-contiguous siblings**: Uses min/max indices to define splice range
4. **Different replacement count**: Splice naturally handles inserting more/fewer nodes
5. **Missing parent**: Safely returns original map if path traversal fails
6. **Partial streaming objects**: Null-checks prevent crashes during initial stream

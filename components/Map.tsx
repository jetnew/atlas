"use client";

import { useMemo, useCallback, useLayoutEffect, useRef, useEffect } from "react";
import { flextree } from "d3-flextree";
import {
  ReactFlow,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
  OnSelectionChangeFunc,
  useReactFlow,
  useNodesInitialized,
  ReactFlowProvider,
  useNodes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Map as MapType } from "@/lib/schemas/map";
import { NODE_COLORS } from "@/lib/constants";
import MapNodeComponent from "./MapNode";

const nodeTypes = {
  map: MapNodeComponent,
};

interface FlatNode {
  id: string;
  parentId: string | null;
  label: string;
  text?: string;
  hasChildren: boolean;
  isRoot: boolean;
  colorIndex: number;
  className: string;
}

interface TreeData {
  id: string;
  width: number;
  height: number;
  children?: TreeData[];
}

const FALLBACK_WIDTH = 300;
const FALLBACK_HEIGHT = 80;
const HORIZONTAL_SPACING = 40;
const VERTICAL_SPACING = 80;
const PADDING = 20;

export interface SelectedNode {
  id: string;
  label: string;
  text?: string;
}

interface MapProps {
  report: MapType | null;
  onSelectionChange?: (nodes: SelectedNode[]) => void;
}

// Get measured size from React Flow node (v12 uses node.measured.*)
function getMeasuredSize(node: Node) {
  return {
    width: node.measured?.width ?? FALLBACK_WIDTH,
    height: node.measured?.height ?? FALLBACK_HEIGHT,
  };
}

// Build a nested tree structure from flat nodes for d3-flextree
function buildNestedTree(
  flatNodes: FlatNode[],
  sizeById: globalThis.Map<string, { width: number; height: number }>
): TreeData {
  const childrenByParent = new globalThis.Map<string, string[]>();

  for (const n of flatNodes) {
    const parentId = n.parentId ?? "__VIRTUAL_ROOT__";
    const children = childrenByParent.get(parentId) ?? [];
    children.push(n.id);
    childrenByParent.set(parentId, children);
  }

  const makeNode = (id: string): TreeData => {
    const size = sizeById.get(id) ?? { width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT };
    const childIds = childrenByParent.get(id) ?? [];
    const children = childIds.length > 0 ? childIds.map(makeNode) : undefined;

    return {
      id,
      width: size.width,
      height: size.height,
      children,
    };
  };

  const rootChildren = childrenByParent.get("__VIRTUAL_ROOT__") ?? [];
  if (rootChildren.length === 1) {
    return makeNode(rootChildren[0]);
  }

  // Multiple roots: add a virtual root (not rendered)
  return {
    id: "__VIRTUAL_ROOT__",
    width: 1,
    height: 1,
    children: rootChildren.map(makeNode),
  };
}

// Inner component that uses React Flow hooks
function MapInner({
  report,
  onSelectionChange,
}: MapProps) {
  const { setNodes } = useReactFlow();
  const rfNodes = useNodes();
  const nodesInitialized = useNodesInitialized({ includeHiddenNodes: false });

  // Build flat nodes and edges from report data
  const { flatNodes, initialEdges, initialNodes } = useMemo(() => {
    if (!report) {
      return { flatNodes: [], initialEdges: [], initialNodes: [] };
    }

    const flatNodes: FlatNode[] = [];
    const edges: Edge[] = [];

    // Recursive function to process a MapNode and its children
    // Uses path-based IDs for stability during streaming
    const processNode = (
      node: MapType,
      parentId: string | null,
      isRoot: boolean,
      colorIndex: number,
      path: string
    ): void => {
      const currentId = path;
      const hasChildren = node.sections && node.sections.length > 0;
      const colorClasses = NODE_COLORS[colorIndex];

      flatNodes.push({
        id: currentId,
        parentId,
        label: node.title || (isRoot ? "Untitled" : "Section"),
        text: node.text,
        hasChildren,
        isRoot,
        colorIndex,
        className: `${colorClasses} border-2 rounded-lg`,
      });

      if (parentId) {
        edges.push({
          id: `edge-${parentId}-${currentId}`,
          source: parentId,
          target: currentId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        });
      }

      // Process children
      if (node.sections) {
        node.sections.forEach((child, index) => {
          // For root's direct children, assign different colors
          // For deeper nodes, inherit parent's color
          const childColorIndex = isRoot
            ? (index + 1) % NODE_COLORS.length
            : colorIndex;
          const childPath = `${path}-${index}`;
          processNode(child, currentId, false, childColorIndex, childPath);
        });
      }
    };

    // Process the root node with path-based ID
    processNode(report, null, true, 0, "root");

    // Create initial nodes with placeholder positions (will be laid out after measurement)
    const initialNodes: Node[] = flatNodes.map((flat) => ({
      id: flat.id,
      data: {
        label: flat.label,
        text: flat.text,
        hasChildren: flat.hasChildren,
        isRoot: flat.isRoot,
      },
      position: { x: 0, y: 0 },
      type: "map",
      className: flat.className,
    }));

    return { flatNodes, initialEdges: edges, initialNodes };
  }, [report]);

  const [nodes, setNodesState, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Track previous node IDs to detect structural changes
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const hasLaidOutRef = useRef(false);

  // Sync nodes and edges when data changes (before layout)
  useEffect(() => {
    const currentIds = new Set(initialNodes.map((n) => n.id));
    const prevIds = prevNodeIdsRef.current;
    const structureChanged =
      currentIds.size !== prevIds.size ||
      initialNodes.some((n) => !prevIds.has(n.id));

    if (structureChanged) {
      // Structure changed - reset nodes (positions will be fixed by layout)
      setNodesState(initialNodes);
      setEdges(initialEdges);
      hasLaidOutRef.current = false;
    } else {
      // Only content changed - update data but preserve positions
      setNodesState((currentNodes) => {
        const nodeById: Record<string, Node> = {};
        for (const n of initialNodes) {
          nodeById[n.id] = n;
        }
        return currentNodes.map((node) => {
          const newNode = nodeById[node.id];
          if (newNode) {
            return {
              ...node,
              data: newNode.data,
              className: newNode.className,
            };
          }
          return node;
        });
      });
      setEdges(initialEdges);
    }
    prevNodeIdsRef.current = currentIds;
  }, [initialNodes, initialEdges, setNodesState, setEdges]);

  // Build size map from measured React Flow nodes
  const sizeById = useMemo(() => {
    const map = new globalThis.Map<string, { width: number; height: number }>();
    for (const node of rfNodes) {
      map.set(node.id, getMeasuredSize(node));
    }
    return map;
  }, [rfNodes]);

  // Apply flextree layout after nodes are measured
  useLayoutEffect(() => {
    if (!nodesInitialized || flatNodes.length === 0) return;

    const treeData = buildNestedTree(flatNodes, sizeById);

    // Create flextree layout with variable node sizes
    const layout = flextree<TreeData>({
      children: (d) => d.children,
      nodeSize: (node) => [
        node.data.width + HORIZONTAL_SPACING,
        node.data.height + VERTICAL_SPACING,
      ],
      spacing: 0,
    });

    const root = layout.hierarchy(treeData);
    layout(root);

    // Build position map (flextree: x is center, y is top for vertical layout)
    const posById = new globalThis.Map<string, { xCenter: number; yTop: number }>();
    root.each((node) => {
      posById.set(node.data.id, { xCenter: node.x, yTop: node.y });
    });

    // Normalize to start near (0,0)
    let minX = Infinity;
    let minY = Infinity;

    for (const [id, pos] of posById) {
      if (id === "__VIRTUAL_ROOT__") continue;
      const size = sizeById.get(id) ?? { width: FALLBACK_WIDTH, height: FALLBACK_HEIGHT };
      minX = Math.min(minX, pos.xCenter - size.width / 2);
      minY = Math.min(minY, pos.yTop);
    }

    const shiftX = (Number.isFinite(minX) ? -minX : 0) + PADDING;
    const shiftY = (Number.isFinite(minY) ? -minY : 0) + PADDING;

    // Apply positions to React Flow nodes
    setNodes((prev) => {
      let changed = false;

      const next = prev.map((node) => {
        const pos = posById.get(node.id);
        if (!pos) return node;

        const size = getMeasuredSize(node);

        // Convert flextree center-based x to top-left position
        const x = pos.xCenter - size.width / 2 + shiftX;
        const y = pos.yTop + shiftY;

        // Only update if position actually changed (avoid update loops)
        if (Math.abs(node.position.x - x) > 0.5 || Math.abs(node.position.y - y) > 0.5) {
          changed = true;
          return { ...node, position: { x, y } };
        }

        return node;
      });

      return changed ? next : prev;
    });

    hasLaidOutRef.current = true;
  }, [nodesInitialized, flatNodes, sizeById, setNodes]);

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (onSelectionChange) {
        const selected = selectedNodes.map((node) => ({
          id: node.id,
          label: node.data.label as string,
          text: node.data.text as string | undefined,
        }));
        onSelectionChange(selected);
      }
    },
    [onSelectionChange]
  );

  if (!report) {
    return null;
  }

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onSelectionChange={handleSelectionChange}
        nodeTypes={nodeTypes}
        onInit={(instance) => {
          // Fit view once when ReactFlow initializes
          instance.fitView({ maxZoom: 1, duration: 0 });
        }}
        minZoom={0.3}
        maxZoom={3}
        panOnScroll
        proOptions={{
          hideAttribution: true,
        }}
      />
      <style jsx global>{`
        .react-flow__handle {
          opacity: 0;
          pointer-events: none;
        }
        .react-flow__background {
          background-image:
            linear-gradient(to right, #e7e5e4 1px, transparent 1px),
            linear-gradient(to bottom, #e7e5e4 1px, transparent 1px);
          background-size: 20px 20px;
          background-position: 0 0, 0 0;
          mask-image:
            repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            radial-gradient(ellipse 100% 80% at 50% 100%, #000 50%, transparent 90%);
          -webkit-mask-image:
            repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            radial-gradient(ellipse 100% 80% at 50% 100%, #000 50%, transparent 90%);
          mask-composite: intersect;
          -webkit-mask-composite: source-in;
        }
      `}</style>
    </>
  );
}

// Main component wraps with ReactFlowProvider so inner component can use hooks
export default function Map({ report, onSelectionChange }: MapProps) {
  if (!report) {
    return null;
  }

  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <MapInner report={report} onSelectionChange={onSelectionChange} />
      </ReactFlowProvider>
    </div>
  );
}

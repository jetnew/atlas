"use client";

import { useMemo, useEffect, useCallback, useRef } from "react";
import { stratify, tree } from "d3-hierarchy";
import {
  ReactFlow,
  Node,
  Edge,
  MarkerType,
  useNodesState,
  useEdgesState,
  OnSelectionChangeFunc,
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
}

const NODE_WIDTH = 300;
const NODE_HEIGHT = 120;
const HORIZONTAL_SPACING = 20;
const VERTICAL_SPACING = 120;

export interface SelectedNode {
  id: string;
  label: string;
  text?: string;
}

interface MapProps {
  report: MapType | null;
  onSelectionChange?: (nodes: SelectedNode[]) => void;
}

export default function Map({ report, onSelectionChange }: MapProps) {
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!report) {
      return { initialNodes: [], initialEdges: [] };
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
      depth: number,
      path: string
    ): string => {
      const currentId = path;
      const hasChildren = node.sections && node.sections.length > 0;

      flatNodes.push({
        id: currentId,
        parentId,
        label: node.title || (isRoot ? "Untitled" : "Section"),
        text: node.text,
        hasChildren,
        isRoot,
        colorIndex,
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
          processNode(child, currentId, false, childColorIndex, depth + 1, childPath);
        });
      }

      return currentId;
    };

    // Process the root node with path-based ID
    processNode(report, null, true, 0, 0, "root");

    // Build hierarchy using d3-hierarchy stratify
    const root = stratify<FlatNode>()
      .id((d) => d.id)
      .parentId((d) => d.parentId)(flatNodes);

    // Create tree layout with dynamic separation based on subtree size
    const treeLayout = tree<FlatNode>()
      .nodeSize([NODE_WIDTH + HORIZONTAL_SPACING, NODE_HEIGHT + VERTICAL_SPACING])
      .separation((a, b) => {
        return (a.leaves().length + b.leaves().length) / 2
      });

    // Apply layout
    treeLayout(root);

    // Convert to ReactFlow nodes with computed positions
    const nodes: Node[] = root.descendants().map((d) => {
      const colorClasses = NODE_COLORS[d.data.colorIndex];
      return {
        id: d.data.id,
        data: {
          label: d.data.label,
          text: d.data.text,
          hasChildren: d.data.hasChildren,
          isRoot: d.data.isRoot,
        },
        position: { x: d.x!, y: d.y! },
        type: "map",
        className: `${colorClasses} border-2 rounded-lg`,
      };
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [report]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Track previous node IDs to detect structural changes
  const prevNodeIdsRef = useRef<Set<string>>(new Set());
  const rafRef = useRef<number | null>(null);

  // Sync nodes and edges when initialNodes/initialEdges change
  // Debounce using requestAnimationFrame to prevent overwhelming ReactFlow
  useEffect(() => {
    // Detect if structure changed (nodes added/removed)
    const currentIds = new Set(initialNodes.map(n => n.id));
    const prevIds = prevNodeIdsRef.current;
    const structureChanged =
      currentIds.size !== prevIds.size ||
      initialNodes.some(n => !prevIds.has(n.id));

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (structureChanged) {
        // Structure changed - use new positions from layout
        setNodes(initialNodes);
        setEdges(initialEdges);
      } else {
        // Only content changed - preserve positions, update data only
        setNodes(currentNodes => {
          const nodeById: Record<string, Node> = {};
          for (const n of initialNodes) {
            nodeById[n.id] = n;
          }
          return currentNodes.map(node => {
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
      rafRef.current = null;
    });

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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
    return (
      null
    );
  }

  return (
    <div className="w-full h-full">
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
        onlyRenderVisibleElements
      >
      </ReactFlow>
      <style jsx global>{`
        .react-flow__handle {
          opacity: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}

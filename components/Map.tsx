"use client";

import { useMemo, useEffect, useCallback } from "react";
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

  // Merge new nodes with existing ones to prevent flickering during streaming
  // Only update nodes that have changed, preserving existing nodes
  useEffect(() => {
    setNodes((currentNodes) => {
      if (currentNodes.length === 0) {
        return initialNodes;
      }

      // Create a map of current nodes by ID for quick lookup
      const currentNodeMap = Object.fromEntries(currentNodes.map((node) => [node.id, node]));

      // Build the new nodes array
      const newNodes: Node[] = [];

      // Add/update nodes from initialNodes
      for (const initialNode of initialNodes) {
        const existingNode = currentNodeMap[initialNode.id];
        if (existingNode) {
          // Node exists - check if data has changed
          const dataChanged =
            existingNode.data.label !== initialNode.data.label ||
            existingNode.data.text !== initialNode.data.text ||
            existingNode.data.hasChildren !== initialNode.data.hasChildren;

          if (dataChanged) {
            // Update data but preserve position if node was dragged
            newNodes.push({
              ...initialNode,
              position: existingNode.position,
            });
          } else {
            // No changes - keep existing node as-is
            newNodes.push(existingNode);
          }
        } else {
          // New node - add it
          newNodes.push(initialNode);
        }
      }

      return newNodes;
    });

    setEdges((currentEdges) => {
      if (currentEdges.length === 0) {
        return initialEdges;
      }

      // Create sets of edge IDs for quick lookup
      const currentEdgeIdSet: Record<string, boolean> = {};
      const initialEdgeIdSet: Record<string, boolean> = {};
      for (const edge of currentEdges) currentEdgeIdSet[edge.id] = true;
      for (const edge of initialEdges) initialEdgeIdSet[edge.id] = true;

      // Keep existing edges that are still valid, add new edges
      const newEdges: Edge[] = [];

      // Keep edges that exist in both
      for (const edge of currentEdges) {
        if (initialEdgeIdSet[edge.id]) {
          newEdges.push(edge);
        }
      }

      // Add new edges that don't exist yet
      for (const edge of initialEdges) {
        if (!currentEdgeIdSet[edge.id]) {
          newEdges.push(edge);
        }
      }

      return newEdges;
    });
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const handleSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes }) => {
      if (onSelectionChange) {
        const selected = selectedNodes.map((node) => ({
          id: node.id,
          label: node.data.label as string,
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
        fitView
        fitViewOptions={{
          maxZoom: 1,
          minZoom: 1,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.3}
        maxZoom={3}
        panOnScroll
        proOptions={{
          hideAttribution: true,
        }}
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

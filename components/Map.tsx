"use client";

import { useMemo } from "react";
import { stratify, tree, HierarchyPointNode } from "d3-hierarchy";
import {
  ReactFlow,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Map as MapType } from "@/lib/schemas/report";

export const NODE_COLORS = [
  ["#ffe4e6", "#fff1f2"], // rose 100, 50
  ["#fef3c7", "#fffbeb"], // amber 100, 50
  ["#dcfce7", "#f0fdf4"], // green 100, 50
  ["#e0f2fe", "#f0f9ff"], // sky 100, 50
  ["#ede9fe", "#f5f3ff"], // violet 100, 50
  ["#fae8ff", "#fdf4ff"], // fuchsia 100, 50
] as const;

interface MapProps {
  report: MapType | null;
}

export default function Map({ report }: MapProps) {
  const { nodes, edges } = useMemo(() => {
    if (!report || !report.report || !report.report.sections) {
      return { nodes: [], edges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;

    // Root node - Title
    const rootId = `node-${nodeId++}`;
    const rootColor = NODE_COLORS[0];
    nodes.push({
      id: rootId,
      data: { label: report.report.title || "Untitled Report" },
      position: { x: 0, y: 0 },
      type: "input",
      style: {
        backgroundColor: rootColor[1],
        border: `2px solid ${rootColor[0]}`,
      },
    });

    // Section nodes (children of root)
    report.report.sections.forEach((section, sectionIndex) => {
      if (!section.section) return;

      const sectionId = `node-${nodeId++}`;
      const hasSubsections = section.section.content && section.section.content.length > 0;
      const sectionColor = NODE_COLORS[(sectionIndex + 1) % NODE_COLORS.length];

      nodes.push({
        id: sectionId,
        data: { label: section.section.heading || `Section ${sectionIndex + 1}` },
        position: { x: 0, y: 0 },
        type: hasSubsections ? "default" : "output",
        style: {
          backgroundColor: sectionColor[1],
          border: `2px solid ${sectionColor[0]}`,
        },
      });

      edges.push({
        id: `edge-${rootId}-${sectionId}`,
        source: rootId,
        target: sectionId,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed },
      });

      // Subsection nodes (children of sections)
      if (!section.section.content) return;
      section.section.content.forEach((subsection, subsectionIndex) => {
        if (!subsection.subsection) return;

        const subsectionId = `node-${nodeId++}`;
        const hasSubsubsections = subsection.subsection.subsubsection && subsection.subsection.subsubsection.length > 0;
        const subsectionColor = NODE_COLORS[(sectionIndex + 1) % NODE_COLORS.length];

        nodes.push({
          id: subsectionId,
          data: {
            label: subsection.subsection.subheading || `Subsection ${subsectionIndex + 1}`,
          },
          position: { x: 0, y: 0 },
          type: hasSubsubsections ? "default" : "output",
          style: {
            backgroundColor: subsectionColor[1],
            border: `2px solid ${subsectionColor[0]}`,
          },
        });

        edges.push({
          id: `edge-${sectionId}-${subsectionId}`,
          source: sectionId,
          target: subsectionId,
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        });

        // Subsubsection nodes (grandchildren)
        if (!subsection.subsection.subsubsection) return;
        subsection.subsection.subsubsection.forEach((subsubsection, subsubIndex) => {
          const subsubId = `node-${nodeId++}`;
          const subsubColor = NODE_COLORS[(sectionIndex + 1) % NODE_COLORS.length];

          nodes.push({
            id: subsubId,
            data: {
              label: subsubsection.subsubheading || `Subsubsection ${subsubIndex + 1}`,
            },
            position: { x: 0, y: 0 },
            type: "output",
            style: {
              backgroundColor: subsubColor[1],
              border: `2px solid ${subsubColor[0]}`,
            },
          });

          edges.push({
            id: `edge-${subsectionId}-${subsubId}`,
            source: subsectionId,
            target: subsubId,
            type: "smoothstep",
            markerEnd: { type: MarkerType.ArrowClosed },
          });
        });
      });
    });

    // Apply D3 tree layout
    if (nodes.length > 0) {
      const hierarchy = stratify<Node>()
        .id((node: Node) => node.id)
        .parentId((node: Node) => edges.find((edge) => edge.target === node.id)?.source);

      const root = hierarchy(nodes);
      const treeLayout = tree<Node>()
        .nodeSize([180, 160])
        .separation((a: HierarchyPointNode<Node>, b: HierarchyPointNode<Node>) => {
          // If nodes share the same parent, use tighter spacing
          if (a.parent === b.parent) {
            return 0.9;
          }
          // If they're in different subtrees at the top level, use even tighter spacing
          return 1;
        });
      const layout = treeLayout(root);

      layout.descendants().forEach((node: HierarchyPointNode<Node>) => {
        const originalNode = nodes.find((n) => n.id === node.data.id);
        if (originalNode) {
          originalNode.position = { x: node.x, y: node.y };
        }
      });
    }

    return { nodes, edges };
  }, [report]);

  if (!report) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No report data available
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
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

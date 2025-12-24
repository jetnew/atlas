"use client";

import { useMemo } from "react";
import { stratify, tree } from "d3-hierarchy";
import {
  ReactFlow,
  Node,
  Edge,
  MarkerType,
  SelectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Map as MapType } from "@/lib/schemas/report";
import { NODE_COLORS } from "@/lib/constants";
import MapNode from "./MapNode";

const nodeTypes = {
  map: MapNode,
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

const NODE_WIDTH = 320;
const NODE_HEIGHT = 100;
const HORIZONTAL_SPACING = 0;
const VERTICAL_SPACING = 120;

interface MapProps {
  report: MapType | null;
}

export default function Map({ report }: MapProps) {
  const { nodes, edges } = useMemo(() => {
    if (!report || !report.report || !report.report.sections) {
      return { nodes: [], edges: [] };
    }

    const flatNodes: FlatNode[] = [];
    const edges: Edge[] = [];
    let nodeId = 0;

    // Root node - Title
    const rootId = `node-${nodeId++}`;
    flatNodes.push({
      id: rootId,
      parentId: null,
      label: report.report.title || "Untitled Report",
      text: report.report.text,
      hasChildren: report.report.sections.length > 0,
      isRoot: true,
      colorIndex: 0,
    });

    // Section nodes (children of root)
    report.report.sections.forEach((section, sectionIndex) => {
      if (!section.section) return;

      const sectionId = `node-${nodeId++}`;
      const hasSubsections = section.section.content && section.section.content.length > 0;
      const colorIndex = (sectionIndex + 1) % NODE_COLORS.length;

      flatNodes.push({
        id: sectionId,
        parentId: rootId,
        label: section.section.heading || `Section ${sectionIndex + 1}`,
        text: section.section.text,
        hasChildren: hasSubsections,
        isRoot: false,
        colorIndex,
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

        flatNodes.push({
          id: subsectionId,
          parentId: sectionId,
          label: subsection.subsection.subheading || `Subsection ${subsectionIndex + 1}`,
          text: subsection.subsection.text,
          hasChildren: hasSubsubsections,
          isRoot: false,
          colorIndex,
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

          flatNodes.push({
            id: subsubId,
            parentId: subsectionId,
            label: subsubsection.subsubheading || `Subsubsection ${subsubIndex + 1}`,
            text: subsubsection.text,
            hasChildren: false,
            isRoot: false,
            colorIndex,
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
      const color = NODE_COLORS[d.data.colorIndex];
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
        style: {
          backgroundColor: color[1],
          border: `2px solid ${color[0]}`,
        },
      };
    });

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
        selectionMode={SelectionMode.Partial}
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

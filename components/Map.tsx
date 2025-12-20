"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Node,
  Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Report as ReportType } from "@/lib/schemas/report";

interface MapProps {
  report: ReportType | null;
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
    nodes.push({
      id: rootId,
      data: { label: report.report.title || "Untitled Report" },
      position: { x: 0, y: 0 },
      type: "default",
      style: {
        background: "#6366f1",
        color: "#fff",
        border: "1px solid #4f46e5",
        borderRadius: "8px",
        padding: "10px",
        fontSize: "14px",
        fontWeight: "bold",
      },
    });

    const currentY = 150;
    const subsectionSpacing = 150;
    const subsubsectionSpacing = 150;

    // Section nodes (children of root)
    report.report.sections.forEach((section, sectionIndex) => {
      if (!section.section) return;

      const sectionId = `node-${nodeId++}`;
      const sectionX = (sectionIndex - (report.report.sections.length - 1) / 2) * 300;

      nodes.push({
        id: sectionId,
        data: { label: section.section.heading || `Section ${sectionIndex + 1}` },
        position: { x: sectionX, y: currentY },
        type: "default",
        style: {
          background: "#8b5cf6",
          color: "#fff",
          border: "1px solid #7c3aed",
          borderRadius: "6px",
          padding: "8px",
          fontSize: "12px",
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
        const subsectionX = sectionX + (subsectionIndex - (section.section.content.length - 1) / 2) * 250;
        const subsectionY = currentY + subsectionSpacing;

        nodes.push({
          id: subsectionId,
          data: {
            label: subsection.subsection.subheading || `Subsection ${subsectionIndex + 1}`,
          },
          position: { x: subsectionX, y: subsectionY },
          type: "default",
          style: {
            background: "#a78bfa",
            color: "#fff",
            border: "1px solid #8b5cf6",
            borderRadius: "6px",
            padding: "8px",
            fontSize: "11px",
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
          const subsubX = subsectionX + (subsubIndex - (subsection.subsection.subsubsection.length - 1) / 2) * 200;
          const subsubY = subsectionY + subsubsectionSpacing;

          nodes.push({
            id: subsubId,
            data: {
              label: subsubsection.subsubheading || `Subsubsection ${subsubIndex + 1}`,
            },
            position: { x: subsubX, y: subsubY },
            type: "default",
            style: {
              background: "#c4b5fd",
              color: "#000",
              border: "1px solid #a78bfa",
              borderRadius: "4px",
              padding: "6px",
              fontSize: "10px",
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
        proOptions={{
          hideAttribution: true,
        }}
      >
        <Background />
      </ReactFlow>
    </div>
  );
}

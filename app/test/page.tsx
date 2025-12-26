"use client";

import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const initialNodes = [
  {
    id: "1",
    position: { x: 0, y: 0 },
    data: { label: "Node 1" },
  },
  {
    id: "2",
    position: { x: 200, y: 100 },
    data: { label: "Node 2" },
  },
  {
    id: "3",
    position: { x: 0, y: 200 },
    data: { label: "Node 3" },
  },
];

const initialEdges = [
  { id: "e1-2", source: "1", target: "2" },
  { id: "e1-3", source: "1", target: "3" },
];

export default function TestPage() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <ReactFlow nodes={initialNodes} edges={initialEdges}>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

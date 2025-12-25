"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { Streamdown } from "streamdown";

interface MapNodeData {
  label: string;
  text?: string;
  hasChildren?: boolean;
  isRoot?: boolean;
}

const MapNode = memo(({ data }: { data: MapNodeData }) => {
  const { label, text, hasChildren, isRoot } = data;

  return (
    <>
      {!isRoot && <Handle type="target" position={Position.Top} />}
      <div className={`flex flex-col gap-2 p-3 w-[300px]`}>
        {text ? (
          <>
            <div className="font-medium text-sm mb-2">
              <Streamdown className="no-margins">{label}</Streamdown>
            </div>
            <div className="text-xs text-muted-foreground whitespace-pre-wrap">
              <Streamdown className="no-margins">{text}</Streamdown>
            </div>
          </>
        ) : (
          <div className="font-semibold text-md text-center">
            <Streamdown>{label}</Streamdown>
          </div>
        )}
      </div>
      {hasChildren && <Handle type="source" position={Position.Bottom} />}
    </>
  );
});

MapNode.displayName = "MapNode";

export default MapNode;

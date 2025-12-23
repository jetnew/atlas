"use client";

import { memo } from "react";
import { Handle, useStore, Position } from "@xyflow/react";
import { Streamdown } from "streamdown";

const zoomSelector = (s: { transform: [number, number, number] }) => s.transform[2] >= 1.5;

interface ZoomNodeData {
  label: string;
  text?: string;
  hasChildren?: boolean;
  isRoot?: boolean;
}

const ZoomNode = memo(({ data }: { data: ZoomNodeData }) => {
  const showContent = useStore(zoomSelector);
  const { label, text, hasChildren, isRoot } = data;

  return (
    <>
      {!isRoot && <Handle type="target" position={Position.Top} />}
      <div className="flex flex-col gap-2 p-3 min-w-[120px] max-w-[160px]">
        {text ? (
          <>
            <div className={showContent ? 'block' : 'hidden'}>
              <div className="font-semibold text-[7px] mb-2">
                <Streamdown className="no-margins">{label}</Streamdown>
              </div>
              <div className="text-[7px] text-muted-foreground whitespace-pre-wrap">
                <Streamdown className="no-margins">{text}</Streamdown>
              </div>
            </div>
            <div className={showContent ? 'hidden' : 'block'}>
              <div className="text-xs font-medium text-center">
                <Streamdown>{label}</Streamdown>
              </div>
            </div>
          </>
        ) : (
          <div className="font-medium text-sm text-center">
            <Streamdown>{label}</Streamdown>
          </div>
        )}
      </div>
      {hasChildren && <Handle type="source" position={Position.Bottom} />}
    </>
  );
});

ZoomNode.displayName = "ZoomNode";

export default ZoomNode;

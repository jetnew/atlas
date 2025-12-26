"use client";

import { useState } from "react";
import { Node } from "@xyflow/react";
import { ArrowUpIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group";

interface SelectionToolbarProps {
  position: { x: number; y: number };
  selectedNodes: Node[];
}

export default function SelectionToolbar({
  position,
  selectedNodes,
}: SelectionToolbarProps) {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim()) {
      // TODO: Handle sending the message with selected nodes context
      console.log("Send:", input, "for nodes:", selectedNodes.map(n => n.id));
      setInput("");
    }
  };

  return (
    <div
      className="fixed z-50 -translate-x-1/2"
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <InputGroup className="max-w-lg bg-background shadow-lg">
        <InputGroupTextarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about selected nodes..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="justify-end w-full">
          <InputGroupButton
            variant="default"
            className="rounded-full shrink-0"
            size="icon-xs"
            disabled={!input.trim()}
            onClick={handleSend}
            type="button"
          >
            <ArrowUpIcon />
            <span className="sr-only">Send</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </div>
  );
}

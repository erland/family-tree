import React from "react";
import { Handle, Position } from "reactflow";

export default function MarriageNode({ data }: any) {
  return (
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: "50%",
        background: "#ff9800",
        border: "2px solid #e65100",
        margin: "auto",
      }}
    >
      {/* Spouse handles */}
      <Handle type="target" position={Position.Left} id="left" />
      <Handle type="target" position={Position.Right} id="right" />

      {/* Children handle */}
      <Handle type="source" position={Position.Bottom} id="bottom" />
    </div>
  );
}
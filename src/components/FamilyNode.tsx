import React from "react";
import { Handle, Position } from "reactflow";
import { fullName } from "../utils/nameUtils";

export default function FamilyNode({ data }: any) {
  return (
    <div
      style={{
        width: 180,
        height: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        border: data.isRoot ? "2px solid #f44336" : "1px solid #90caf9",
        background: data.isRoot ? "#ffebee" : "#e3f2fd",
        fontSize: 12,
        textAlign: "center",
        boxSizing: "border-box",
      }}
    >
      {fullName(data.individual)}

      {/* Parent-child handles */}
      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Bottom} id="bottom" />

      {/* Spouse handles */}
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Left} id="left" />
    </div>
  );
}
import React from "react";
import { Handle, Position, NodeProps } from "reactflow";

export default function FamilyNode({ data }: NodeProps) {
  return (
    <div
      style={{
        padding: "4px 8px",           // smaller padding
        borderRadius: 4,              // less rounded
        border: "1px solid #90caf9",  // thin border
        background: "#fff",           // default node background
        textAlign: "center",
        fontSize: 12,
        minWidth: 120,
        height: "auto",
        lineHeight: "32px",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",      }}
    >
      {/* Root badge */}
      {data.isRoot && (
        <div
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: "#fdd835",
            borderRadius: "50%",
            width: 16,
            height: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: "bold",
            color: "#000",
            boxShadow: "0 1px 2px rgba(0,0,0,0.3)",
          }}
        >
          ⭐
        </div>
      )}

      {data.label}

      {/* Handles */}
      <Handle type="source" position={Position.Top} id="top" />
      <Handle type="source" position={Position.Right} id="right" />
      <Handle type="source" position={Position.Bottom} id="bottom" />
      <Handle type="source" position={Position.Left} id="left" />

      <Handle type="target" position={Position.Top} id="top" />
      <Handle type="target" position={Position.Right} id="right" />
      <Handle type="target" position={Position.Bottom} id="bottom" />
      <Handle type="target" position={Position.Left} id="left" />
    </div>
  );
}
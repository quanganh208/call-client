import React from "react";
import { ChatInput } from "./ChatInput";

interface ChatContentProps {
  userInfo: any;
  onFocus: () => void;
  height?: string;
}

export function ChatContent({
  userInfo,
  onFocus,
  height = "400px",
}: ChatContentProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        flex: 1,
        height: height,
      }}
    >
      <div style={{ flex: 1, padding: "16px", overflowY: "auto" }}>
        {/* Chat messages will go here */}
      </div>

      <ChatInput userInfo={userInfo} onFocus={onFocus} />
    </div>
  );
}

import React from "react";
import { Avatar, Row, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";

const { Text } = Typography;

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp: string;
}

export function ChatMessage({ content, isUser, timestamp }: ChatMessageProps) {
  return (
    <Row
      justify={isUser ? "end" : "start"}
      style={{
        margin: "8px 0",
        width: "100%"
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isUser ? "row-reverse" : "row",
          alignItems: "flex-end",
          maxWidth: "70%"
        }}
      >
        {!isUser ? (
          <Avatar
            size={32}
            icon={<UserOutlined />}
            style={{ marginRight: "8px", flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: "8px" }} />
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isUser ? "flex-end" : "flex-start",
          }}
        >
          <Text
            style={{
              fontSize: "10px",
              margin: isUser ? "0 8px 4px 0" : "0 0 4px 8px",
              color: "#999"
            }}
          >
            {timestamp}
          </Text>
          <div
            style={{
              backgroundColor: isUser ? "#1E3150" : "#f0f0f0",
              padding: "8px 12px",
              borderRadius: "12px",
              borderBottomRightRadius: isUser ? "4px" : "12px",
              borderBottomLeftRadius: isUser ? "12px" : "4px",
            }}
          >
            <Text style={{ color: isUser ? "white" : "#333", wordBreak: "break-word" }}>
              {content}
            </Text>
          </div>
        </div>
      </div>
    </Row>
  );
}

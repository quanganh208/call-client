import React from "react";
import {Avatar, Row, Typography} from "antd";
import {UserOutlined} from "@ant-design/icons";
import {CheckOutlined, LoadingOutlined, ExclamationCircleOutlined} from "@ant-design/icons";

const {Text} = Typography;

interface ChatMessageProps {
  content: string;
  isUser: boolean;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  showHeader?: boolean;
  showStatus?: boolean;
}

export function ChatMessage({
                              content,
                              isUser,
                              timestamp,
                              status,
                              showHeader = true,
                              showStatus = true
                            }: ChatMessageProps) {
  const renderStatusIcon = () => {
    if (!isUser || !status) return null;
    if (!showStatus) return <div style={{width: '11px', margin: '0 4px'}}/>;

    switch (status) {
      case 'sending':
        return <LoadingOutlined style={{fontSize: '11px', color: '#999', margin: '0 4px'}}/>;
      case 'sent':
        return <CheckOutlined style={{fontSize: '11px', color: '#52c41a', margin: '0 4px'}}/>;
      case 'error':
        return <ExclamationCircleOutlined style={{fontSize: '11px', color: '#ff4d4f', margin: '0 4px'}}/>;
      default:
        return null;
    }
  };

  return (
    <Row
      justify={isUser ? "end" : "start"}
      style={{
        margin: "4px 0",
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
            icon={<UserOutlined/>}
            style={{marginRight: "8px", flexShrink: 0}}
          />
        ) : (
          <>
            {renderStatusIcon()}
          </>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: isUser ? "flex-end" : "flex-start",
          }}
        >
          {showHeader && (
            <Text
              style={{
                fontSize: "11px",
                margin: isUser ? "0 8px 4px 0" : "0 0 4px 8px",
                color: "#999"
              }}
            >
              {isUser ? 'Tôi' : 'Admin'}, {timestamp}
            </Text>
          )}
          <div
            style={{
              backgroundColor: isUser ? "#1E3150" : "#f0f0f0",
              padding: "8px 12px",
              borderRadius: "12px",
              borderBottomRightRadius: isUser ? "4px" : "12px",
              borderBottomLeftRadius: isUser ? "12px" : "4px",
            }}
          >
            <Text style={{color: isUser ? "white" : "#333", wordBreak: "break-word"}}>
              {content}
            </Text>
          </div>
        </div>
      </div>
    </Row>
  );
}

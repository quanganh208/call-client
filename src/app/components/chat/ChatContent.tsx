import React, {useState, useEffect, useRef} from "react";
import {ChatInput} from "./ChatInput";
import {ChatMessage} from "./ChatMessage";
import {FileMessage} from "./FileMessage";
import {message, Badge} from "antd";
import {DownOutlined} from "@ant-design/icons";
import {formatFileSize} from "@/util/format";
import {Message} from "@/types/chat";


export function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isUserSending, setIsUserSending] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isNewMessageAdded, setIsNewMessageAdded] = useState(false);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
      setNewMessageCount(0);
    }
  };

  const handleScroll = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const {scrollTop, scrollHeight, clientHeight} = container;
      const isNearBottom = scrollTop >= scrollHeight - clientHeight - 100;

      setShowScrollButton(!isNearBottom);

      setIsUserScrolling(!isNearBottom);

      if (isNearBottom) {
        setNewMessageCount(0);
      }
    }
  };

  useEffect(() => {
    if (!isUserScrolling || isUserSending) {
      const timeoutId = setTimeout(() => {
        scrollToBottom();
        setIsUserSending(false);
        setIsNewMessageAdded(false);
      }, 100);
      return () => clearTimeout(timeoutId);
    } else if (
      isNewMessageAdded &&
      messages.length > 0 &&
      !messages[messages.length - 1].isUser
    ) {
      setNewMessageCount((prev) => prev + 1);
    }
  }, [messages, isUserScrolling, isUserSending, isNewMessageAdded]);

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    setIsUserSending(true);

    const newMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      isUser: true,
      timestamp: new Date().toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: "text",
    };

    setMessages((prev) => [...prev, newMessage]);

    setTimeout(() => {
      const adminResponse: Message = {
        id: (Date.now() + 1).toString(),
        content:
          "Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất có thể.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "text",
      };
      setMessages((prev) => [...prev, adminResponse]);
      setIsNewMessageAdded(true);
    }, 5000);
  };

  const handleSendFile = async (file: File) => {
    try {
      setIsUserSending(true);

      const fileUrl = URL.createObjectURL(file);

      const newMessage: Message = {
        id: Date.now().toString(),
        content: "",
        isUser: true,
        timestamp: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        type: "file",
        fileInfo: {
          fileName: file.name,
          fileType: file.type,
          fileSize: formatFileSize(file.size),
          fileUrl: fileUrl,
        },
      };

      setMessages((prev) => [...prev, newMessage]);

      setTimeout(() => {
        const adminResponse: Message = {
          id: (Date.now() + 1).toString(),
          content:
            "Đã nhận được file của bạn. Chúng tôi sẽ xem xét và phản hồi sớm.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          type: "text",
        };
        setMessages((prev) => [...prev, adminResponse]);
        setIsNewMessageAdded(true);
      }, 1000);
    } catch (error) {
      message.error(`Có lỗi xảy ra khi gửi file: ${String(error)}`);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fff",
        flex: 1,
        height: "100%",
        position: "relative",
      }}
    >
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          paddingTop: "8px",
          paddingLeft: "8px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {messages.map((message) =>
          message.type === "text" ? (
            <ChatMessage
              key={message.id}
              content={message.content}
              isUser={message.isUser}
              timestamp={message.timestamp}
            />
          ) : message.fileInfo ? (
            <FileMessage
              key={message.id}
              fileName={message.fileInfo.fileName}
              fileType={message.fileInfo.fileType}
              fileSize={message.fileInfo.fileSize}
              fileUrl={message.fileInfo.fileUrl}
              isUser={message.isUser}
              timestamp={message.timestamp}
            />
          ) : null
        )}
      </div>

      {showScrollButton && (
        <div
          onClick={() => {
            scrollToBottom();
            setIsUserScrolling(false);
          }}
          style={{
            position: "absolute",
            right: "20px",
            bottom: "120px",
            backgroundColor: "white",
            color: "black",
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "all 0.3s",
            opacity: showScrollButton ? 1 : 0,
            transform: `scale(${showScrollButton ? 1 : 0})`,
          }}
        >
          <Badge
            count={newMessageCount}
            offset={[8, -8]}
            overflowCount={10}
            size="small"
          >
            <DownOutlined/>
          </Badge>
        </div>
      )}

      <ChatInput
        onSendMessage={handleSendMessage}
        onSendFile={handleSendFile}
      />
    </div>
  );
}

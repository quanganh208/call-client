import React, {useState, useEffect, useRef, useCallback} from "react";
import {ChatInput} from "./ChatInput";
import {ChatMessage} from "./ChatMessage";
import {FileMessage} from "./FileMessage";
import {message, Badge} from "antd";
import {DownOutlined} from "@ant-design/icons";
import {Message} from "@/types/chat";
import StompService from "@/api/stomp-services";
import moment from "moment";


export function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([]);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isUserSending, setIsUserSending] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isNewMessageAdded, setIsNewMessageAdded] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const stompServiceRef = useRef<StompService | null>(null);

  const savedUserInfo = JSON.parse(localStorage.getItem("userInfo")!);

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

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    setIsUserSending(true);

    const newMessage: Message = {
      cmChatId: Date.now(),
      adClientId: savedUserInfo.AD_Client_ID,
      adOrgId: savedUserInfo.AD_Org_ID,
      adUserId: savedUserInfo.AD_User.id,
      cmChatGroupId: savedUserInfo.CM_ChatGroup_ID,
      socialName: savedUserInfo.SocialName,
      contentText: content,
      dataType: 'Text',
    };

    stompServiceRef.current?.sendMessage(newMessage);
    setMessages((prev) => [...prev, {...newMessage, status: 'sending'}]);
  };

  const handleSendFile = async (file: File) => {
    try {
      setIsUserSending(true);

      const fileUrl = URL.createObjectURL(file);

      console.log(fileUrl);
    } catch (error) {
      message.error(`Có lỗi xảy ra khi gửi file: ${String(error)}`);
    }
  };

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNewMessage = useCallback((message: any) => {
    setMessages(prevMessages => {
      const tempMessages = [...prevMessages];
      const index = tempMessages.findIndex(
        msg => msg.status === 'sending' && msg.dataType === message.cmChat.dataType,
      );

      if (index !== -1) {
        tempMessages[index] = {
          ...tempMessages[index],
          ...message.cmChat,
          status: 'sent',
        };
      } else {
        tempMessages.push({...message.cmChat});
        setIsNewMessageAdded(true);
      }

      return tempMessages;
    });
  }, []);

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
      !messages[messages.length - 1].socialName
    ) {
      setNewMessageCount((prev) => prev + 1);
    }
  }, [messages, isUserScrolling, isUserSending, isNewMessageAdded]);

  useEffect(() => {
    stompServiceRef.current = new StompService(savedUserInfo.CM_ChatGroup_ID);
    stompServiceRef.current.setOnMessageCallback(handleNewMessage);
    stompServiceRef.current.connect();

    return () => {
      stompServiceRef.current?.disconnect();
    };
  }, [handleNewMessage, savedUserInfo.CM_ChatGroup_ID]);

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
          message.dataType === "Text" ? (
            <ChatMessage
              key={message.cmChatId}
              content={message.contentText}
              isUser={message.socialName !== null}
              timestamp={moment(message.created).format('HH:mm')}
              status={message.status}
            />
          ) : message.file ? (
            <FileMessage
              key={message.cmChatId}
              fileName={JSON.parse(message.file)[0].fileName}
              fileType={JSON.parse(message.file)[0].fileName}
              fileSize={JSON.parse(message.file)[0].fileName}
              fileUrl={JSON.parse(message.file)[0].fileName}
              isUser={message.socialName !== null}
              timestamp={moment(message.created).format('HH:mm')}
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

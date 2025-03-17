import React, {useCallback, useEffect, useRef, useState} from "react";
import {ChatInput} from "./ChatInput";
import {ChatMessage} from "./ChatMessage";
import {FileMessage} from "./FileMessage";
import {Badge, message, Spin} from "antd";
import {DownOutlined} from "@ant-design/icons";
import {Message} from "@/types/chat";
import StompService from "@/api/stomp-services";
import chatAPI from "@/api/chat-services";
import moment from "moment";

export function ChatContent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [isUserSending, setIsUserSending] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isNewMessageAdded, setIsNewMessageAdded] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const stompServiceRef = useRef<StompService | null>(null);
  const fetchingRef = useRef(false);
  const messageTimeoutsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());


  const savedUserInfo = JSON.parse(localStorage.getItem("userInfo")!);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      container.scrollTop = container.scrollHeight;
      setNewMessageCount(0);
    }
  };

  const fetchChatHistory = async (pageNumber: number) => {
    if (isLoading || !hasMore || fetchingRef.current) return;

    try {
      setIsLoading(true);
      fetchingRef.current = true;

      const response = await chatAPI.HandleGetHistoryMessage(
        savedUserInfo.CM_ChatGroup_ID,
        pageNumber
      );

      if (response && response.length > 0) {
        const container = messagesContainerRef.current;
        const oldScrollHeight = container?.scrollHeight || 0;

        setMessages(prevMessages => [...response.reverse().map((msg: { status: string }) => ({
          ...msg,
          status: 'sent'
        })), ...prevMessages]);
        response.reverse();

        setTimeout(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - oldScrollHeight;
          }
          setIsLoading(false);
          fetchingRef.current = false;
        }, 100);

        setPage(pageNumber + 1);
      } else {
        setHasMore(false);
        setIsLoading(false);
        fetchingRef.current = false;
      }
    } catch (error) {
      console.error("Error fetching chat history:", error);
      message.error("Không thể tải tin nhắn cũ");
      setIsLoading(false);
      fetchingRef.current = false;
    }
  };

  const handleScroll = () => {
    if (!initialLoadDone) return;

    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const {scrollTop, scrollHeight, clientHeight} = container;
      const isNearBottom = scrollTop >= scrollHeight - clientHeight - 100;
      const isNearTop = scrollTop < 100;

      setShowScrollButton(!isNearBottom);
      setIsUserScrolling(!isNearBottom);

      if (isNearBottom) {
        setNewMessageCount(0);
      }

      if (isNearTop && !isLoading && hasMore && initialLoadDone) {
        fetchChatHistory(page);
      }
    }
  };

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return;

    setIsUserSending(true);

    const messageId = Date.now();

    const newMessage: Message = {
      cmChatId: messageId,
      adClientId: savedUserInfo.AD_Client_ID,
      adOrgId: savedUserInfo.AD_Org_ID,
      adUserId: savedUserInfo.AD_User.id,
      cmChatGroupId: savedUserInfo.CM_ChatGroup_ID,
      socialName: savedUserInfo.SocialName,
      contentText: content,
      dataType: 'Text',
    };

    setMessages((prev) => [...prev, {...newMessage, status: 'sending'}]);

    const timeoutId = setTimeout(() => {
      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.cmChatId === messageId && msg.status === 'sending'
            ? {...msg, status: 'error'}
            : msg
        )
      );
      message.error('Không thể gửi tin nhắn');
    }, 10000);

    messageTimeoutsRef.current.set(messageId, timeoutId);

    try {
      stompServiceRef.current?.sendMessage(newMessage);
    } catch (error) {
      clearTimeout(timeoutId);
      messageTimeoutsRef.current.delete(messageId);

      setMessages(prevMessages =>
        prevMessages.map(msg =>
          msg.cmChatId === messageId ? {...msg, status: 'error'} : msg
        )
      );
      console.error("Error sending message:", error);
      message.error("Không thể gửi tin nhắn");
    }
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
        msg => msg.cmChatId === message.cmChat.cmChatId ||
          (msg.status && (msg.status === 'sending' || msg.status === 'error') &&
            msg.dataType === message.cmChat.dataType)
      );

      if (index !== -1) {
        const cmChatId = tempMessages[index].cmChatId;
        if (cmChatId !== undefined) {
          const timeoutId = messageTimeoutsRef.current.get(cmChatId);
          if (timeoutId) {
            clearTimeout(timeoutId);
            messageTimeoutsRef.current.delete(cmChatId);
          }
        }

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

  const processMessagesForDisplay = (messageList: Message[]) => {
    const result: Array<Message & { showHeader: boolean; showStatus: boolean }> = [];

    let lastTimestamp = '';
    let lastIsUser = false;
    let lastSentUserMessageIndex = -1;

    messageList.forEach((message, index) => {
      const isUser = message.socialName !== null;
      const timestamp = moment(message.created).format('HH:mm');
      const showHeader = timestamp !== lastTimestamp || isUser !== lastIsUser;

      let showStatus = false;
      if (isUser && message.status) {
        if (message.status === 'sending' || message.status === 'error') {
          showStatus = true;
        } else if (message.status === 'sent') {
          lastSentUserMessageIndex = index;
        }
      }

      result.push({
        ...message,
        showHeader,
        showStatus,
      });

      lastTimestamp = timestamp;
      lastIsUser = isUser;
    });

    if (lastSentUserMessageIndex >= 0) {
      result[lastSentUserMessageIndex].showStatus = true;
    }

    return result;
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
      !messages[messages.length - 1].socialName
    ) {
      setNewMessageCount((prev) => prev + 1);
    }
  }, [messages, isUserScrolling, isUserSending, isNewMessageAdded]);

  useEffect(() => {
    stompServiceRef.current = new StompService(savedUserInfo.CM_ChatGroup_ID);
    stompServiceRef.current.setOnMessageCallback(handleNewMessage);
    stompServiceRef.current.connect();

    fetchChatHistory(0).then(() => {
      setInitialLoadDone(true);
    });

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
        {isLoading && (
          <div style={{textAlign: 'center', padding: '10px'}}>
            <Spin size="small"/>
          </div>
        )}

        {processMessagesForDisplay(messages).map((message) =>
          message.dataType === "Text" ? (
            <ChatMessage
              key={message.cmChatId}
              content={message.contentText}
              isUser={message.socialName !== null}
              timestamp={moment(message.created).format('HH:mm')}
              status={message.status}
              showHeader={message.showHeader}
              showStatus={message.showStatus}
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

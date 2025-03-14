import {Input, Typography, message as messageAntd} from "antd";
import {FiPaperclip, FiSend, FiX} from "react-icons/fi";
import {ChatLogo} from "./ChatLogo";
import {useState, useRef} from "react";
import {EmojiPicker} from "./EmojiPicker";
import {
  BsPlayCircle,
  BsFileEarmarkText,
  BsFileEarmarkPdf,
  BsFileEarmarkWord,
  BsFileEarmarkExcel,
  BsFileEarmarkMusic,
} from "react-icons/bs";
import {formatFileSize} from "@/util/format";

interface ChatInputProps {
  onFocus?: () => void;
  onSendMessage?: (content: string) => void;
  onSendFile?: (file: File) => void;
}

interface FilePreview {
  file: File;
  previewUrl: string;
}

const isImageFile = (file: File) => file.type.startsWith("image/");
const isVideoFile = (file: File) => file.type.startsWith("video/");

const getFileIcon = (file: File) => {
  const type = file.type.toLowerCase();
  if (type === "application/pdf")
    return <BsFileEarmarkPdf size={24} color="white"/>;
  if (
    type === "application/msword" ||
    type ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return <BsFileEarmarkWord size={24} color="white"/>;
  if (
    type === "application/vnd.ms-excel" ||
    type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  )
    return <BsFileEarmarkExcel size={24} color="white"/>;
  if (type.startsWith("audio/"))
    return <BsFileEarmarkMusic size={24} color="white"/>;
  return <BsFileEarmarkText size={24} color="white"/>;
};

export function ChatInput({
                            onFocus,
                            onSendMessage,
                            onSendFile,
                          }: ChatInputProps) {
  const {Text} = Typography;
  const [message, setMessage] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FilePreview[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (message.trim() && onSendMessage) {
      onSendMessage(message.trim());
      setMessage("");
    }

    selectedFiles.forEach((filePreview) => {
      onSendFile?.(filePreview.file);
    });
    setSelectedFiles([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const validFiles = files.filter((file) => {
        if (file.size > 10 * 1024 * 1024) {
          messageAntd.error(`File ${file.name} không được vượt quá 10MB`);
          return false;
        }
        return true;
      });

      const newFiles = validFiles.map((file) => ({
        file,
        previewUrl: URL.createObjectURL(file),
      }));

      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].previewUrl);
      newFiles.splice(index, 1);
      return newFiles;
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage((prev) => prev + emoji);
  };

  return (
    <div
      style={{
        padding: "8px 16px",
        background: "#f5f6fa",
        borderTop: "1px solid #f0f0f0",
      }}
    >
      <div
        style={{
          paddingTop: "8px",
          paddingBottom: "16px",
          flexDirection: "row",
          gap: "8px",
          display: "flex",
        }}
      >
        <ChatLogo width="16px" height="16px"/>
        <Text style={{fontSize: "12px", color: "#1e3150", opacity: 0.6}}>
          Tích hợp miễn phí{" "}
          <Text style={{color: "#00b1ff", fontSize: "12px"}}>
            DSS LiveTalk
          </Text>{" "}
          vào website của bạn
        </Text>
      </div>

      {selectedFiles.length > 0 && (
        <div
          style={{
            marginBottom: "8px",
            display: "flex",
            flexWrap: "nowrap",
            gap: "8px",
            overflowX: "auto",
            overflowY: "hidden",
            width: "350px",
          }}
        >
          {selectedFiles.map((filePreview, index) => (
            <div
              key={index}
              style={{
                position: "relative",
                ...(isImageFile(filePreview.file) ||
                isVideoFile(filePreview.file)
                  ? {
                    width: "68px",
                    height: "68px",
                  }
                  : {
                    minWidth: "200px",
                    maxWidth: "300px",
                    height: '45px',
                  }),
                borderRadius: "8px",
                overflow: "hidden",
                border: "1px solid #d9d9d9",
                background: "#fff",
                alignSelf: 'flex-end'
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {isImageFile(filePreview.file) ||
              isVideoFile(filePreview.file) ? (
                <>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    {isImageFile(filePreview.file) ? (
                      <img
                        src={filePreview.previewUrl}
                        alt={filePreview.file.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <>
                        <video
                          src={filePreview.previewUrl}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "rgba(0, 0, 0, 0.5)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <BsPlayCircle
                            style={{color: "#fff", fontSize: "24px"}}
                          />
                        </div>
                      </>
                    )}
                  </div>
                  {hoveredIndex === index && (
                    <div
                      onClick={() => handleRemoveFile(index)}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#ff4d4f",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 1,
                      }}
                    >
                      <FiX style={{color: "#fff", fontSize: "12px"}}/>
                    </div>
                  )}
                </>
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "4px",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      width: "40px",
                      height: "100%",
                      backgroundColor: "#1e315099",
                      alignItems: "center",
                      justifyContent: "center",
                      display: "flex",
                    }}
                  >
                    {getFileIcon(filePreview.file)}
                  </div>
                  <div style={{flex: 1, minWidth: 0, padding: "5px 10px"}}>
                    <Text style={{
                      fontWeight: 500,
                      fontSize: "15px",
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      display: "block",
                      marginRight: "10px",
                    }}>
                      {filePreview.file.name}
                    </Text>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                      }}
                    >
                      {formatFileSize(filePreview.file.size)}
                    </div>
                  </div>
                  {hoveredIndex === index && (
                    <div
                      onClick={() => handleRemoveFile(index)}
                      style={{
                        position: "absolute",
                        top: "4px",
                        right: "4px",
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        background: "#ff4d4f",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        zIndex: 1,
                      }}
                    >
                      <FiX style={{color: "#fff", fontSize: "12px"}}/>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        onFocus={onFocus}
        placeholder="Nhập tin nhắn"
        style={{
          background: "transparent",
          fontSize: "15px",
          flex: 1,
          padding: "8px 0",
          border: "none",
          boxShadow: "none",
        }}
        suffix={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
            }}
          >
            <EmojiPicker onSelectEmoji={!onFocus ? handleEmojiSelect : undefined}/>
            <FiPaperclip
              onClick={!onFocus ? handleAttachClick : undefined}
              style={{
                fontSize: "20px",
                color: "#404040",
                cursor: "pointer",
              }}
            />
            <FiSend
              onClick={handleSend}
              style={{
                fontSize: "20px",
                color:
                  message.trim() || selectedFiles.length > 0
                    ? "#404040"
                    : "#d9d9d9",
                cursor:
                  message.trim() || selectedFiles.length > 0
                    ? "pointer"
                    : "not-allowed",
              }}
            />
          </div>
        }
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{display: "none"}}
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        multiple
      />
    </div>
  );
}

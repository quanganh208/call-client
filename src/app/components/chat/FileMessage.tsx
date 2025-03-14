import React, {useState, useEffect} from "react";
import {Avatar, Row, Typography} from "antd";
import {
  BsFileEarmarkText,
  BsFileEarmarkPdf,
  BsFileEarmarkWord,
  BsFileEarmarkExcel,
} from "react-icons/bs";
import {UserOutlined} from "@ant-design/icons";

const {Text} = Typography;

interface FileMessageProps {
  fileName: string;
  fileType: string;
  fileSize: string;
  fileUrl: string;
  isUser: boolean;
  timestamp: string;
}

const isImageFile = (fileType: string) => fileType.startsWith("image/");
const isVideoFile = (fileType: string) => fileType.startsWith("video/");
const isAudioFile = (fileType: string) => fileType.startsWith("audio/");

const MAX_WIDTH = 300;
const MAX_HEIGHT = 300;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

const getFileIcon = (fileType: string) => {
  const type = fileType.toLowerCase();
  if (type === "application/pdf") return <BsFileEarmarkPdf size={24} color="white"/>;
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
  return <BsFileEarmarkText size={24} color="white"/>;
};

export function FileMessage({
                              fileName,
                              fileType,
                              fileSize,
                              fileUrl,
                              isUser,
                              timestamp,
                            }: FileMessageProps) {
  const [dimensions, setDimensions] = useState({
    width: MIN_WIDTH,
    height: MIN_HEIGHT,
  });

  useEffect(() => {
    if (isImageFile(fileType)) {
      const img = new Image();
      img.onload = () => {
        calculateAndSetDimensions(img.width, img.height);
      };
      img.src = fileUrl;
    } else if (isVideoFile(fileType)) {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        calculateAndSetDimensions(video.videoWidth, video.videoHeight);
      };
      video.src = fileUrl;
    }
  }, [fileUrl, fileType]);

  const calculateAndSetDimensions = (width: number, height: number) => {
    const aspectRatio = width / height;
    let newWidth = width;
    let newHeight = height;

    const containerMaxWidth = window.innerWidth * 0.7 * 0.9;
    const maxWidth = Math.min(containerMaxWidth, MAX_WIDTH);

    if (width > maxWidth) {
      newWidth = maxWidth;
      newHeight = maxWidth / aspectRatio;
    }

    if (newHeight > MAX_HEIGHT) {
      newHeight = MAX_HEIGHT;
      newWidth = MAX_HEIGHT * aspectRatio;
    }

    if (newWidth < MIN_WIDTH) {
      newWidth = MIN_WIDTH;
      newHeight = MIN_WIDTH / aspectRatio;
    }
    if (newHeight < MIN_HEIGHT) {
      newHeight = MIN_HEIGHT;
      newWidth = MIN_HEIGHT * aspectRatio;
    }

    setDimensions({width: newWidth, height: newHeight});
  };

  const handleDownload = () => {
    window.open(fileUrl, "_blank");
  };

  const renderFileContent = () => {
    if (isImageFile(fileType)) {
      return (
        <div
          style={{
            width: dimensions.width,
            height: dimensions.height,
            borderRadius: "8px",
            overflow: "hidden",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={handleDownload}
        >
          <img
            src={fileUrl}
            alt={fileName}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      );
    }

    if (isVideoFile(fileType)) {
      return (
        <div
          style={{
            width: dimensions.width,
            height: dimensions.height,
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "8px",
            overflow: "hidden",
          }}
        >
          <video
            src={fileUrl}
            controls
            controlsList="nodownload"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
            playsInline
          />
        </div>
      );
    }

    if (isAudioFile(fileType)) {
      return (
        <div
          style={{
            backgroundColor: "#f5f5f5",
            borderRadius: "8px",
            width: "250px",
            border: "1px solid #d9d9d9",
          }}
        >
          <audio
            controls
            style={{
              width: "100%",
            }}
          >
            <source src={fileUrl} type={fileType}/>
            Trình duyệt của bạn không hỗ trợ phát âm thanh.
          </audio>
        </div>
      );
    }

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          position: "relative",
          border: "1px solid #d9d9d9",
          borderRadius: "8px",
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
            borderTopLeftRadius: "8px",
            borderBottomLeftRadius: "8px",
          }}
        >
          {getFileIcon(fileType)}
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
            {fileName}
          </Text>
          <div
            style={{
              fontSize: "12px",
              color: "#666",
            }}
          >
            {fileSize}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Row
      justify={isUser ? "end" : "start"}
      style={{
        padding: '0 8px',
        width: "100%"
      }}
    >
      {!isUser ? (
        <Avatar
          size={32}
          icon={<UserOutlined/>}
          style={{marginRight: "8px", flexShrink: 0}}
        />
      ) : (
        <div style={{width: "8px"}}/>
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
            marginBottom: "4px",
            marginRight: "8px",
            color: "#999"
          }}
        >
          {timestamp}
        </Text>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            borderRadius: "8px",
            maxWidth: MAX_WIDTH
          }}
          onClick={isVideoFile(fileType) ? undefined : handleDownload}
        >
          {renderFileContent()}
        </div>
      </div>
    </Row>
  );
}

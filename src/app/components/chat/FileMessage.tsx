import React, {useState, useEffect} from "react";
import {Avatar, Row, Typography} from "antd";
import {
  BsFileEarmarkText,
  BsFileEarmarkPdf,
  BsFileEarmarkWord,
  BsFileEarmarkExcel,
  BsFileEarmarkPpt,
} from "react-icons/bs";
import {CheckOutlined, ExclamationCircleOutlined, LoadingOutlined, UserOutlined} from "@ant-design/icons";

const {Text} = Typography;

interface FileMessageProps {
  fileName: string;
  fileType: string; // Now one of: 'Image', 'Audio', 'Video', 'File PDF', 'File Word', 'File Excel', 'File PowerPoint', 'File Text'
  fileSize: string;
  fileUrl: string;
  isUser: boolean;
  timestamp: string;
  status?: 'sending' | 'sent' | 'error';
  showHeader?: boolean;
  showStatus?: boolean;
}

const MAX_WIDTH = 250;
const MAX_HEIGHT = 300;
const MIN_WIDTH = 100;
const MIN_HEIGHT = 100;

const getFileIcon = (fileType: string) => {
  switch (fileType) {
    case 'File PDF':
      return <BsFileEarmarkPdf size={24} color="white"/>;
    case 'File Word':
      return <BsFileEarmarkWord size={24} color="white"/>;
    case 'File Excel':
      return <BsFileEarmarkExcel size={24} color="white"/>;
    case 'File PowerPoint':
      return <BsFileEarmarkPpt size={24} color="white"/>;
    case 'File Text':
    default:
      return <BsFileEarmarkText size={24} color="white"/>;
  }
};


export function FileMessage({
                              fileName,
                              fileType,
                              fileSize,
                              fileUrl,
                              isUser,
                              timestamp,
                              status,
                              showHeader = true,
                              showStatus = true
                            }: FileMessageProps) {
  const [dimensions, setDimensions] = useState({
    width: MIN_WIDTH,
    height: MIN_HEIGHT,
  });


  useEffect(() => {
    if (fileType === 'Image') {
      const img = new Image();
      img.onload = () => {
        calculateAndSetDimensions(img.width, img.height);
      };
      img.src = fileUrl;
    } else if (fileType === 'Video') {
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
    switch (fileType) {
      case 'Image':
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

      case 'Video':
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
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              playsInline
            />
          </div>
        );

      case 'Audio':
        return (
          <div
            style={{
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
              width: "250px",
              height: "50px",
              border: "1px solid #d9d9d9",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <audio
              controls
              style={{
                width: "100%",
                height: "100%",
              }}
            >
              <source src={fileUrl}/>
              Trình duyệt của bạn không hỗ trợ phát âm thanh.
            </audio>
          </div>
        );

      default:
        return (
          <div
            style={{
              width: "100%",
              minHeight: "45px",
              display: "flex",
              alignItems: "stretch",
              position: "relative",
              border: "1px solid #d9d9d9",
              borderRadius: "8px",
            }}
          >
            <div
              style={{
                width: "40px",
                backgroundColor: "#1e315099",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
    }
  };

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
              {timestamp}
            </Text>
          )}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              borderRadius: "8px",
              maxWidth: MAX_WIDTH
            }}
            onClick={fileType === 'Video' ? undefined : handleDownload}
          >
            {renderFileContent()}
          </div>
        </div>
      </div>
    </Row>
  );
}

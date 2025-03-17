import { Button, Typography } from "antd";
import { IoIosCall, IoIosVideocam, IoMdMic, IoMdMicOff } from "react-icons/io";
import { MdCallEnd, MdVideocam, MdVideocamOff } from "react-icons/md";
import { ChatLogo } from "./ChatLogo";
import {UserInformation} from "@/types/chat";


interface HeaderProps {
  userInfo: UserInformation | null;
  callStatus: "idle" | "calling" | "connected";
  callType: "audio" | "video";
  callDuration: number;
  muted: boolean;
  videoEnabled: boolean;
  onVideoToggle: () => void;
  onMuteToggle: () => void;
  onEndCall: () => void;
  onInitiateCall: (type: "audio" | "video") => void;
}

export function Header({
  userInfo,
  callStatus,
  callType,
  callDuration,
  muted,
  videoEnabled,
  onVideoToggle,
  onMuteToggle,
  onEndCall,
  onInitiateCall,
}: HeaderProps) {
  const { Text, Title } = Typography;

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        padding: userInfo ? "16px" : "24px",
        background: "#1E3150",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {!userInfo ? (
        <div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <ChatLogo />
            <Title level={5} style={{ color: "white", marginLeft: "16px" }}>
              DSS LiveTalk
            </Title>
          </div>
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{ height: "36px", display: "flex", alignItems: "center" }}
          >
            {callStatus === "idle" ? (
              <Text style={{ color: "white", fontSize: "15px" }}>
                DSS LiveTalk
              </Text>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Text style={{ color: "white", fontSize: "15px" }}>
                  {callStatus === "calling"
                    ? `Gọi ${callType}`
                    : formatTime(callDuration)}
                </Text>
                <Text
                  style={{
                    color: "white",
                    fontSize: "15px",
                    opacity: 0.5,
                  }}
                >
                  {callStatus === "calling"
                    ? "Đang đổ chuông..."
                    : "Đã kết nối"}
                </Text>
              </div>
            )}
          </div>
          {callStatus === "idle" ? (
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                icon={<IoIosCall />}
                style={{
                  backgroundColor: "#00b1ff",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "12px",
                  height: "36px",
                  width: "36px",
                  border: "none",
                  color: "white",
                  fontSize: "20px",
                }}
                onClick={() => onInitiateCall("audio")}
              />
              <Button
                icon={<IoIosVideocam />}
                style={{
                  backgroundColor: "#56cc6e",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "12px",
                  height: "36px",
                  width: "36px",
                  border: "none",
                  color: "white",
                  fontSize: "20px",
                }}
                onClick={() => onInitiateCall("video")}
              />
            </div>
          ) : (
            <div>
              {callStatus === "connected" && callType === "video" && (
                <Button
                  onClick={onVideoToggle}
                  icon={
                    videoEnabled ? (
                      <MdVideocam />
                    ) : (
                      <MdVideocamOff color="#1E3150" />
                    )
                  }
                  style={{
                    backgroundColor: videoEnabled ? "#ffffff1a" : "white",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    width: "36px",
                    height: "36px",
                    fontSize: "20px",
                    marginRight: "8px",
                  }}
                />
              )}
              {callStatus === "connected" && (
                <Button
                  onClick={onMuteToggle}
                  icon={muted ? <IoMdMicOff color="#1E3150" /> : <IoMdMic />}
                  style={{
                    backgroundColor: muted ? "white" : "#ffffff1a",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    width: "36px",
                    height: "36px",
                    fontSize: "20px",
                    marginRight: "8px",
                  }}
                />
              )}
              <Button
                icon={<MdCallEnd />}
                style={{
                  backgroundColor: "#ff5955",
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: "12px",
                  height: "36px",
                  width: "36px",
                  border: "none",
                  color: "white",
                  fontSize: "20px",
                }}
                onClick={onEndCall}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

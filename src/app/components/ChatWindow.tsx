import {Button, Card, Dropdown, MenuProps, message, Typography} from "antd";
import {IoIosCall, IoIosVideocam, IoMdSettings} from "react-icons/io";
import UserInformationForm from "@/app/components/UserInformationForm";
import React, {useEffect, useState, useRef} from "react";
import io from "socket.io-client";
import {
  IoCloseCircle,
  IoLogOutOutline,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
} from "react-icons/io5";
import "@ant-design/v5-patch-for-react-19";
import {Header} from "./chat/Header";
import {VideoCall} from "./chat/VideoCall";
import {ChatContent} from "./chat/ChatContent";
import {UserInformation} from "@/types/chat";
import {MdOutlineSettingsInputComposite} from "react-icons/md";
import DeviceSettingsModal from "./chat/DeviceSettingsModal";
import {ChatInput} from "@/app/components/chat/ChatInput";

interface ChatWindowProps {
  onCloseChatWindow: () => void;
}

export default function ChatWindow({onCloseChatWindow}: ChatWindowProps) {
  const {Text} = Typography;
  const [userInfo, setUserInfo] = useState<UserInformation | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "connected"
  >("idle");
  const [callType, setCallType] = useState<"audio" | "video">("audio");
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [muteNotification, setMuteNotification] = useState(false);
  const [deviceSettingsModalVisible, setDeviceSettingsModalVisible] =
    useState(false);
  const [deviceSettings, setDeviceSettings] = useState({
    audioInput: "",
    videoInput: "",
    audioOutput: "",
  });

  const timerInterval = useRef<NodeJS.Timeout | null>(null);
  const ringtoneInterval = useRef<NodeJS.Timeout | null>(null);
  const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const adminIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userInfo) return;

    const SIGNALING_SERVER =
      process.env.NEXT_PUBLIC_SIGNALING_SERVER || "http://localhost:8080";
    socketRef.current = io(SIGNALING_SERVER);

    socketRef.current.emit("register-client", userInfo);

    socketRef.current.on("call-accepted", handleCallAccepted);
    socketRef.current.on("offer", handleOffer);
    socketRef.current.on("answer", handleAnswer);
    socketRef.current.on("ice-candidate", handleIceCandidate);
    socketRef.current.on("call-ended", handleCallEnded);
    socketRef.current.on("call-timeout", handleCallTimeout);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      cleanupWebRTC();
    };
  }, [userInfo]);

  useEffect(() => {
    if (callStatus === "calling") {
      if (!ringtoneAudioRef.current) {
        ringtoneAudioRef.current = new Audio("/ringtone.mp3");
        ringtoneAudioRef.current.volume = 0.5;
      }

      const playRingtone = () => {
        if (ringtoneAudioRef.current) {
          ringtoneAudioRef.current.currentTime = 0;
          ringtoneAudioRef.current
            .play()
            .catch((err) => console.error("Error playing ringtone:", err));
        }
      };

      playRingtone();

      ringtoneInterval.current = setInterval(playRingtone, 4000);
    } else {
      if (ringtoneAudioRef.current) {
        ringtoneAudioRef.current.pause();
        ringtoneAudioRef.current.currentTime = 0;
      }

      if (ringtoneInterval.current) {
        clearInterval(ringtoneInterval.current);
        ringtoneInterval.current = null;
      }
    }

    return () => {
      if (ringtoneInterval.current) {
        clearInterval(ringtoneInterval.current);
        ringtoneInterval.current = null;
      }

      if (ringtoneAudioRef.current) {
        ringtoneAudioRef.current.pause();
        ringtoneAudioRef.current.currentTime = 0;
      }
    };
  }, [callStatus]);

  const handleCallTimeout = async () => {
    await message.warning(
      "Không có nhân viên nào trả lời cuộc gọi, vui lòng thử lại sau"
    );
    cleanupWebRTC();
    setCallStatus("idle");
    setMuted(false);
    setVideoEnabled(true);
  };

  const initiateCall = async (type: "audio" | "video") => {
    try {
      if (!userInfo || !socketRef.current) {
        setShowForm(true);
        return;
      }

      setCallStatus("calling");
      setCallType(type);

      const mediaConstraints: MediaStreamConstraints = {
        audio: deviceSettings.audioInput
          ? {deviceId: {exact: deviceSettings.audioInput}}
          : true,
        video:
          type === "video"
            ? deviceSettings.videoInput
              ? {deviceId: {exact: deviceSettings.videoInput}}
              : true
            : false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(
        mediaConstraints
      );
      localStreamRef.current = stream;

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
      }

      if (type === "video" && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }

      socketRef.current.emit("call-request", {callType: type});
    } catch (error) {
      console.error(`Không thể bắt đầu cuộc gọi ${type}:`, error);
      setCallStatus("idle");
      setMuted(false);
      setVideoEnabled(true);
    }
  };

  const handleCallAccepted = async (data: {
    adminId: string;
    callType: "audio" | "video";
  }) => {
    try {
      adminIdRef.current = data.adminId;
      setCallType(data.callType);

      createPeerConnection();

      if (localStreamRef.current && peerConnectionRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          if (peerConnectionRef.current && localStreamRef.current) {
            peerConnectionRef.current.addTrack(track, localStreamRef.current);
          }
        });
      }

      if (peerConnectionRef.current) {
        const offer = await peerConnectionRef.current.createOffer();
        await peerConnectionRef.current.setLocalDescription(offer);

        socketRef.current.emit("offer", {
          target: data.adminId,
          offer: offer,
          callType: data.callType,
        });
      }
    } catch (error) {
      console.error("Lỗi khi thiết lập kết nối:", error);
      await endCall();
    }
  };

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        {urls: "stun:stun.l.google.com:19302"},
        {urls: "stun:stun1.l.google.com:19302"},
      ],
    };

    peerConnectionRef.current = new RTCPeerConnection(configuration);

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate && adminIdRef.current && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          target: adminIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];

      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }

      const hasVideoTracks = event.streams[0].getVideoTracks().length > 0;
      if (hasVideoTracks && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallType("video");
      }

      setCallStatus("connected");
    };

    peerConnectionRef.current.onconnectionstatechange = () => {
      if (peerConnectionRef.current) {
        if (peerConnectionRef.current.connectionState === "connected") {
          setCallStatus("connected");
        } else if (
          peerConnectionRef.current.connectionState === "disconnected" ||
          peerConnectionRef.current.connectionState === "failed"
        ) {
          endCall();
        }
      }
    };
  };

  const handleOffer = async (data: {
    offer: RTCSessionDescriptionInit;
    source: string;
    callType: "audio" | "video";
  }) => {
    try {
      adminIdRef.current = data.source;
      setCallType(data.callType);

      if (!localStreamRef.current) {
        const mediaConstraints = {
          audio: true,
          video: data.callType === "video",
        };

        const stream = await navigator.mediaDevices.getUserMedia(
          mediaConstraints
        );
        localStreamRef.current = stream;

        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream;
          localAudioRef.current.muted = true;
        }

        if (data.callType === "video" && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.muted = true;
        }
      }

      if (!peerConnectionRef.current) {
        createPeerConnection();
      }

      if (localStreamRef.current && peerConnectionRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          if (peerConnectionRef.current && localStreamRef.current) {
            peerConnectionRef.current.addTrack(track, localStreamRef.current);
          }
        });
      }

      await peerConnectionRef.current?.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      const answer = await peerConnectionRef.current?.createAnswer();
      await peerConnectionRef.current?.setLocalDescription(answer);

      socketRef.current.emit("answer", {
        target: data.source,
        answer: answer,
        callType: data.callType,
      });
    } catch (error) {
      console.error("Lỗi khi xử lý offer:", error);
    }
  };

  const handleAnswer = async (data: {
    answer: RTCSessionDescriptionInit;
    callType: "audio" | "video";
  }) => {
    try {
      setCallType(data.callType);
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    } catch (error) {
      console.error("Lỗi khi xử lý answer:", error);
    }
  };

  const handleIceCandidate = (data: { candidate: RTCIceCandidateInit }) => {
    try {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        );
      }
    } catch (error) {
      console.error("Lỗi khi xử lý ICE candidate:", error);
    }
  };

  const endCall = async () => {
    if (callStatus === "calling" && socketRef.current) {
      socketRef.current.emit("cancel-call-request", {
        callType: callType,
      });
    }

    if (adminIdRef.current && socketRef.current) {
      socketRef.current.emit("end-call", {
        targetId: adminIdRef.current,
      });
    }

    cleanupWebRTC();
    setCallStatus("idle");
    setMuted(false);
    setVideoEnabled(true);
  };

  const handleCallEnded = async () => {
    cleanupWebRTC();
    setCallStatus("idle");
    setMuted(false);
    setVideoEnabled(true);
  };

  const cleanupWebRTC = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    adminIdRef.current = null;

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
  };

  const handleSubmitUserInfo = (info: UserInformation) => {
    setUserInfo(info);
    setShowForm(false);

    localStorage.setItem("userInfo", JSON.stringify(info));
  };

  const handleCloseForm = () => {
    setShowForm(false);
  };

  const handleSaveDeviceSettings = async (settings: {
    audioInput: string;
    videoInput: string;
    audioOutput: string;
  }) => {
    setDeviceSettings(settings);
    localStorage.setItem("deviceSettings", JSON.stringify(settings));
    await message.success("Đã lưu cấu hình thiết bị cuộc gọi");
  };

  useEffect(() => {
    if (callStatus === "connected") {
      timerInterval.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }
      setCallDuration(0);
    }

    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, [callStatus]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = videoEnabled;
      });
    }
  }, [videoEnabled]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, [muted]);

  useEffect(() => {
    const savedUserInfo = localStorage.getItem("userInfo");

    if (savedUserInfo) {
      const parsedUserInfo = JSON.parse(savedUserInfo);
      setUserInfo(parsedUserInfo);
      setShowForm(false);
    }
    const savedSettings = localStorage.getItem("deviceSettings");

    if (savedSettings) {
      setDeviceSettings(JSON.parse(savedSettings));
    }
  }, []);

  const items: MenuProps["items"] = [
    {
      key: "1",
      label: (
        <div
          style={{
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          {muteNotification ? (
            <IoVolumeHighOutline size={20} style={{marginRight: "8px"}}/>
          ) : (
            <IoVolumeMuteOutline size={20} style={{marginRight: "8px"}}/>
          )}
          <span style={{fontSize: "15px"}}>
            {muteNotification ? "Bật" : "Tắt"} âm thông báo
          </span>
        </div>
      ),
      onClick: async () => {
        setMuteNotification(!muteNotification);
        await message[muteNotification ? 'success' : 'warning'](
          `Đã ${muteNotification ? "bật" : "tắt"} phát âm thanh thông báo khi có tin nhắn mới`
        );
      },
    },
    {
      key: "2",
      label: (
        <div
          style={{
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <MdOutlineSettingsInputComposite
            size={20}
            style={{marginRight: "8px"}}
          />
          <span style={{fontSize: "15px"}}>Cấu hình thiết bị cuộc gọi</span>
        </div>
      ),
      onClick: () => setDeviceSettingsModalVisible(true),
    },
    {
      key: "3",
      label: (
        <div
          style={{
            padding: "0 8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
          }}
        >
          <IoLogOutOutline size={20} style={{marginRight: "8px"}}/>
          <span style={{fontSize: "15px"}}>Kết thúc phiên</span>
        </div>
      ),
      onClick: async () => {
        localStorage.removeItem("userInfo");
        localStorage.removeItem("deviceSettings");

        setUserInfo(null);

        setCallStatus("idle");
        cleanupWebRTC();

        await message.success("Đã kết thúc phiên trò chuyện");
      },
    },
  ];

  const chatWindowWidth =
    callType === "video" && callStatus !== "idle" ? "820px" : "435px";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        position: "fixed",
        bottom: "24px",
        right: "16px",
        width: chatWindowWidth,
        gap: "16px",
      }}
    >
      <audio
        src="/ringtone.mp3"
        ref={ringtoneAudioRef}
        style={{display: "none"}}
      />

      <DeviceSettingsModal
        isOpen={deviceSettingsModalVisible}
        onClose={() => setDeviceSettingsModalVisible(false)}
        onSaveSettings={handleSaveDeviceSettings}
        initialSettings={deviceSettings}
      />
      <div
        style={{
          flexDirection: "column",
          display: "flex",
          gap: "16px",
        }}
      >
        <Button
          type="text"
          icon={<IoCloseCircle size={20} color="#1E3150"/>}
          style={{
            backgroundColor: "#1e31501a",
            borderRadius: "12px",
            padding: "16px",
          }}
          onClick={onCloseChatWindow}
        />
        {userInfo && (
          <Dropdown
            menu={{items}}
            trigger={["click"]}
            placement="bottomRight"
          >
            <Button
              type="text"
              icon={<IoMdSettings size={20} color="#1E3150"/>}
              style={{
                backgroundColor: "#1e31501a",
                borderRadius: "12px",
                padding: "16px",
              }}
            />
          </Dropdown>
        )}
      </div>
      <div style={{position: "relative", width: "100%"}}>
        {showForm && (
          <UserInformationForm
            onClose={handleCloseForm}
            onSubmit={handleSubmitUserInfo}
          />
        )}
        <Card
          styles={{
            body: {padding: 0},
          }}
          style={{
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            borderRadius: "24px",
            overflow: "hidden",
            position: "relative",
            zIndex: 1,
            width: "100%",
          }}
        >
          <Header
            userInfo={userInfo}
            callStatus={callStatus}
            callType={callType}
            callDuration={callDuration}
            muted={muted}
            videoEnabled={videoEnabled}
            onVideoToggle={() => setVideoEnabled(!videoEnabled)}
            onMuteToggle={() => setMuted(!muted)}
            onEndCall={endCall}
            onInitiateCall={initiateCall}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: "500px",
            }}
          >
            {!userInfo ? (
              <>
                <div style={{padding: "16px", flex: 1, height: "400px"}}>
                  <Text style={{fontSize: "12px", marginBottom: "8px"}}>
                    *các cuộc gọi hoàn toàn miễn phí
                  </Text>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "16px",
                    }}
                  >
                    <Button
                      style={{
                        flex: 1,
                        backgroundColor: "#00b1ff",
                        color: "white",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: "12px",
                        display: "flex",
                        height: "48px",
                      }}
                      onClick={() => setShowForm(true)}
                    >
                      <IoIosCall style={{fontSize: "24px"}}/>
                    </Button>

                    <Button
                      style={{
                        flex: 1,
                        backgroundColor: "#56cc6e",
                        color: "white",
                        justifyContent: "center",
                        alignItems: "center",
                        borderRadius: "12px",
                        display: "flex",
                        height: "48px",
                      }}
                      onClick={() => setShowForm(true)}
                    >
                      <IoIosVideocam style={{fontSize: "24px"}}/>
                    </Button>
                  </div>
                </div>
                <ChatInput
                  onFocus={() => setShowForm(true)}
                />
              </>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  height: "100%",
                }}
              >
                {callType === "video" && callStatus !== "idle" && (
                  <div style={{flex: 1, height: "100%"}}>
                    <VideoCall
                      localAudioRef={localAudioRef}
                      remoteAudioRef={remoteAudioRef}
                      localVideoRef={localVideoRef}
                      remoteVideoRef={remoteVideoRef}
                      height="100%"
                    />
                  </div>
                )}
                <div
                  style={{
                    flex: callType === "video" && callStatus !== "idle" ? 1 : "auto",
                    height: "100%",
                    width: callType === "video" && callStatus !== "idle" ? "auto" : "100%"
                  }}
                >
                  <ChatContent/>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

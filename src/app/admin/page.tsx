"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  List,
  Typography,
  Badge,
  Space,
  Button,
  Input,
  message,
} from "antd";
import io from "socket.io-client";
import Head from "next/head";
import CallModal from "../components/CallModal";
import "@ant-design/v5-patch-for-react-19";

const { Title, Text } = Typography;

interface Client {
  socketId: string;
  userData: {
    SocialName: string;
    Phone: string;
    Email: string;
  };
  callStatus?: "waiting" | "connected" | "ended";
  callType?: "audio" | "video";
}

interface Admin {
  socketId: string;
  phoneNumber: string;
  name: string;
}

// Thêm interface cho cuộc gọi trong hàng đợi
interface CallQueueItem {
  socketId: string;
  isAdmin: boolean; // true nếu người gọi là admin, false nếu là client
  name: string;
  callType: "audio" | "video";
  timestamp: number; // thời điểm nhận cuộc gọi
}

// Thêm trạng thái cuộc gọi đi
interface OutgoingCall {
  targetAdminPhone: string;
  targetAdminId?: string;
  targetAdminName?: string;
  callType: "audio" | "video";
  status: "calling" | "accepted" | "rejected" | "timeout";
}

const AdminPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [activeCallClientId, setActiveCallClientId] = useState<string | null>(
    null
  );
  const [activeCallType, setActiveCallType] = useState<"audio" | "video">(
    "audio"
  );
  const [muted, setMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [callModalVisible, setCallModalVisible] = useState(false);
  const [callInProgress, setCallInProgress] = useState(false);
  const [adminPhone, setAdminPhone] = useState("");
  const [adminName, setAdminName] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);

  // Thêm state cho hàng đợi cuộc gọi
  const [callQueue, setCallQueue] = useState<CallQueueItem[]>([]);

  // Thêm state để theo dõi cuộc gọi đi
  const [outgoingCall, setOutgoingCall] = useState<OutgoingCall | null>(null);
  const [outgoingCallModalVisible, setOutgoingCallModalVisible] =
    useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const socketRef = useRef<any>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeCallClientIdRef = useRef<string | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const outgoingCallRef = useRef<OutgoingCall | null>(null);

  // Hàm xử lý cuộc gọi từ hàng đợi
  const processNextCall = () => {
    if (callQueue.length > 0 && !callInProgress) {
      const nextCall = callQueue[0];
      setActiveCallClientId(nextCall.socketId);
      activeCallClientIdRef.current = nextCall.socketId;
      setActiveCallType(nextCall.callType);
      setCallModalVisible(true);

      // Xóa cuộc gọi này khỏi hàng đợi
      setCallQueue((prevQueue) => prevQueue.slice(1));
    }
  };

  const handleIceCandidate = (data: {
    candidate: RTCIceCandidateInit;
    source: string;
  }) => {
    try {
      if (peerConnectionRef.current) {
        if (peerConnectionRef.current.remoteDescription) {
          peerConnectionRef.current
            .addIceCandidate(new RTCIceCandidate(data.candidate))
            .catch((err) => console.error("Lỗi khi thêm ICE candidate:", err));
        } else {
          iceCandidatesQueue.current.push(data.candidate);
        }
      }
    } catch (error) {
      console.error("Lỗi khi xử lý ICE candidate:", error);
    }
  };

  const processPendingIceCandidates = () => {
    if (
      peerConnectionRef.current &&
      peerConnectionRef.current.remoteDescription
    ) {
      iceCandidatesQueue.current.forEach((candidate) => {
        peerConnectionRef.current
          ?.addIceCandidate(new RTCIceCandidate(candidate))
          .catch((err) =>
            console.error("Lỗi khi thêm ICE candidate từ hàng đợi:", err)
          );
      });
      iceCandidatesQueue.current = [];
    }
  };

  useEffect(() => {
    const SIGNALING_SERVER =
      process.env.NEXT_PUBLIC_SIGNALING_SERVER || "http://localhost:8080";
    socketRef.current = io(SIGNALING_SERVER);

    // Chỉ đăng ký admin khi có thông tin
    if (adminPhone && adminName) {
      socketRef.current.emit("register-admin", {
        phoneNumber: adminPhone,
        name: adminName,
      });
      setIsRegistered(true);
    }

    socketRef.current.on("current-clients", (clientsList: Client[]) => {
      setClients(clientsList);
    });

    socketRef.current.on("current-admins", (adminsList: Admin[]) => {
      setAdmins(adminsList);
    });

    socketRef.current.on("new-admin", (admin: Admin) => {
      setAdmins((prevAdmins) => {
        const existingAdminIndex = prevAdmins.findIndex(
          (a) => a.socketId === admin.socketId
        );
        if (existingAdminIndex !== -1) {
          const updatedAdmins = [...prevAdmins];
          updatedAdmins[existingAdminIndex] = admin;
          return updatedAdmins;
        } else {
          return [...prevAdmins, admin];
        }
      });
    });

    socketRef.current.on("admin-disconnected", (data: { socketId: string }) => {
      setAdmins((prevAdmins) =>
        prevAdmins.filter((admin) => admin.socketId !== data.socketId)
      );
    });

    socketRef.current.on(
      "incoming-admin-call",
      (data: {
        socketId: string;
        adminData: {
          phoneNumber: string;
          name: string;
        };
        callType: "audio" | "video";
      }) => {
        // Nếu đang không có cuộc gọi nào hoặc không đang trong cuộc gọi
        if (!callModalVisible && !callInProgress) {
          setActiveCallClientId(data.socketId);
          activeCallClientIdRef.current = data.socketId;
          setActiveCallType(data.callType);
          setCallModalVisible(true);
        } else {
          // Thêm vào hàng đợi
          setCallQueue((prevQueue) => [
            ...prevQueue,
            {
              socketId: data.socketId,
              isAdmin: true,
              name: data.adminData.name,
              callType: data.callType,
              timestamp: Date.now(),
            },
          ]);
        }
      }
    );

    socketRef.current.on(
      "admin-call-accepted",
      async (data: { adminId: string; callType: "audio" | "video" }) => {
        try {
          setCallInProgress(true);

          // Cập nhật trạng thái cuộc gọi đi
          if (outgoingCall) {
            setOutgoingCall({
              ...outgoingCall,
              status: "accepted",
            });
          }

          const constraints = {
            audio: true,
            video: data.callType === "video",
          };

          const stream = await navigator.mediaDevices
            .getUserMedia(constraints)
            .catch((err) => {
              console.error("Lỗi khi lấy media stream:", err);
              throw err;
            });

          localStreamRef.current = stream;
          setLocalStream(stream);

          if (localAudioRef.current) {
            localAudioRef.current.srcObject = stream;
            localAudioRef.current.muted = true;
          }

          if (data.callType === "video" && localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.muted = true;
          }

          createPeerConnection();

          // Tạo offer sau khi đã thiết lập kết nối
          const offer = await peerConnectionRef.current?.createOffer();
          await peerConnectionRef.current?.setLocalDescription(offer);

          socketRef.current.emit("offer", {
            target: data.adminId,
            offer: offer,
            callType: data.callType,
          });
        } catch (error) {
          console.error("Lỗi khi xử lý admin-call-accepted:", error);
          setActiveCallClientId(null);
          activeCallClientIdRef.current = null;
          setActiveCallType("audio");
          setCallInProgress(false);
          setOutgoingCall(null);
          setOutgoingCallModalVisible(false);
        }
      }
    );

    socketRef.current.on("admin-call-rejected", (data: { adminId: string }) => {
      message.error("Admin đã từ chối cuộc gọi");

      // Đóng modal ngay lập tức
      setOutgoingCall(null);
      setOutgoingCallModalVisible(false);
      endCall();
    });

    socketRef.current.on("admin-not-found", (data: { phoneNumber: string }) => {
      message.error(
        `Không tìm thấy admin với số điện thoại ${data.phoneNumber}`
      );

      // Hủy cuộc gọi đi
      setOutgoingCall(null);
      setOutgoingCallModalVisible(false);
    });

    socketRef.current.on(
      "admin-busy",
      (data: { targetAdminId: string; adminName: string }) => {
        // Hiển thị thông báo phù hợp dựa vào context
        if (outgoingCall) {
          // Nếu đang gọi admin thì hiển thị thông báo admin bận
          message.warning(`Admin ${data.adminName} đang bận với cuộc gọi khác`);
          // Hủy cuộc gọi đi
          setOutgoingCall(null);
          setOutgoingCallModalVisible(false);
        } else {
          // Nếu là client gọi đến admin thì hiển thị thông báo admin bận
          message.warning(
            `Admin ${data.adminName} đang bận, vui lòng thử lại sau`
          );
        }
      }
    );

    socketRef.current.on("new-client", (client: Client) => {
      setClients((prevClients) => {
        const existingClientIndex = prevClients.findIndex(
          (c) => c.socketId === client.socketId
        );
        if (existingClientIndex !== -1) {
          const updatedClients = [...prevClients];
          updatedClients[existingClientIndex] = client;
          return updatedClients;
        } else {
          return [...prevClients, client];
        }
      });
    });

    socketRef.current.on(
      "client-disconnected",
      (data: { socketId: string }) => {
        setClients((prevClients) =>
          prevClients.filter((client) => client.socketId !== data.socketId)
        );

        if (activeCallClientIdRef.current === data.socketId) {
          endCall();
        }
      }
    );

    socketRef.current.on(
      "incoming-call",
      (data: {
        socketId: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userData: any;
        callType: "audio" | "video";
      }) => {
        setClients((prevClients) => {
          return prevClients.map((c) => {
            if (c.socketId === data.socketId) {
              return { ...c, callStatus: "waiting", callType: data.callType };
            }
            return c;
          });
        });

        // Nếu đang không có cuộc gọi nào hoặc không đang trong cuộc gọi
        if (!callModalVisible && !callInProgress) {
          setActiveCallClientId(data.socketId);
          activeCallClientIdRef.current = data.socketId;
          setActiveCallType(data.callType);
          setCallModalVisible(true);
        } else {
          // Thêm vào hàng đợi
          setCallQueue((prevQueue) => [
            ...prevQueue,
            {
              socketId: data.socketId,
              isAdmin: false,
              name: data.userData.SocialName || "Khách hàng",
              callType: data.callType,
              timestamp: Date.now(),
            },
          ]);
        }
      }
    );

    socketRef.current.on("call-timeout", (data: { socketId: string }) => {
      // Nếu là cuộc gọi từ client
      if (clients.some((c) => c.socketId === data.socketId)) {
        setClients((prevClients) => {
          return prevClients.map((c) => {
            if (c.socketId === activeCallClientIdRef.current) {
              return { ...c, callStatus: "ended" };
            }
            return c;
          });
        });
      }

      // Kiểm tra nếu đây là cuộc gọi đang hiển thị
      if (data.socketId === activeCallClientIdRef.current) {
        cleanupWebRTC();
        setActiveCallClientId(null);
        activeCallClientIdRef.current = null;
        setActiveCallType("audio");
        setCallModalVisible(false);
        setCallInProgress(false);

        // Xử lý cuộc gọi tiếp theo trong hàng đợi
        setTimeout(processNextCall, 500);
      } else {
        // Xóa khỏi hàng đợi nếu là cuộc gọi đang chờ
        setCallQueue((prevQueue) =>
          prevQueue.filter((call) => call.socketId !== data.socketId)
        );
      }
    });

    socketRef.current.on(
      "call-request-cancelled",
      (data: { socketId: string; callType: "audio" | "video" }) => {
        if (data.socketId === activeCallClientIdRef.current) {
          setClients((prevClients) => {
            return prevClients.map((c) => {
              if (c.socketId === data.socketId) {
                return { ...c, callStatus: "ended" };
              }
              return c;
            });
          });

          cleanupWebRTC();
          setActiveCallClientId(null);
          activeCallClientIdRef.current = null;
          setActiveCallType("audio");
          setCallModalVisible(false);
          setCallInProgress(false);

          // Xử lý cuộc gọi tiếp theo trong hàng đợi
          setTimeout(processNextCall, 500);
        } else {
          // Xóa khỏi hàng đợi nếu là cuộc gọi đang chờ
          setCallQueue((prevQueue) =>
            prevQueue.filter((call) => call.socketId !== data.socketId)
          );
        }
      }
    );

    socketRef.current.on("admin-call-timeout", (data: { adminId: string }) => {
      if (activeCallClientIdRef.current === data.adminId) {
        message.info("Cuộc gọi đã hết thời gian chờ");

        // Ẩn modal cuộc gọi nếu đang hiển thị
        setCallModalVisible(false);
        setActiveCallClientId(null);
        activeCallClientIdRef.current = null;
        setActiveCallType("audio");
        cleanupWebRTC();

        // Xử lý cuộc gọi tiếp theo trong hàng đợi
        setTimeout(processNextCall, 500);
      } else {
        // Xóa khỏi hàng đợi nếu là cuộc gọi đang chờ
        setCallQueue((prevQueue) =>
          prevQueue.filter((call) => call.socketId !== data.adminId)
        );
      }
    });

    // Cập nhật xử lý admin-call-sent để lưu targetAdminId
    socketRef.current.on(
      "admin-call-sent",
      (data: { targetAdminId: string; phoneNumber: string }) => {
        if (outgoingCallRef.current) {
          setOutgoingCall({
            ...outgoingCallRef.current,
            targetAdminId: data.targetAdminId,
          });

          // Thiết lập timeout 30 giây cho cuộc gọi đi
          setTimeout(() => {
            // Kiểm tra xem cuộc gọi còn đang diễn ra không
            if (
              outgoingCallRef.current &&
              outgoingCallRef.current.status === "calling"
            ) {
              // Hiển thị thông báo bằng message thay vì trạng thái trong modal
              message.warning("Không có phản hồi từ admin");

              // Thông báo cho server rằng cuộc gọi đã hết thời gian
              if (socketRef.current && outgoingCallRef.current.targetAdminId) {
                socketRef.current.emit("admin-call-timeout", {
                  targetAdminId: outgoingCallRef.current.targetAdminId,
                });
              }

              // Đóng modal ngay lập tức thay vì đổi trạng thái và chờ đóng
              setOutgoingCall(null);
              setOutgoingCallModalVisible(false);
              cleanupWebRTC();
            }
          }, 30000);
        }
      }
    );

    socketRef.current.on(
      "call-ended",
      (data: { source: string; isAdmin?: boolean }) => {
        // Kiểm tra nếu đây là cuộc gọi đi bị kết thúc
        if (
          outgoingCallRef.current &&
          outgoingCallRef.current.targetAdminId === data.source
        ) {
          message.info("Cuộc gọi đã kết thúc");
          setOutgoingCall(null);
          setOutgoingCallModalVisible(false);
        }

        // Kiểm tra xem có phải cuộc gọi hiện tại
        if (activeCallClientIdRef.current === data.source) {
          handleCallEnded();

          // Xử lý cuộc gọi tiếp theo trong hàng đợi
          setTimeout(processNextCall, 500);
        }
      }
    );

    const socket = socketRef.current;

    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);

    return () => {
      if (socket) {
        socket.off("current-clients");
        socket.off("current-admins");
        socket.off("new-admin");
        socket.off("admin-disconnected");
        socket.off("incoming-admin-call");
        socket.off("admin-call-accepted");
        socket.off("admin-call-rejected");
        socket.off("admin-not-found");
        socket.off("admin-call-sent");
        socket.off("admin-call-timeout");
        socket.off("new-client");
        socket.off("client-disconnected");
        socket.off("incoming-call");
        socket.off("offer");
        socket.off("answer");
        socket.off("ice-candidate");
        socket.off("call-ended");

        socket.disconnect();
      }
      cleanupWebRTC();
    };
  }, [adminPhone, adminName]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !muted;
      });
    }
  }, [muted]);

  useEffect(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = videoEnabled;
      });
    }
  }, [videoEnabled]);

  useEffect(() => {
    // Cập nhật ref để có thể truy cập giá trị mới nhất trong closure
    outgoingCallRef.current = outgoingCall;
  }, [outgoingCall]);

  const acceptCall = async (clientId: string) => {
    try {
      if (
        activeCallClientIdRef.current &&
        activeCallClientIdRef.current !== clientId
      ) {
        return;
      }
      const client = clients.find((c) => c.socketId === clientId);
      const callType = client?.callType || "audio";

      setActiveCallClientId(clientId);
      setActiveCallType(callType);
      activeCallClientIdRef.current = clientId;
      setCallInProgress(true);

      const constraints = {
        audio: true,
        video: callType === "video",
      };

      const stream = await navigator.mediaDevices
        .getUserMedia(constraints)
        .catch((err) => {
          console.error("Lỗi khi lấy media stream:", err);
          throw err;
        });

      localStreamRef.current = stream;
      setLocalStream(stream);

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
      }

      if (callType === "video" && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }

      createPeerConnection();

      setClients((prevClients) => {
        return prevClients.map((c) => {
          if (c.socketId === clientId) {
            return { ...c, callStatus: "connected", callType: callType };
          }
          return c;
        });
      });

      socketRef.current.emit("accept-call", {
        clientId,
        callType: callType,
      });
    } catch (error) {
      console.error("Lỗi khi chấp nhận cuộc gọi:", error);
      setActiveCallClientId(null);
      activeCallClientIdRef.current = null;
      setActiveCallType("audio");
      setCallInProgress(false);
    }
  };

  const createPeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    peerConnectionRef.current = new RTCPeerConnection(configuration);

    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getTracks();
      tracks.forEach((track) => {
        if (peerConnectionRef.current && localStreamRef.current) {
          peerConnectionRef.current.addTrack(track, localStreamRef.current);
        }
      });
    } else {
      console.error("localStreamRef.current là null, không thể thêm track");
    }

    peerConnectionRef.current.onicecandidate = (event) => {
      if (
        event.candidate &&
        activeCallClientIdRef.current &&
        socketRef.current
      ) {
        socketRef.current.emit("ice-candidate", {
          target: activeCallClientIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      setRemoteStream(event.streams[0]);

      if (remoteAudioRef.current && event.track.kind === "audio") {
        remoteAudioRef.current.srcObject = event.streams[0];
      }

      if (remoteVideoRef.current && event.track.kind === "video") {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    peerConnectionRef.current.onconnectionstatechange = () => {
      if (peerConnectionRef.current) {
        if (
          peerConnectionRef.current.connectionState === "disconnected" ||
          peerConnectionRef.current.connectionState === "failed"
        ) {
          endCall();
        }
      }
    };
  };

  const endCall = () => {
    if (activeCallClientIdRef.current && socketRef.current) {
      socketRef.current.emit("end-call", {
        targetId: activeCallClientIdRef.current,
      });
    }

    setClients((prevClients) => {
      return prevClients.map((c) => {
        if (c.socketId === activeCallClientIdRef.current) {
          return { ...c, callStatus: "ended" };
        }
        return c;
      });
    });

    cleanupWebRTC();
    setActiveCallClientId(null);
    activeCallClientIdRef.current = null;
    setActiveCallType("audio");
    setCallModalVisible(false);
    setCallInProgress(false);
    setMuted(false);
    setVideoEnabled(true);

    // Xử lý cuộc gọi tiếp theo trong hàng đợi
    setTimeout(processNextCall, 500);
  };

  const handleCallEnded = () => {
    setClients((prevClients) => {
      return prevClients.map((c) => {
        if (c.socketId === activeCallClientIdRef.current) {
          return { ...c, callStatus: "ended" };
        }
        return c;
      });
    });

    cleanupWebRTC();
    setActiveCallClientId(null);
    activeCallClientIdRef.current = null;
    setActiveCallType("audio");
    setCallModalVisible(false);
    setCallInProgress(false);
    setMuted(false);
    setVideoEnabled(true);

    // Xử lý cuộc gọi tiếp theo trong hàng đợi
    setTimeout(processNextCall, 500);
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

    iceCandidatesQueue.current = [];
  };

  const handleOffer = async (data: {
    offer: RTCSessionDescriptionInit;
    source: string;
    callType: "audio" | "video";
  }) => {
    try {
      if (data.source !== activeCallClientIdRef.current) {
        const waitingClient = clients.find(
          (c) => c.socketId === data.source && c.callStatus === "waiting"
        );

        if (waitingClient) {
          setActiveCallClientId(data.source);
          activeCallClientIdRef.current = data.source;
          setActiveCallType(data.callType);
        } else {
          return;
        }
      }

      if (!peerConnectionRef.current) {
        createPeerConnection();
      }

      await peerConnectionRef.current?.setRemoteDescription(
        new RTCSessionDescription(data.offer)
      );

      processPendingIceCandidates();

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

  const handleAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
    try {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );

        processPendingIceCandidates();
      }
    } catch (error) {
      console.error("Lỗi khi xử lý answer:", error);
    }
  };

  const getActiveClient = () => {
    return clients.find((c) => c.socketId === activeCallClientId);
  };

  const handleRegisterAdmin = () => {
    if (!adminPhone || !adminName) {
      message.error("Vui lòng nhập đầy đủ thông tin");
      return;
    }
    setIsRegistered(true);
  };

  const handleCallAdmin = (
    targetAdminPhone: string,
    callType: "audio" | "video"
  ) => {
    if (!socketRef.current) return;

    // Tìm thông tin admin được gọi
    const targetAdmin = admins.find(
      (admin) => admin.phoneNumber === targetAdminPhone
    );

    if (!targetAdmin) {
      message.error("Không tìm thấy admin");
      return;
    }

    // Thiết lập thông tin cuộc gọi đi
    setOutgoingCall({
      targetAdminPhone,
      targetAdminId: targetAdmin.socketId,
      targetAdminName: targetAdmin.name,
      callType,
      status: "calling",
    });

    // Hiển thị modal cuộc gọi đi
    setOutgoingCallModalVisible(true);

    // Gửi yêu cầu gọi
    socketRef.current.emit("admin-call-admin", {
      targetAdminPhone,
      callType,
    });
  };

  const handleRejectAdminCall = (adminId: string) => {
    if (!socketRef.current) return;

    socketRef.current.emit("reject-admin-call", {
      adminId,
    });
  };

  const handleAcceptAdminCall = async (adminId: string) => {
    if (!socketRef.current) return;

    try {
      setCallInProgress(true);

      const constraints = {
        audio: true,
        video: activeCallType === "video",
      };

      const stream = await navigator.mediaDevices
        .getUserMedia(constraints)
        .catch((err) => {
          console.error("Lỗi khi lấy media stream:", err);
          throw err;
        });

      localStreamRef.current = stream;
      setLocalStream(stream);

      if (localAudioRef.current) {
        localAudioRef.current.srcObject = stream;
        localAudioRef.current.muted = true;
      }

      if (activeCallType === "video" && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.muted = true;
      }

      createPeerConnection();

      socketRef.current.emit("accept-admin-call", {
        adminId,
        callType: activeCallType,
      });
    } catch (error) {
      console.error("Lỗi khi chấp nhận cuộc gọi từ admin:", error);
      setActiveCallClientId(null);
      activeCallClientIdRef.current = null;
      setActiveCallType("audio");
      setCallInProgress(false);
    }
  };

  // Thêm hàm để hủy cuộc gọi đi
  const cancelOutgoingCall = () => {
    if (!socketRef.current || !outgoingCall || !outgoingCall.targetAdminId)
      return;

    socketRef.current.emit("end-call", {
      targetId: outgoingCall.targetAdminId,
    });

    setOutgoingCall(null);
    setOutgoingCallModalVisible(false);
    cleanupWebRTC();
  };

  return (
    <div>
      <Head>
        <title>OMI LiveTalk Admin</title>
        <meta name="description" content="Admin panel for OMI LiveTalk" />
      </Head>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "20px" }}>
        {!isRegistered ? (
          <Card>
            <Title level={2}>Đăng ký Admin</Title>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Input
                placeholder="Nhập số điện thoại"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
              />
              <Input
                placeholder="Nhập tên"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
              />
              <Button type="primary" onClick={handleRegisterAdmin}>
                Đăng ký
              </Button>
            </Space>
          </Card>
        ) : (
          <>
            <Card style={{ marginBottom: "20px" }}>
              <Title level={2}>OMI LiveTalk Admin</Title>
              <Text>Đang đăng nhập với số điện thoại: {adminPhone}</Text>
            </Card>

            <Card style={{ marginBottom: "20px" }}>
              <Title level={4}>Danh sách Admin đang trực tuyến</Title>
              {admins.length === 0 ? (
                <Text>Không có admin nào khác đang trực tuyến</Text>
              ) : (
                <List
                  itemLayout="horizontal"
                  dataSource={admins}
                  renderItem={(admin) => (
                    <List.Item
                      actions={[
                        <Button
                          key="audio"
                          type="primary"
                          onClick={() =>
                            handleCallAdmin(admin.phoneNumber, "audio")
                          }
                        >
                          Gọi thoại
                        </Button>,
                        <Button
                          key="video"
                          type="primary"
                          onClick={() =>
                            handleCallAdmin(admin.phoneNumber, "video")
                          }
                        >
                          Gọi video
                        </Button>,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Badge status="success" />}
                        title={admin.name}
                        description={`Số điện thoại: ${admin.phoneNumber}`}
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>

            <Card>
              <Title level={4}>Danh sách khách hàng đang trực tuyến</Title>
              {clients.length === 0 ? (
                <Text>Không có khách hàng nào đang trực tuyến</Text>
              ) : (
                <List
                  itemLayout="horizontal"
                  dataSource={clients}
                  renderItem={(client) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <Badge
                            status={
                              client.callStatus === "waiting"
                                ? "processing"
                                : client.callStatus === "connected"
                                  ? "success"
                                  : "default"
                            }
                          />
                        }
                        title={
                          <Space>
                            <Text strong>{client.userData.SocialName}</Text>
                            {client.callStatus === "waiting" && (
                              <Badge
                                count={
                                  client.callType === "video"
                                    ? "Đang gọi video"
                                    : "Đang gọi"
                                }
                                style={{ backgroundColor: "#1890ff" }}
                              />
                            )}
                          </Space>
                        }
                        description={
                          <div>
                            <div>Số điện thoại: {client.userData.Phone}</div>
                            <div>Email: {client.userData.Email}</div>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </>
        )}
      </div>

      {/* Audio elements for WebRTC */}
      <audio
        ref={localAudioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />

      {/* Modal cuộc gọi đến */}
      <CallModal
        visible={callModalVisible}
        name={
          getActiveClient()?.userData.SocialName ||
          admins.find((a) => a.socketId === activeCallClientId)?.name
        }
        callType={activeCallType}
        onAccept={() => {
          if (activeCallClientId) {
            const isAdminCall = admins.some(
              (a) => a.socketId === activeCallClientId
            );
            if (isAdminCall) {
              handleAcceptAdminCall(activeCallClientId);
            } else {
              acceptCall(activeCallClientId);
            }
          }
        }}
        onReject={() => {
          if (activeCallClientId) {
            const isAdminCall = admins.some(
              (a) => a.socketId === activeCallClientId
            );
            if (isAdminCall) {
              handleRejectAdminCall(activeCallClientId);
            }
          }
          endCall();
        }}
        callInProgress={callInProgress}
        videoEnabled={videoEnabled}
        toggleVideo={() => setVideoEnabled(!videoEnabled)}
        muted={muted}
        toggleMute={() => setMuted(!muted)}
        localStream={localStream}
        remoteStream={remoteStream}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
      />

      {/* Modal cuộc gọi đi */}
      <CallModal
        visible={outgoingCallModalVisible}
        name={outgoingCall?.targetAdminName || "Admin"}
        callType={outgoingCall?.callType || "audio"}
        isOutgoing={true}
        onAccept={() => {
          /* Không cần cho cuộc gọi đi */
        }}
        onReject={cancelOutgoingCall}
        callInProgress={callInProgress}
        videoEnabled={videoEnabled}
        toggleVideo={() => setVideoEnabled(!videoEnabled)}
        muted={muted}
        toggleMute={() => setMuted(!muted)}
        localStream={localStream}
        remoteStream={remoteStream}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
      />

      {/* Hiển thị thông tin về số cuộc gọi đang chờ trong hàng đợi */}
      {callQueue.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            backgroundColor: "#1890ff",
            color: "white",
            padding: "8px 16px",
            borderRadius: 8,
            zIndex: 1000,
          }}
        >
          <Typography.Text style={{ color: "white" }}>
            Có {callQueue.length} cuộc gọi đang chờ
          </Typography.Text>
        </div>
      )}
    </div>
  );
};

export default AdminPage;

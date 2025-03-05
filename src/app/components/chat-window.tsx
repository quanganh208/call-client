import {Avatar, Button, Card, Input, message, Typography} from "antd";
import {IoIosCall, IoIosVideocam, IoMdMic, IoMdMicOff} from "react-icons/io";
import {SmileOutlined} from "@ant-design/icons";
import {FiPaperclip, FiSend} from "react-icons/fi";
import UserInformationForm from "@/app/components/user-info-form";
import React, {useEffect, useState, useRef} from "react";
import io from "socket.io-client";
import {MdCallEnd, MdVideocam, MdVideocamOff} from "react-icons/md";
import {IoCloseCircle} from "react-icons/io5";
import '@ant-design/v5-patch-for-react-19';

interface ChatWindowProps {
    onCloseChatWindow: () => void;
}

interface UserInformation {
    name: string;
    phone: string;
    email: string;
}

export default function ChatWindow({onCloseChatWindow}: ChatWindowProps) {
    const {Text, Title} = Typography;
    const [userInfo, setUserInfo] = useState<UserInformation | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [callStatus, setCallStatus] = useState<"idle" | "calling" | "connected">("idle");
    const [callType, setCallType] = useState<"audio" | "video">("audio");
    const [muted, setMuted] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [callDuration, setCallDuration] = useState(0);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);

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

        const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER || "http://localhost:8080";
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

    const handleCallTimeout = async () => {
        await message.warning("Không có nhân viên nào trả lời cuộc gọi, vui lòng thử lại sau")
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

            const mediaConstraints = {
                audio: true,
                video: type === "video"
            };

            const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
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

    const handleCallAccepted = async (data: { adminId: string, callType: "audio" | "video" }) => {
        try {
            adminIdRef.current = data.adminId;
            setCallType(data.callType);

            createPeerConnection();

            if (localStreamRef.current && peerConnectionRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
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
                    callType: data.callType
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
                {urls: "stun:stun1.l.google.com:19302"}
            ]
        };

        peerConnectionRef.current = new RTCPeerConnection(configuration);

        peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate && adminIdRef.current && socketRef.current) {
                socketRef.current.emit("ice-candidate", {
                    target: adminIdRef.current,
                    candidate: event.candidate
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
                } else if (peerConnectionRef.current.connectionState === "disconnected" ||
                    peerConnectionRef.current.connectionState === "failed") {
                    endCall();
                }
            }
        };
    };

    const handleOffer = async (data: {
        offer: RTCSessionDescriptionInit,
        source: string,
        callType: "audio" | "video"
    }) => {
        try {
            adminIdRef.current = data.source;
            setCallType(data.callType);

            if (!localStreamRef.current) {
                const mediaConstraints = {
                    audio: true,
                    video: data.callType === "video"
                };

                const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
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
                localStreamRef.current.getTracks().forEach(track => {
                    if (peerConnectionRef.current && localStreamRef.current) {
                        peerConnectionRef.current.addTrack(track, localStreamRef.current);
                    }
                });
            }

            await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(data.offer));

            const answer = await peerConnectionRef.current?.createAnswer();
            await peerConnectionRef.current?.setLocalDescription(answer);

            socketRef.current.emit("answer", {
                target: data.source,
                answer: answer,
                callType: data.callType
            });
        } catch (error) {
            console.error("Lỗi khi xử lý offer:", error);
        }
    };

    const handleAnswer = async (data: { answer: RTCSessionDescriptionInit, callType: "audio" | "video" }) => {
        try {
            setCallType(data.callType);
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        } catch (error) {
            console.error("Lỗi khi xử lý answer:", error);
        }
    };

    const handleIceCandidate = (data: { candidate: RTCIceCandidateInit }) => {
        try {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
        } catch (error) {
            console.error("Lỗi khi xử lý ICE candidate:", error);
        }
    };

    const endCall = async () => {
        if (callStatus === "calling" && socketRef.current) {
            socketRef.current.emit("cancel-call-request", {
                callType: callType
            });
        }

        if (adminIdRef.current && socketRef.current) {
            socketRef.current.emit("end-call", {
                targetId: adminIdRef.current
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
            localStreamRef.current.getTracks().forEach(track => track.stop());
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

        localStorage.setItem('userInfo', JSON.stringify(info));
    };

    const handleCloseForm = () => {
        setShowForm(false);
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
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
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = videoEnabled;
            });
        }
    }, [videoEnabled]);

    useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !muted;
            });
        }
    }, [muted]);


    useEffect(() => {
        const savedUserInfo = localStorage.getItem('userInfo');

        if (savedUserInfo) {
            const parsedUserInfo = JSON.parse(savedUserInfo);
            setUserInfo(parsedUserInfo);
            setShowForm(false);
        }
    }, []);

    const chatLogo = (width?: string, height?: string) => <Avatar
        style={{
            backgroundColor: '#1890ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: width || '40px',
            height: height || '40px',
            flexShrink: 0
        }}
        icon={<Text style={{color: 'white'}}>C</Text>}
    />

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'flex-start',
            position: 'fixed',
            bottom: '24px',
            right: '16px',
            width: '435px',
            gap: '16px'
        }}>
            <Button
                type="text"
                icon={<IoCloseCircle size={20} color='#1E3150'/>}
                style={{
                    backgroundColor: '#1e31501a',
                    borderRadius: '12px',
                    padding: '16px'
                }}
                onClick={onCloseChatWindow}
            />
            <div style={{position: 'relative', width: '100%'}}>
                {showForm && (
                    <UserInformationForm
                        onClose={handleCloseForm}
                        onSubmit={handleSubmitUserInfo}
                    />
                )}
                <Card
                    styles={{
                        body: {padding: 0}
                    }}
                    style={{
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '24px',
                        overflow: 'hidden',
                        position: 'relative',
                        zIndex: 1,
                        width: '100%'
                    }}
                >
                    <div style={{
                        padding: userInfo ? '16px' : '24px',
                        background: '#1E3150',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        {!userInfo ? (
                                <div>
                                    <div style={{display: 'flex', alignItems: 'center'}}>
                                        {chatLogo()}
                                        <Title level={5} style={{color: 'white', marginLeft: '16px'}}>DSS LiveTalk</Title>
                                    </div>
                                </div>) :
                            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                                <div style={{height: '36px', display: 'flex', alignItems: 'center'}}>
                                    {callStatus === "idle" ? (
                                            <Text style={{color: 'white', fontSize: '15px'}}>DSS LiveTalk</Text>)
                                        : (
                                            <div style={{
                                                display: 'flex',
                                                flexDirection: 'column'
                                            }}>
                                                <Text style={{
                                                    color: 'white',
                                                    fontSize: '15px'
                                                }}>{callStatus === "calling" ? `Gọi ${callType}` : formatTime(callDuration)}</Text>
                                                <Text style={{
                                                    color: 'white',
                                                    fontSize: '15px',
                                                    opacity: 0.5
                                                }}>{callStatus === 'calling' ? 'Đang đổ chuông...' : 'Đã kết nối'}</Text>
                                            </div>
                                        )
                                    }
                                </div>
                                {callStatus === "idle" ? (
                                    <div style={{display: 'flex', gap: '8px'}}>
                                        <Button
                                            icon={<IoIosCall/>}
                                            style={{
                                                backgroundColor: '#00b1ff',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                borderRadius: '12px',
                                                height: '36px',
                                                width: '36px',
                                                border: 'none',
                                                color: 'white',
                                                fontSize: '20px'
                                            }}
                                            onClick={() => initiateCall("audio")}
                                        >

                                        </Button>
                                        <Button
                                            icon={<IoIosVideocam/>}
                                            style={{
                                                backgroundColor: '#56cc6e',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                borderRadius: '12px',
                                                height: '36px',
                                                width: '36px',
                                                border: 'none',
                                                color: 'white',
                                                fontSize: '20px'
                                            }}
                                            onClick={() => initiateCall("video")}
                                        >

                                        </Button>
                                    </div>
                                ) : (
                                    <div>
                                        {callStatus === 'connected' && callType === 'video' && <Button
                                            onClick={() => setVideoEnabled(!videoEnabled)}
                                            icon={videoEnabled ? <MdVideocam/> : <MdVideocamOff color='#1E3150'/>}
                                            style={{
                                                backgroundColor: videoEnabled ? '#ffffff1a' : 'white',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                width: '36px',
                                                height: '36px',
                                                fontSize: '20px',
                                                marginRight: '8px'
                                            }}
                                        />}
                                        {callStatus === 'connected' && <Button
                                            onClick={() => setMuted(!muted)}
                                            icon={muted ? <IoMdMicOff color='#1E3150'/> : <IoMdMic/>}
                                            style={{
                                                backgroundColor: muted ? 'white' : '#ffffff1a',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                width: '36px',
                                                height: '36px',
                                                fontSize: '20px',
                                                marginRight: '8px'
                                            }}
                                        />}

                                        <Button
                                            icon={<MdCallEnd/>}
                                            style={{
                                                backgroundColor: '#ff5955',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                borderRadius: '12px',
                                                height: '36px',
                                                width: '36px',
                                                border: 'none',
                                                color: 'white',
                                                fontSize: '20px',
                                            }}
                                            onClick={endCall}
                                        >
                                        </Button>
                                    </div>
                                )
                                }
                            </div>
                        }
                    </div>

                    {!userInfo ? (<div style={{padding: '16px', height: '400px'}}>
                        <Text style={{fontSize: '12px', marginBottom: '8px'}}>*các cuộc gọi hoàn toàn miễn phí</Text>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '16px'
                        }}>
                            <Button
                                style={{
                                    flex: 1,
                                    backgroundColor: '#00b1ff',
                                    color: 'white',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    height: '48px'
                                }}
                                onClick={() => !userInfo && setShowForm(true)}
                            >
                                <IoIosCall style={{fontSize: '24px'}}/>
                            </Button>

                            <Button
                                style={{
                                    flex: 1,
                                    backgroundColor: '#56cc6e',
                                    color: 'white',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    height: '48px'
                                }}
                                onClick={() => !userInfo && setShowForm(true)}
                            >
                                <IoIosVideocam style={{fontSize: '24px'}}/>
                            </Button>
                        </div>
                    </div>) : (
                        <div style={{
                            padding: '16px',
                            height: '400px',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <audio ref={localAudioRef} autoPlay playsInline style={{display: 'none'}}/>
                            <audio ref={remoteAudioRef} autoPlay playsInline style={{display: 'none'}}/>

                            {callType === "video" && callStatus !== "idle" && (
                                <div style={{width: '100%', height: '100%', position: 'relative'}}>
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        style={{
                                            transform: 'scaleX(-1)',
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'cover',
                                            borderRadius: '8px',
                                            backgroundColor: '#f0f0f0'
                                        }}
                                    />

                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        style={{
                                            transform: 'scaleX(-1)',
                                            position: 'absolute',
                                            width: '120px',
                                            height: '90px',
                                            bottom: '16px',
                                            right: '16px',
                                            objectFit: 'cover',
                                            borderRadius: '8px',
                                            border: '2px solid white',
                                            backgroundColor: '#e6e6e6',
                                            zIndex: 2
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div style={{
                        padding: '8px 16px',
                        background: '#f5f6fa',
                    }}>
                        <div style={{
                            paddingTop: '8px',
                            paddingBottom: '16px',
                            flexDirection: 'row',
                            gap: '8px',
                            display: 'flex'
                        }}>
                            {chatLogo('16px', '16px')}
                            <Text style={{fontSize: '12px', color: '#1e3150', opacity: 0.6}}>Tích hợp miễn phí <Text
                                style={{color: '#00b1ff', fontSize: '12px'}}>DSS LiveTalk</Text> vào website của
                                bạn</Text>
                        </div>

                        <Input
                            onFocus={() => !userInfo && setShowForm(true)}
                            placeholder="Nhập tin nhắn"
                            style={{
                                background: 'transparent',
                                fontSize: '15px',
                                flex: 1,
                                padding: '8px 0',
                                border: 'none',
                                boxShadow: 'none'
                            }}
                            suffix={
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '24px'
                                }}>
                                    <SmileOutlined
                                        style={{
                                            fontSize: '20px',
                                            color: '#404040',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <FiPaperclip
                                        style={{
                                            fontSize: '20px',
                                            color: '#404040',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <FiSend
                                        style={{
                                            fontSize: '20px',
                                            color: '#404040',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </div>
                            }
                        />
                    </div>
                </Card>
            </div>
        </div>
    )
}

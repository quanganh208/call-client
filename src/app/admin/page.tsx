// pages/admin.tsx
'use client'
import React, {useEffect, useRef, useState} from 'react';
import {Card, List, Typography, Badge, Space} from 'antd';
import io from 'socket.io-client';
import Head from 'next/head';
import CallModal from '../components/call-modal';

const {Title, Text} = Typography;

interface Client {
    socketId: string;
    userData: {
        name: string;
        phone: string;
        email: string;
    };
    callStatus?: 'waiting' | 'connected' | 'ended';
    callType?: 'audio' | 'video';
}

const AdminPage: React.FC = () => {
    const [clients, setClients] = useState<Client[]>([]);
    const [activeCallClientId, setActiveCallClientId] = useState<string | null>(null);
    const [activeCallType, setActiveCallType] = useState<'audio' | 'video'>('audio');
    const [muted, setMuted] = useState(false);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [callModalVisible, setCallModalVisible] = useState(false);
    const [callInProgress, setCallInProgress] = useState(false);

    // WebRTC refs
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

    // Xử lý ICE candidate đã được cải thiện để lưu trữ candidates nếu remote description chưa sẵn sàng
    const handleIceCandidate = (data: { candidate: RTCIceCandidateInit, source: string }) => {
        try {
            if (peerConnectionRef.current) {
                if (peerConnectionRef.current.remoteDescription) {
                    peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
                        .catch(err => console.error("Lỗi khi thêm ICE candidate:", err));
                } else {
                    // Lưu candidate vào hàng đợi nếu remote description chưa sẵn sàng
                    iceCandidatesQueue.current.push(data.candidate);
                    console.log("Đã thêm ICE candidate vào hàng đợi, đợi remote description");
                }
            }
        } catch (error) {
            console.error("Lỗi khi xử lý ICE candidate:", error);
        }
    };

    // Hàm để xử lý hàng đợi ICE candidates sau khi đã thiết lập remote description
    const processPendingIceCandidates = () => {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            console.log(`Xử lý ${iceCandidatesQueue.current.length} ICE candidates trong hàng đợi`);
            iceCandidatesQueue.current.forEach(candidate => {
                peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(err => console.error("Lỗi khi thêm ICE candidate từ hàng đợi:", err));
            });
            iceCandidatesQueue.current = []; // Xóa hàng đợi sau khi xử lý
        }
    };

    useEffect(() => {
        const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER || "http://localhost:8080";
        socketRef.current = io(SIGNALING_SERVER);

        // Đăng ký là admin
        socketRef.current.emit("register-admin");

        // Lấy danh sách khách hàng hiện tại
        socketRef.current.on("current-clients", (clientsList: Client[]) => {
            setClients(clientsList);
        });

        // Xử lý khi có khách hàng mới kết nối
        socketRef.current.on("new-client", (client: Client) => {
            setClients(prevClients => {
                const existingClientIndex = prevClients.findIndex(c => c.socketId === client.socketId);
                if (existingClientIndex !== -1) {
                    // Cập nhật khách hàng hiện có
                    const updatedClients = [...prevClients];
                    updatedClients[existingClientIndex] = client;
                    return updatedClients;
                } else {
                    // Thêm khách hàng mới
                    return [...prevClients, client];
                }
            });
        });

        // Xử lý khi có khách hàng ngắt kết nối
        socketRef.current.on("client-disconnected", (data: { socketId: string }) => {
            setClients(prevClients => prevClients.filter(client => client.socketId !== data.socketId));

            // Kết thúc cuộc gọi nếu đang kết nối với khách hàng ngắt kết nối
            if (activeCallClientIdRef.current === data.socketId) {
                endCall();
            }
        });

        // Xử lý khi có cuộc gọi đến
        socketRef.current.on("incoming-call", (data: {
            socketId: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userData: any,
            callType: 'audio' | 'video'
        }) => {
            console.log(`Cuộc gọi ${data.callType} đến từ ${data.userData.name}`);

            // Cập nhật trạng thái cuộc gọi của khách hàng
            setClients(prevClients => {
                return prevClients.map(c => {
                    if (c.socketId === data.socketId) {
                        return {...c, callStatus: 'waiting', callType: data.callType};
                    }
                    return c;
                });
            });

            // Hiển thị modal thông báo cuộc gọi đến
            setActiveCallClientId(data.socketId);
            activeCallClientIdRef.current = data.socketId;
            setActiveCallType(data.callType);
            setCallModalVisible(true);
        });

        const socket = socketRef.current;

        // Xử lý WebRTC
        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("ice-candidate", handleIceCandidate);
        socket.on("call-ended", handleCallEnded);

        return () => {
            if (socket) {
                // Gỡ bỏ tất cả các event listener để tránh duplicate
                socket.off("current-clients");
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
    }, []);

    // Xử lý Mute/Unmute
    useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !muted;
            });
        }
    }, [muted]);

    // Xử lý bật/tắt video
    useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = videoEnabled;
            });
        }
    }, [videoEnabled]);

    // Chấp nhận cuộc gọi từ khách hàng
    const acceptCall = async (clientId: string) => {
        console.log("acceptCall được gọi với clientId:", clientId);
        try {
            // Kiểm tra xem có đang trong cuộc gọi khác không
            if (activeCallClientIdRef.current && activeCallClientIdRef.current !== clientId) {
                console.log("Bạn đang trong một cuộc gọi khác. Vui lòng kết thúc trước khi nhận cuộc gọi mới.");
                return;
            }

            // Lấy loại cuộc gọi từ client
            const client = clients.find(c => c.socketId === clientId);
            const callType = client?.callType || 'audio';

            // Cập nhật trạng thái
            setActiveCallClientId(clientId);
            setActiveCallType(callType);
            activeCallClientIdRef.current = clientId;
            setCallInProgress(true);

            console.log(`Bắt đầu thiết lập stream cho cuộc gọi ${callType}`);

            // Thiết lập stream cục bộ dựa vào loại cuộc gọi
            const constraints = {
                audio: true,
                video: callType === 'video'
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
                .catch(err => {
                    console.error("Lỗi khi lấy media stream:", err);
                    throw err;
                });

            console.log(`Đã lấy được stream ${callType}`);
            localStreamRef.current = stream;
            setLocalStream(stream);

            // Xử lý audio local
            if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
                localAudioRef.current.muted = true; // Tắt tiếng cục bộ để tránh tiếng vang
            }

            // Xử lý video local nếu là cuộc gọi video
            if (callType === 'video' && localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted = true;
            }

            // Tạo kết nối peer
            createPeerConnection();

            // Cập nhật trạng thái khách hàng
            setClients(prevClients => {
                return prevClients.map(c => {
                    if (c.socketId === clientId) {
                        return {...c, callStatus: 'connected', callType: callType};
                    }
                    return c;
                });
            });

            // Thông báo cho server rằng admin đã chấp nhận cuộc gọi
            socketRef.current.emit("accept-call", {
                clientId,
                callType: callType
            });

            console.log(`Đã kết nối cuộc gọi ${callType === 'video' ? 'video' : 'âm thanh'}!`);
        } catch (error) {
            console.error("Lỗi khi chấp nhận cuộc gọi:", error);
            // Reset trạng thái nếu có lỗi
            setActiveCallClientId(null);
            activeCallClientIdRef.current = null;
            setActiveCallType('audio');
            setCallInProgress(false);
        }
    };

    // Tạo kết nối peer
    const createPeerConnection = () => {
        console.log("Bắt đầu tạo peer connection");

        const configuration = {
            iceServers: [
                {urls: "stun:stun.l.google.com:19302"},
                {urls: "stun:stun1.l.google.com:19302"}
            ]
        };

        if (peerConnectionRef.current) {
            console.log("Đóng kết nối peer cũ trước khi tạo mới");
            peerConnectionRef.current.close();
        }

        peerConnectionRef.current = new RTCPeerConnection(configuration);
        console.log("Đã tạo peer connection mới");

        // Thêm tất cả tracks từ stream cục bộ vào kết nối peer
        if (localStreamRef.current) {
            const tracks = localStreamRef.current.getTracks();
            console.log(`Thêm ${tracks.length} track vào peer connection`);

            tracks.forEach(track => {
                if (peerConnectionRef.current && localStreamRef.current) {
                    peerConnectionRef.current.addTrack(track, localStreamRef.current);
                }
            });
        } else {
            console.warn("localStreamRef.current là null, không thể thêm track");
        }

        // Xử lý ICE candidate
        peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate && activeCallClientIdRef.current && socketRef.current) {
                console.log("Gửi ICE candidate đến client");
                socketRef.current.emit("ice-candidate", {
                    target: activeCallClientIdRef.current,
                    candidate: event.candidate
                });
            }
        };

        // Xử lý track từ xa
        peerConnectionRef.current.ontrack = (event) => {
            console.log("Nhận track từ xa:", event.track.kind);
            remoteStreamRef.current = event.streams[0];
            setRemoteStream(event.streams[0]);

            // Xử lý audio từ xa
            if (remoteAudioRef.current && event.track.kind === 'audio') {
                remoteAudioRef.current.srcObject = event.streams[0];
                console.log("Đã gán remote audio stream");
            }

            // Xử lý video từ xa
            if (remoteVideoRef.current && event.track.kind === 'video') {
                remoteVideoRef.current.srcObject = event.streams[0];
                console.log("Đã gán remote video stream");
            }
        };

        // Các trạng thái kết nối
        peerConnectionRef.current.onconnectionstatechange = () => {
            if (peerConnectionRef.current) {
                console.log("Trạng thái kết nối thay đổi:", peerConnectionRef.current.connectionState);

                if (peerConnectionRef.current.connectionState === "disconnected" ||
                    peerConnectionRef.current.connectionState === "failed") {
                    console.log("Kết nối bị ngắt hoặc thất bại, kết thúc cuộc gọi");
                    endCall();
                }
            }
        };

        console.log("Hoàn tất thiết lập peer connection");
    };

    // Kết thúc cuộc gọi
    const endCall = () => {
        // Thông báo cho server rằng cuộc gọi đã kết thúc
        if (activeCallClientIdRef.current && socketRef.current) {
            socketRef.current.emit("end-call", {targetId: activeCallClientIdRef.current});
        }

        // Cập nhật trạng thái khách hàng
        setClients(prevClients => {
            return prevClients.map(c => {
                if (c.socketId === activeCallClientIdRef.current) {
                    return {...c, callStatus: 'ended'};
                }
                return c;
            });
        });

        cleanupWebRTC();
        setActiveCallClientId(null);
        activeCallClientIdRef.current = null;
        setActiveCallType('audio');
        setCallModalVisible(false);
        setCallInProgress(false);
        setMuted(false);
        setVideoEnabled(true);
        console.log("Cuộc gọi đã kết thúc");
    };

    // Xử lý khi client kết thúc cuộc gọi
    const handleCallEnded = () => {
        // Cập nhật trạng thái khách hàng
        setClients(prevClients => {
            return prevClients.map(c => {
                if (c.socketId === activeCallClientIdRef.current) {
                    return {...c, callStatus: 'ended'};
                }
                return c;
            });
        });

        cleanupWebRTC();
        setActiveCallClientId(null);
        activeCallClientIdRef.current = null;
        setActiveCallType('audio');
        setCallModalVisible(false);
        setCallInProgress(false);
        setMuted(false);
        setVideoEnabled(true);
        console.log("Khách hàng đã kết thúc cuộc gọi");
    };

    // Dọn dẹp kết nối WebRTC
    const cleanupWebRTC = () => {
        // Dừng các track
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }

        // Đóng kết nối peer
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }

        // Reset ice candidates queue
        iceCandidatesQueue.current = [];
    };

    // Xử lý khi nhận offer
    const handleOffer = async (data: {
        offer: RTCSessionDescriptionInit,
        source: string,
        callType: 'audio' | 'video'
    }) => {
        console.log(`Nhận ${data.callType} offer từ:`, data.source);

        try {
            // Kiểm tra xem offer có phải từ khách hàng đang gọi không
            if (data.source !== activeCallClientIdRef.current) {
                console.log("Offer không phải từ khách hàng đang gọi hiện tại");

                // Kiểm tra xem client có trong danh sách chờ không
                const waitingClient = clients.find(c => c.socketId === data.source && c.callStatus === 'waiting');

                if (waitingClient) {
                    console.log("Client đang ở trạng thái chờ, thử chấp nhận cuộc gọi");
                    // Cập nhật activeCallClientId
                    setActiveCallClientId(data.source);
                    activeCallClientIdRef.current = data.source;
                    setActiveCallType(data.callType);
                    console.log("Đã cập nhật activeCallClientId:", data.source);
                } else {
                    console.log("Bỏ qua offer vì không phải từ client đang gọi");
                    return;
                }
            }

            console.log("Xử lý offer cho cuộc gọi hiện tại");

            if (!peerConnectionRef.current) {
                console.log("Tạo peer connection vì chưa tồn tại");
                createPeerConnection();
            }

            console.log("Đặt remote description từ offer");
            await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(data.offer));

            // Xử lý hàng đợi ICE candidates sau khi thiết lập remote description
            processPendingIceCandidates();

            // Tạo và gửi answer
            console.log("Tạo answer");
            const answer = await peerConnectionRef.current?.createAnswer();
            await peerConnectionRef.current?.setLocalDescription(answer);

            console.log("Gửi answer đến:", data.source);
            socketRef.current.emit("answer", {
                target: data.source,
                answer: answer,
                callType: data.callType
            });
        } catch (error) {
            console.error("Lỗi khi xử lý offer:", error);
        }
    };

    // Xử lý khi nhận answer từ client
    const handleAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
        try {
            console.log("Nhận answer, thiết lập remote description");
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));

                // Xử lý ICE candidates đang chờ sau khi nhận được answer
                processPendingIceCandidates();
            }
        } catch (error) {
            console.error("Lỗi khi xử lý answer:", error);
        }
    };

    // Lấy thông tin khách hàng đang gọi
    const getActiveClient = () => {
        return clients.find(c => c.socketId === activeCallClientId);
    };

    return (
        <div>
            <Head>
                <title>OMI LiveTalk Admin</title>
                <meta name="description" content="Admin panel for OMI LiveTalk"/>
            </Head>

            <div style={{maxWidth: '1200px', margin: '0 auto', padding: '20px'}}>
                <Card>
                    <Title level={2}>OMI LiveTalk Admin</Title>

                    <Title level={4}>Danh sách khách hàng đang trực tuyến</Title>

                    {clients.length === 0 ? (
                        <Text>Không có khách hàng nào đang trực tuyến</Text>
                    ) : (
                        <List
                            itemLayout="horizontal"
                            dataSource={clients}
                            renderItem={client => (
                                <List.Item>
                                    <List.Item.Meta
                                        avatar={
                                            <Badge
                                                status={client.callStatus === 'waiting' ? 'processing' :
                                                    client.callStatus === 'connected' ? 'success' : 'default'}
                                            />
                                        }
                                        title={
                                            <Space>
                                                <Text strong>{client.userData.name}</Text>
                                                {client.callStatus === 'waiting' && (
                                                    <Badge
                                                        count={client.callType === 'video' ? "Đang gọi video" : "Đang gọi"}
                                                        style={{backgroundColor: '#1890ff'}}
                                                    />
                                                )}
                                            </Space>
                                        }
                                        description={
                                            <div>
                                                <div>Số điện thoại: {client.userData.phone}</div>
                                                <div>Email: {client.userData.email}</div>
                                            </div>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    )}
                </Card>
            </div>

            {/* Audio elements for WebRTC */}
            <audio ref={localAudioRef} autoPlay playsInline style={{display: 'none'}}/>
            <audio ref={remoteAudioRef} autoPlay playsInline style={{display: 'none'}}/>

            {/* Modal cuộc gọi */}
            <CallModal
                visible={callModalVisible}
                name={getActiveClient()?.userData.name}
                callType={activeCallType}
                onAccept={() => acceptCall(activeCallClientId || '')}
                onReject={endCall}
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
        </div>
    );
};

export default AdminPage;

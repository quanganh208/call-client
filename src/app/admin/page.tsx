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

    const handleIceCandidate = (data: { candidate: RTCIceCandidateInit, source: string }) => {
        try {
            if (peerConnectionRef.current) {
                if (peerConnectionRef.current.remoteDescription) {
                    peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate))
                        .catch(err => console.error("Lỗi khi thêm ICE candidate:", err));
                } else {
                    iceCandidatesQueue.current.push(data.candidate);
                }
            }
        } catch (error) {
            console.error("Lỗi khi xử lý ICE candidate:", error);
        }
    };

    const processPendingIceCandidates = () => {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
            iceCandidatesQueue.current.forEach(candidate => {
                peerConnectionRef.current?.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(err => console.error("Lỗi khi thêm ICE candidate từ hàng đợi:", err));
            });
            iceCandidatesQueue.current = [];
        }
    };

    useEffect(() => {
        const SIGNALING_SERVER = process.env.NEXT_PUBLIC_SIGNALING_SERVER || "http://localhost:8080";
        socketRef.current = io(SIGNALING_SERVER);

        socketRef.current.emit("register-admin");

        socketRef.current.on("current-clients", (clientsList: Client[]) => {
            setClients(clientsList);
        });

        socketRef.current.on("new-client", (client: Client) => {
            setClients(prevClients => {
                const existingClientIndex = prevClients.findIndex(c => c.socketId === client.socketId);
                if (existingClientIndex !== -1) {
                    const updatedClients = [...prevClients];
                    updatedClients[existingClientIndex] = client;
                    return updatedClients;
                } else {
                    return [...prevClients, client];
                }
            });
        });

        socketRef.current.on("client-disconnected", (data: { socketId: string }) => {
            setClients(prevClients => prevClients.filter(client => client.socketId !== data.socketId));

            if (activeCallClientIdRef.current === data.socketId) {
                endCall();
            }
        });

        socketRef.current.on("incoming-call", (data: {
            socketId: string,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            userData: any,
            callType: 'audio' | 'video'
        }) => {
            setClients(prevClients => {
                return prevClients.map(c => {
                    if (c.socketId === data.socketId) {
                        return {...c, callStatus: 'waiting', callType: data.callType};
                    }
                    return c;
                });
            });

            setActiveCallClientId(data.socketId);
            activeCallClientIdRef.current = data.socketId;
            setActiveCallType(data.callType);
            setCallModalVisible(true);
        });

        const socket = socketRef.current;

        socket.on("offer", handleOffer);
        socket.on("answer", handleAnswer);
        socket.on("ice-candidate", handleIceCandidate);
        socket.on("call-ended", handleCallEnded);

        return () => {
            if (socket) {
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

    useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !muted;
            });
        }
    }, [muted]);

    useEffect(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = videoEnabled;
            });
        }
    }, [videoEnabled]);

    const acceptCall = async (clientId: string) => {
        try {
            if (activeCallClientIdRef.current && activeCallClientIdRef.current !== clientId) {
                return;
            }
            const client = clients.find(c => c.socketId === clientId);
            const callType = client?.callType || 'audio';

            setActiveCallClientId(clientId);
            setActiveCallType(callType);
            activeCallClientIdRef.current = clientId;
            setCallInProgress(true);

            const constraints = {
                audio: true,
                video: callType === 'video'
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints)
                .catch(err => {
                    console.error("Lỗi khi lấy media stream:", err);
                    throw err;
                });

            localStreamRef.current = stream;
            setLocalStream(stream);

            if (localAudioRef.current) {
                localAudioRef.current.srcObject = stream;
                localAudioRef.current.muted = true;
            }

            if (callType === 'video' && localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted = true;
            }

            createPeerConnection();

            setClients(prevClients => {
                return prevClients.map(c => {
                    if (c.socketId === clientId) {
                        return {...c, callStatus: 'connected', callType: callType};
                    }
                    return c;
                });
            });

            socketRef.current.emit("accept-call", {
                clientId,
                callType: callType
            });
        } catch (error) {
            console.error("Lỗi khi chấp nhận cuộc gọi:", error);
            setActiveCallClientId(null);
            activeCallClientIdRef.current = null;
            setActiveCallType('audio');
            setCallInProgress(false);
        }
    };

    const createPeerConnection = () => {
        const configuration = {
            iceServers: [
                {urls: "stun:stun.l.google.com:19302"},
                {urls: "stun:stun1.l.google.com:19302"}
            ]
        };

        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
        }

        peerConnectionRef.current = new RTCPeerConnection(configuration);

        if (localStreamRef.current) {
            const tracks = localStreamRef.current.getTracks();
            tracks.forEach(track => {
                if (peerConnectionRef.current && localStreamRef.current) {
                    peerConnectionRef.current.addTrack(track, localStreamRef.current);
                }
            });
        } else {
            console.error("localStreamRef.current là null, không thể thêm track");
        }

        peerConnectionRef.current.onicecandidate = (event) => {
            if (event.candidate && activeCallClientIdRef.current && socketRef.current) {
                socketRef.current.emit("ice-candidate", {
                    target: activeCallClientIdRef.current,
                    candidate: event.candidate
                });
            }
        };

        peerConnectionRef.current.ontrack = (event) => {
            remoteStreamRef.current = event.streams[0];
            setRemoteStream(event.streams[0]);

            if (remoteAudioRef.current && event.track.kind === 'audio') {
                remoteAudioRef.current.srcObject = event.streams[0];
            }

            if (remoteVideoRef.current && event.track.kind === 'video') {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        peerConnectionRef.current.onconnectionstatechange = () => {
            if (peerConnectionRef.current) {
                if (peerConnectionRef.current.connectionState === "disconnected" ||
                    peerConnectionRef.current.connectionState === "failed") {
                    endCall();
                }
            }
        };
    };

    const endCall = () => {
        if (activeCallClientIdRef.current && socketRef.current) {
            socketRef.current.emit("end-call", {targetId: activeCallClientIdRef.current});
        }

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
    };

    const handleCallEnded = () => {
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

        iceCandidatesQueue.current = [];
    };

    const handleOffer = async (data: {
        offer: RTCSessionDescriptionInit,
        source: string,
        callType: 'audio' | 'video'
    }) => {

        try {
            if (data.source !== activeCallClientIdRef.current) {

                const waitingClient = clients.find(c => c.socketId === data.source && c.callStatus === 'waiting');

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

            await peerConnectionRef.current?.setRemoteDescription(new RTCSessionDescription(data.offer));

            processPendingIceCandidates();

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

    const handleAnswer = async (data: { answer: RTCSessionDescriptionInit }) => {
        try {
            if (peerConnectionRef.current) {
                await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));

                processPendingIceCandidates();
            }
        } catch (error) {
            console.error("Lỗi khi xử lý answer:", error);
        }
    };

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

import React, {useEffect, useState} from 'react';
import {
    MdVideocam,
    MdVideocamOff,
    MdCallEnd,
    MdFullscreenExit
} from 'react-icons/md';
import {IoMdMic, IoMdMicOff} from "react-icons/io";
import {Avatar, Button, Input, Tooltip, Typography} from "antd";
import '@ant-design/v5-patch-for-react-19';
import {SmileOutlined} from "@ant-design/icons";
import {FiPaperclip, FiSend} from "react-icons/fi";

interface FullscreenVideoCallProps {
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    localVideoRef: React.RefObject<HTMLVideoElement | null>;
    remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
    onEndCall: () => void;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    muted: boolean;
    videoEnabled: boolean;
    onMinimize: () => void;
    callDuration: string;
}

const {Text} = Typography

const FullscreenVideoCallClient: React.FC<FullscreenVideoCallProps> = ({
                                                                           localStream,
                                                                           remoteStream,
                                                                           localVideoRef,
                                                                           remoteVideoRef,
                                                                           onEndCall,
                                                                           onToggleMute,
                                                                           onToggleVideo,
                                                                           muted,
                                                                           videoEnabled,
                                                                           onMinimize,
                                                                           callDuration
                                                                       }) => {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
    });
    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, remoteStream, localVideoRef, remoteVideoRef]);

    const getVideoContainerStyle = (): React.CSSProperties => {
        const isMobile = windowSize.width < 768;

        return {
            flex: 1,
            backgroundColor: '#ffffff1a',
            borderRadius: '12px',
            position: 'relative',
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            display: 'flex',
            ...(isMobile ? {
                height: windowSize.width > windowSize.height
                    ? '40vh'
                    : '30vh'
            } : {
                height: '100%'
            })
        };
    };

    const getVideoStyle = (): React.CSSProperties => {
        const isMobile = windowSize.width < 768;

        return {
            transform: 'scaleX(-1)',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...(isMobile ? {
                maxHeight: windowSize.width > windowSize.height
                    ? '40vh'
                    : '30vh'
            } : {})
        };
    };

    const chatLogo = (width?: string, height?: string) => (
        <Avatar
            style={{
                backgroundColor: "#1890ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: width || "40px",
                height: height || "40px",
                flexShrink: 0,
            }}
            icon={<Text style={{color: "white"}}>C</Text>}
        />
    );

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: '#1E3150',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flex: 1,
                    gap: '16px',
                    padding: '16px',
                    flexDirection: windowSize.width < 768 ? 'column' : 'row'
                }}
            >
                <div style={getVideoContainerStyle()}>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={getVideoStyle()}
                    />
                </div>

                <div style={getVideoContainerStyle()}>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={getVideoStyle()}
                    />
                </div>

                <div
                    style={{
                        width: '400px',
                        height: '100%',
                        background: 'white',
                        borderRadius: '8px',
                        display: 'flex',
                        flexDirection: 'column'
                    }}>
                    <div
                        style={{flex: 1, padding: "16px", overflowY: "auto"}}
                    >
                        {/* Chat content will go here */}
                    </div>

                    <div
                        style={{
                            padding: "8px 16px",
                            background: "#f5f6fa",
                            borderRadius: '8px',
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
                            {chatLogo("16px", "16px")}
                            <Text
                                style={{
                                    fontSize: "12px",
                                    color: "#1e3150",
                                    opacity: 0.6,
                                }}
                            >
                                Tích hợp miễn phí{" "}
                                <Text
                                    style={{color: "#00b1ff", fontSize: "12px"}}
                                >
                                    DSS LiveTalk
                                </Text>{" "}
                                vào website của bạn
                            </Text>
                        </div>

                        <Input
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
                                    <SmileOutlined
                                        style={{
                                            fontSize: "20px",
                                            color: "#404040",
                                            cursor: "pointer",
                                        }}
                                    />
                                    <FiPaperclip
                                        style={{
                                            fontSize: "20px",
                                            color: "#404040",
                                            cursor: "pointer",
                                        }}
                                    />
                                    <FiSend
                                        style={{
                                            fontSize: "20px",
                                            color: "#404040",
                                            cursor: "pointer",
                                        }}
                                    />
                                </div>
                            }
                        />
                    </div>
                </div>
            </div>

            <div
                style={{
                    height: '120px',
                    backgroundColor: '#283b65',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 32px'
                }}
            >
                <div>
                    <Text
                        style={{
                            color: 'white',
                            margin: 0,
                            fontSize: '16px',
                            marginBottom: '8px'
                        }}
                    >
                        Cuộc gọi Video
                    </Text>
                    <div
                        style={{
                            color: '#b0b8c8',
                            fontSize: '15px'
                        }}
                    >
                        {callDuration}
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        gap: '16px',
                        alignItems: 'center'
                    }}
                >
                    <Tooltip title={videoEnabled ? "Tắt camera" : "Bật camera"}>
                        <Button
                            icon={videoEnabled ? <MdVideocam/> : <MdVideocamOff color='#1E3150'/>}
                            shape='circle'
                            onClick={onToggleVideo}
                            style={{
                                backgroundColor: !videoEnabled ? 'white' : '#ffffff1a',
                                color: 'white',
                                border: 'none',
                                width: '64px',
                                height: '64px',
                                fontSize: '24px'
                            }}
                        />
                    </Tooltip>
                    <Tooltip title={muted ? "Bật mic" : "Tắt mic"}>
                        <Button
                            icon={muted ? <IoMdMicOff color='#1E3150'/> : <IoMdMic/>}
                            shape='circle'
                            onClick={onToggleMute}
                            style={{
                                backgroundColor: muted ? 'white' : '#ffffff1a',
                                color: 'white',
                                border: 'none',
                                width: '64px',
                                height: '64px',
                                fontSize: '24px'
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Kết thúc cuộc gọi">
                        <Button
                            icon={<MdCallEnd/>}
                            shape='circle'
                            onClick={onEndCall}
                            style={{
                                backgroundColor: '#ff5955',
                                color: 'white',
                                border: 'none',
                                width: '64px',
                                height: '64px',
                                fontSize: '24px'
                            }}
                        />
                    </Tooltip>
                </div>
                <Tooltip title='Thu nhỏ'>
                    <Button
                        icon={<MdFullscreenExit/>}
                        shape='circle'
                        onClick={onMinimize}
                        style={{
                            backgroundColor: '#ffffff1a',
                            color: 'white',
                            border: 'none',
                            width: '48px',
                            height: '48px',
                            fontSize: '24px'
                        }}
                    />
                </Tooltip>
            </div>
        </div>
    );
};

export default FullscreenVideoCallClient;

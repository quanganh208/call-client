import React, {useEffect, useRef, useState} from 'react';
import {Button, Modal, Row, Tooltip, Typography} from 'antd';
import {
    IoIosCall, IoIosVideocam,
    IoMdMic,
    IoMdMicOff,
} from 'react-icons/io';
import {IoPersonCircle} from 'react-icons/io5';
import {MdCallEnd, MdFullscreen, MdVideocam, MdVideocamOff} from 'react-icons/md';
import FullscreenVideoCall from './fullscreen-video-call';

interface CallModalProps {
    visible: boolean;
    name?: string;
    callType: 'audio' | 'video';
    onAccept: () => void;
    onReject: () => void;
    callInProgress: boolean;
    videoEnabled: boolean;
    toggleVideo: () => void;
    muted: boolean;
    toggleMute: () => void;
    localStream: MediaStream | null;
    remoteStream: MediaStream | null;
    localVideoRef: React.RefObject<HTMLVideoElement>;
    remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

const {Text} = Typography;

export default function CallModal({
                                      visible,
                                      name,
                                      callType,
                                      onAccept,
                                      onReject,
                                      callInProgress,
                                      videoEnabled,
                                      toggleVideo,
                                      muted,
                                      toggleMute,
                                      localStream,
                                      remoteStream,
                                      localVideoRef,
                                      remoteVideoRef
                                  }: CallModalProps) {
    const [time, setTime] = useState(new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}));
    const [callDuration, setCallDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (callInProgress) {
            setCallDuration(0);
            setIsFullscreen(false);
            timerInterval.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerInterval.current) {
                clearInterval(timerInterval.current);
                timerInterval.current = null;
            }
        }
        return () => {
            if (timerInterval.current) {
                clearInterval(timerInterval.current);
                timerInterval.current = null;
            }
        };
    }, [callInProgress]);

    useEffect(() => {
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream, remoteStream, localVideoRef, remoteVideoRef, isFullscreen]);

    if (isFullscreen && callType === 'video' && callInProgress) {
        return (
            <FullscreenVideoCall
                name={name}
                localStream={localStream}
                remoteStream={remoteStream}
                localVideoRef={localVideoRef}
                remoteVideoRef={remoteVideoRef}
                onEndCall={onReject}
                onToggleMute={toggleMute}
                onToggleVideo={toggleVideo}
                muted={muted}
                videoEnabled={videoEnabled}
                onMinimize={() => setIsFullscreen(false)}
                callDuration={formatTime(callDuration)}
            />
        );
    }

    return (
        <Modal
            open={visible}
            footer={null}
            closable={false}
            centered
            width={callType === 'video' && callInProgress ? 600 : 360}
            styles={{
                content: {
                    padding: 0,
                    overflow: 'hidden',
                    borderRadius: '12px',
                },
                body: {
                    padding: '16px 24px',
                    backgroundColor: '#1E3150',
                    color: 'white',
                }
            }}
            style={{padding: 0}}
        >

            {
                callInProgress && callType === 'video' && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '18px',
                        alignItems: 'center'
                    }}>
                        <Text style={{color: 'white'}}>Cuộc gọi Video</Text>
                        <Tooltip title='Toàn màn hình'>
                            <Button
                                onClick={toggleFullscreen}
                                icon={<MdFullscreen/>}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    width: '36px',
                                    height: '36px',
                                    fontSize: '20px',
                                }}
                            />
                        </Tooltip>
                    </div>
                )
            }
            <div>
                {callType === 'video' && callInProgress && (
                    <div style={{width: '100%', marginBottom: '16px'}}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: '16px'
                        }}>
                            <div style={{
                                flex: 1,
                                backgroundColor: '#000',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    left: '8px',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}>
                                    {name || 'Khách hàng'}
                                </div>
                            </div>

                            <div style={{
                                flex: 1,
                                backgroundColor: '#000',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                position: 'relative'
                            }}>
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover'
                                    }}
                                />
                                <div style={{
                                    position: 'absolute',
                                    bottom: '8px',
                                    left: '8px',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px'
                                }}>
                                    Tôi
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {callInProgress && callType === 'video' ? null : (
                    <div style={{display: 'flex', marginBottom: '8px', width: '100%'}}>
                        <IoPersonCircle size={36} color='white'/>
                        <div style={{marginLeft: '8px'}}>
                            <div style={{
                                color: '#b0b8c8',
                                fontSize: '12px'
                            }}>{name || 'Không xác định'}, {time}</div>
                            <div style={{
                                backgroundColor: '#ffffff1a',
                                borderRadius: '12px',
                                padding: '8px',
                                marginTop: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '15px',
                                fontWeight: '500'
                            }}>
                                {callType === 'audio' ? (
                                    <IoIosCall style={{fontSize: '20px', marginRight: '8px'}}/>) : (
                                    <IoIosVideocam style={{fontSize: '20px', marginRight: '8px'}}/>)}
                                {callInProgress
                                    ? `Cuộc gọi ${callType === 'audio' ? 'Audio' : 'Video'} đang diễn ra`
                                    : `Đang yêu cầu cuộc gọi ${callType === 'audio' ? 'Audio' : 'Video'}`
                                }
                            </div>
                        </div>
                    </div>)}

                <div style={{
                    height: '1px',
                    backgroundColor: '#283b65',
                    width: '100%',
                    margin: '16px 0'
                }}></div>

                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center'
                }}>
                    {!callInProgress ? (
                        <>
                            <Tooltip title="Chấp nhận">
                                <Button
                                    onClick={onAccept}
                                    type="primary"
                                    icon={callType === 'audio' ? <IoIosCall/> : <IoIosVideocam/>}
                                    style={{
                                        borderRadius: '12px',
                                        backgroundColor: '#56cc6e',
                                        width: '48px',
                                        height: '48px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        fontSize: '20px'
                                    }}
                                />
                            </Tooltip>
                            <Tooltip title="Từ chối">
                                <Button
                                    onClick={onReject}
                                    type="primary"
                                    icon={<MdCallEnd/>}
                                    style={{
                                        borderRadius: '12px',
                                        backgroundColor: '#ff5955',
                                        width: '48px',
                                        height: '48px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: 'none',
                                        fontSize: '20px'
                                    }}
                                />
                            </Tooltip>
                        </>
                    ) : (
                        <>
                            <Text style={{color: 'white', fontSize: '24px'}}>{formatTime(callDuration)}</Text>
                            <Row style={{alignItems: 'center', gap: '8px'}}>
                                {callType === 'video' && (
                                    <>
                                        <Tooltip title={videoEnabled ? "Tắt camera" : "Bật camera"}>
                                            <Button
                                                onClick={toggleVideo}
                                                icon={videoEnabled ? <MdVideocam/> : <MdVideocamOff color='#1E3150'/>}
                                                style={{
                                                    backgroundColor: !videoEnabled ? 'white' : '#ffffff1a',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    width: '36px',
                                                    height: '36px',
                                                    fontSize: '20px',
                                                }}
                                            />
                                        </Tooltip>
                                    </>
                                )}

                                <Tooltip title={muted ? "Bật mic" : "Tắt mic"}>
                                    <Button
                                        onClick={toggleMute}
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
                                    />
                                </Tooltip>

                                <Tooltip title="Kết thúc cuộc gọi">
                                    <Button
                                        onClick={onReject}
                                        type="primary"
                                        icon={<MdCallEnd/>}
                                        style={{
                                            borderRadius: '12px',
                                            backgroundColor: '#ff5955',
                                            width: '48px',
                                            height: '48px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: 'none',
                                            fontSize: '20px'
                                        }}
                                    />
                                </Tooltip>
                            </Row>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}

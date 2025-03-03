import React, {useEffect, useRef, useState} from 'react';
import {Button, Modal, Row, Tooltip, Typography} from 'antd';
import {
    IoIosCall,
    IoMdMic,
    IoMdMicOff,
} from 'react-icons/io';
import {IoPersonCircle} from 'react-icons/io5';
import {MdCallEnd, MdVideocam, MdVideocamOff} from 'react-icons/md';

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
                                      localVideoRef,
                                      remoteVideoRef
                                  }: CallModalProps) {
    const [time, setTime] = useState(new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}));
    const [callDuration, setCallDuration] = useState(0);
    const timerInterval = useRef<NodeJS.Timeout | null>(null);

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, "0")}:${secs
            .toString()
            .padStart(2, "0")}`;
    };

    // Cập nhật thời gian hiện tại
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Bộ đếm thời gian cuộc gọi
    useEffect(() => {
        // Bắt đầu đếm thời gian khi cuộc gọi bắt đầu
        if (callInProgress) {
            // Reset thời gian khi bắt đầu cuộc gọi mới
            setCallDuration(0);

            // Tạo interval để cập nhật thời gian cuộc gọi mỗi giây
            timerInterval.current = setInterval(() => {
                setCallDuration(prev => prev + 1);
            }, 1000);
        } else {
            // Dừng đếm thời gian khi cuộc gọi kết thúc
            if (timerInterval.current) {
                clearInterval(timerInterval.current);
                timerInterval.current = null;
            }
        }

        // Cleanup khi component unmount
        return () => {
            if (timerInterval.current) {
                clearInterval(timerInterval.current);
                timerInterval.current = null;
            }
        };
    }, [callInProgress]);

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
            <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                {callType === 'video' && callInProgress && (
                    <div style={{width: '100%', marginBottom: '16px'}}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: '16px'
                        }}>
                            {/* Remote video (larger) */}
                            <div style={{
                                width: '65%',
                                height: '240px',
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

                            {/* Local video (smaller) */}
                            <div style={{
                                width: '35%',
                                height: '240px',
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
                                    Bạn
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Caller info */}
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
                            <IoIosCall style={{fontSize: '20px', marginRight: '8px'}}/>
                            {callInProgress
                                ? `Cuộc gọi ${callType === 'audio' ? 'Audio' : 'Video'} đang diễn ra`
                                : `Đang yêu cầu cuộc gọi ${callType === 'audio' ? 'Audio' : 'Video'}`
                            }
                        </div>
                    </div>
                </div>

                <div style={{
                    height: '1px',
                    backgroundColor: '#283b65',
                    width: '100%',
                    margin: '16px 0'
                }}></div>

                {/* Call controls */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    width: '100%',
                    alignItems: 'center'
                }}>
                    {!callInProgress ? (
                        // Controls when call is not yet accepted
                        <>
                            <Tooltip title="Chấp nhận">
                                <Button
                                    onClick={onAccept}
                                    type="primary"
                                    icon={<IoIosCall/>}
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
                        // Controls during active call
                        <>
                            <Text style={{color: 'white', fontSize: '20px'}}>{formatTime(callDuration)}</Text>
                            <Row style={{alignItems: 'center', gap: '8px'}}>
                                {/* Video toggle button - Only show for video calls */}
                                {callType === 'video' && (
                                    <Tooltip title={videoEnabled ? "Tắt camera" : "Bật camera"}>
                                        <Button
                                            onClick={toggleVideo}
                                            icon={videoEnabled ? <MdVideocam/> : <MdVideocamOff/>}
                                            style={{
                                                backgroundColor: '#ffffff1a',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                width: '40px',
                                                height: '40px',
                                                fontSize: '20px',
                                            }}
                                        >
                                        </Button>
                                    </Tooltip>
                                )}

                                {/* Mute/Unmute button */}
                                <Tooltip title={muted ? "Bật mic" : "Tắt mic"}>
                                    <Button
                                        onClick={toggleMute}
                                        icon={muted ? <IoMdMicOff/> : <IoMdMic/>}
                                        style={{
                                            backgroundColor: '#ffffff1a',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '12px',
                                            width: '40px',
                                            height: '40px',
                                            fontSize: '20px',
                                            marginRight: '16px'
                                        }}
                                    />
                                </Tooltip>

                                {/* End call button */}
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

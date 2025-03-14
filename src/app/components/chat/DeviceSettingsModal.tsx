import React, {useEffect, useState, useRef} from "react";
import {Modal, Select, Button, Divider, Typography, Space, message} from "antd";
import {MdOutlineSettingsInputComposite} from "react-icons/md";
import {IoVideocam, IoMic} from "react-icons/io5";
import {IoMdVolumeHigh} from "react-icons/io";

interface DeviceOption {
    label: string;
    value: string;
}

interface DeviceSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaveSettings: (settings: {
        audioInput: string;
        videoInput: string;
        audioOutput: string;
    }) => void;
    initialSettings?: {
        audioInput?: string;
        videoInput?: string;
        audioOutput?: string;
    };
}

const {Title, Text} = Typography;

const DeviceSettingsModal: React.FC<DeviceSettingsModalProps> = ({
                                                                     isOpen,
                                                                     onClose,
                                                                     onSaveSettings,
                                                                     initialSettings = {},
                                                                 }) => {
    const [audioInputs, setAudioInputs] = useState<DeviceOption[]>([]);
    const [videoInputs, setVideoInputs] = useState<DeviceOption[]>([]);
    const [audioOutputs, setAudioOutputs] = useState<DeviceOption[]>([]);
    const [selectedAudioInput, setSelectedAudioInput] = useState<string>(initialSettings.audioInput || "");
    const [selectedVideoInput, setSelectedVideoInput] = useState<string>(initialSettings.videoInput || "");
    const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>(initialSettings.audioOutput || "");
    const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
    const [audioLevel, setAudioLevel] = useState<number>(0);
    const [permissionsGranted, setPermissionsGranted] = useState<boolean>(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const animationFrameId = useRef<number | null>(null);
    const audioAnalyserRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const modalClosingRef = useRef<boolean>(false);

    const fetchDevices = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({audio: true, video: true});

            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());

            setPermissionsGranted(true);

            const devices = await navigator.mediaDevices.enumerateDevices();

            const mics = devices
                .filter(device => device.kind === "audioinput")
                .map(device => ({
                    label: device.label || `Micro ${device.deviceId.slice(0, 5)}...`,
                    value: device.deviceId,
                }));

            const cameras = devices
                .filter(device => device.kind === "videoinput")
                .map(device => ({
                    label: device.label || `Camera ${device.deviceId.slice(0, 5)}...`,
                    value: device.deviceId,
                }));

            const speakers = devices
                .filter(device => device.kind === "audiooutput")
                .map(device => ({
                    label: device.label || `Loa ${device.deviceId.slice(0, 5)}...`,
                    value: device.deviceId,
                }));

            setAudioInputs(mics);
            setVideoInputs(cameras);
            setAudioOutputs(speakers);

            if (mics.length > 0 && !selectedAudioInput) {
                setSelectedAudioInput(mics[0].value);
            }

            if (cameras.length > 0 && !selectedVideoInput) {
                setSelectedVideoInput(cameras[0].value);
            }

            if (speakers.length > 0 && !selectedAudioOutput) {
                setSelectedAudioOutput(speakers[0].value);
            }
        } catch (error) {
            console.error("Không thể truy cập thiết bị:", error);
            message.error("Không thể truy cập thiết bị. Vui lòng kiểm tra quyền truy cập camera và microphone.");
        }
    };

    const cleanupMediaStream = () => {
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
            animationFrameId.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close().catch(err => console.error("Error closing audio context:", err));
            audioContextRef.current = null;
        }

        audioAnalyserRef.current = null;

        if (previewStream) {
            previewStream.getTracks().forEach(track => {
                track.stop();
            });
            setPreviewStream(null);
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const startPreview = async () => {
        if (modalClosingRef.current) return;

        cleanupMediaStream();

        if (!selectedVideoInput && !selectedAudioInput) return;

        try {
            const constraints: MediaStreamConstraints = {
                audio: selectedAudioInput ? {deviceId: {exact: selectedAudioInput}} : false,
                video: selectedVideoInput ? {deviceId: {exact: selectedVideoInput}} : false,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setPreviewStream(stream);

            if (videoRef.current && stream.getVideoTracks().length > 0) {
                videoRef.current.srcObject = stream;
                videoRef.current.play().catch(err => console.error("Error playing video:", err));
            }

            if (selectedAudioInput && stream.getAudioTracks().length > 0) {
                const audioContext = new AudioContext();
                audioContextRef.current = audioContext;

                const audioSource = audioContext.createMediaStreamSource(stream);
                const analyser = audioContext.createAnalyser();
                audioAnalyserRef.current = analyser;

                analyser.fftSize = 256;
                audioSource.connect(analyser);

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);

                const updateAudioLevel = () => {
                    if (!audioAnalyserRef.current || modalClosingRef.current) return;

                    audioAnalyserRef.current.getByteFrequencyData(dataArray);
                    let sum = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        sum += dataArray[i];
                    }
                    const average = sum / bufferLength;
                    setAudioLevel(average);

                    if (!modalClosingRef.current) {
                        animationFrameId.current = requestAnimationFrame(updateAudioLevel);
                    }
                };

                updateAudioLevel();
            }
        } catch (error) {
            console.error("Không thể khởi tạo preview:", error);
            message.error("Không thể khởi tạo xem trước thiết bị. Vui lòng thử lại.");
        }
    };

    useEffect(() => {
        if (isOpen) {
            modalClosingRef.current = false;
            fetchDevices();
        }

        return () => {
            modalClosingRef.current = true;
            cleanupMediaStream();
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && permissionsGranted && !modalClosingRef.current) {
            startPreview();
        }

        return () => {
            if (!isOpen) {
                modalClosingRef.current = true;
                cleanupMediaStream();
            }
        };
    }, [selectedAudioInput, selectedVideoInput, permissionsGranted, isOpen]);

    const handleClose = () => {
        modalClosingRef.current = true;
        cleanupMediaStream();
        onClose();
    };

    const handleSave = () => {
        modalClosingRef.current = true;
        onSaveSettings({
            audioInput: selectedAudioInput,
            videoInput: selectedVideoInput,
            audioOutput: selectedAudioOutput,
        });
        handleClose();
    };

    const renderAudioLevelDots = () => {
        const totalDots = 20;
        const activeDots = Math.min(Math.floor((audioLevel / 255) * totalDots), totalDots);

        return (
            <div style={{display: 'flex', gap: '4px', justifyContent: 'center', marginTop: '12px'}}>
                {Array.from({length: totalDots}).map((_, index) => (
                    <div
                        key={index}
                        style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: index < activeDots ? '#1890ff' : '#f0f0f0',
                            transition: 'background-color 0.1s ease',
                        }}
                    />
                ))}
            </div>
        );
    };

    return (
        <Modal
            title={
                <div style={{display: "flex", alignItems: "center", gap: "8px"}}>
                    <MdOutlineSettingsInputComposite size={20}/>
                    <span>Cấu hình thiết bị cuộc gọi</span>
                </div>
            }
            open={isOpen}
            onCancel={handleClose}
            footer={[
                <Button key="cancel" onClick={handleClose}>
                    Hủy
                </Button>,
                <Button key="save" type="primary" onClick={handleSave}>
                    Lưu cấu hình
                </Button>,
            ]}
            width={500}
            destroyOnClose={true}
            afterClose={() => {
                modalClosingRef.current = true;
                cleanupMediaStream();
            }}
        >
            <Divider/>

            <Space direction="vertical" size="large" style={{width: "100%"}}>
                <div>
                    <Title level={5} style={{display: "flex", alignItems: "center", gap: "8px"}}>
                        <IoVideocam/> Camera
                    </Title>
                    <Space direction="vertical" style={{width: "100%"}}>
                        <Select
                            placeholder="Chọn camera"
                            style={{width: "100%"}}
                            value={selectedVideoInput || undefined}
                            onChange={setSelectedVideoInput}
                            options={videoInputs}
                        />

                        <div
                            style={{
                                width: "100%",
                                height: "180px",
                                backgroundColor: "#f0f0f0",
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                marginTop: '16px'
                            }}
                        >
                            {selectedVideoInput ? (
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    style={{
                                        transform: 'scaleX(-1)',
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                        objectPosition: "bottom"
                                    }}
                                />
                            ) : (
                                <Text type="secondary">Không có video</Text>
                            )}
                        </div>
                    </Space>
                </div>

                {/* Microphone */}
                <div>
                    <Title level={5} style={{display: "flex", alignItems: "center", gap: "8px"}}>
                        <IoMic/> Microphone
                    </Title>
                    <Space direction="vertical" style={{width: "100%"}}>
                        <Select
                            placeholder="Chọn microphone"
                            style={{width: "100%"}}
                            value={selectedAudioInput || undefined}
                            onChange={setSelectedAudioInput}
                            options={audioInputs}
                        />

                        {renderAudioLevelDots()}
                    </Space>
                </div>

                {/* Speaker */}
                {audioOutputs.length > 0 && (
                    <div>
                        <Title level={5} style={{display: "flex", alignItems: "center", gap: "8px"}}>
                            <IoMdVolumeHigh/> Loa</Title>
                        <Select
                            placeholder="Chọn loa phát ra"
                            style={{width: "100%"}}
                            value={selectedAudioOutput || undefined}
                            onChange={setSelectedAudioOutput}
                            options={audioOutputs}
                        />
                    </div>
                )}
            </Space>

            <Divider/>

            <Text type="secondary">
                Thay đổi thiết bị sẽ có hiệu lực trong các cuộc gọi tiếp theo. Nếu đang trong cuộc gọi, vui lòng kết
                thúc và thực hiện cuộc gọi mới.
            </Text>
        </Modal>
    );
};

export default DeviceSettingsModal;

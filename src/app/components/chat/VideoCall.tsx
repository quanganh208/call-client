import React from "react";

interface VideoCallProps {
  localAudioRef: React.RefObject<HTMLAudioElement | null>;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  height?: string;
}

export function VideoCall({
  localAudioRef,
  remoteAudioRef,
  localVideoRef,
  remoteVideoRef,
  height = "400px",
}: VideoCallProps) {
  return (
    <div
      style={{
        flex: 1,
        height: height,
        position: "relative",
        backgroundColor: "#f0f0f0",
        borderRadius: "8px",
      }}
    >
      <audio
        ref={localAudioRef as React.RefObject<HTMLAudioElement>}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />
      <audio
        ref={remoteAudioRef as React.RefObject<HTMLAudioElement>}
        autoPlay
        playsInline
        style={{ display: "none" }}
      />
      <video
        ref={remoteVideoRef as React.RefObject<HTMLVideoElement>}
        autoPlay
        playsInline
        style={{
          transform: "scaleX(-1)",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <video
        ref={localVideoRef as React.RefObject<HTMLVideoElement>}
        autoPlay
        playsInline
        muted
        style={{
          transform: "scaleX(-1)",
          position: "absolute",
          width: "120px",
          height: "90px",
          bottom: "16px",
          right: "16px",
          objectFit: "cover",
          borderRadius: "8px",
          border: "2px solid white",
          backgroundColor: "#e6e6e6",
          zIndex: 2,
        }}
      />
    </div>
  );
}

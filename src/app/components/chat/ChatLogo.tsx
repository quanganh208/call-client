import { Avatar, Typography } from "antd";

interface ChatLogoProps {
  width?: string;
  height?: string;
}

export function ChatLogo({ width, height }: ChatLogoProps) {
  const { Text } = Typography;

  return (
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
      icon={<Text style={{ color: "white" }}>C</Text>}
    />
  );
}

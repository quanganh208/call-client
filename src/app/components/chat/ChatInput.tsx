import {Input, Typography} from "antd";
import {SmileOutlined} from "@ant-design/icons";
import {FiPaperclip, FiSend} from "react-icons/fi";
import {ChatLogo} from "./ChatLogo";

interface ChatInputProps {
    onFocus: () => void;
}

export function ChatInput({onFocus}: ChatInputProps) {
    const {Text} = Typography;

    return (
        <div
            style={{
                padding: "8px 16px",
                background: "#f5f6fa",
                borderTop: "1px solid #f0f0f0",
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
                <ChatLogo width="16px" height="16px"/>
                <Text style={{fontSize: "12px", color: "#1e3150", opacity: 0.6}}>
                    Tích hợp miễn phí{" "}
                    <Text style={{color: "#00b1ff", fontSize: "12px"}}>
                        DSS LiveTalk
                    </Text>{" "}
                    vào website của bạn
                </Text>
            </div>

            <Input
                onFocus={onFocus}
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
    );
}

'use client';
import {FloatButton} from "antd";
import {FaPhoneAlt} from "react-icons/fa";
import {useState, useRef, useEffect} from "react";
import {CSSProperties} from "react";
import ChatWindow from "./components/chat-window";

export default function Home() {
    const [isVisible, setIsVisible] = useState(false);
    const [animationReady, setAnimationReady] = useState(false);
    const buttonRef = useRef<HTMLDivElement>(null);
    const [buttonPosition, setButtonPosition] = useState<{ right: number; bottom: number } | null>(null);

    useEffect(() => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setButtonPosition({
                right: window.innerWidth - rect.right,
                bottom: window.innerHeight - rect.top
            });
            setAnimationReady(true);
        }
    }, []);

    const handleOpen = () => {
        setIsVisible(true);
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    const getAnimationStyles = (): CSSProperties => {
        if (!buttonPosition) return {};

        if (!animationReady && !isVisible) {
            return {
                display: 'none'
            };
        }

        return {
            opacity: isVisible ? 1 : 0,
            transform: isVisible
                ? 'scale(1) translate(0, 0)'
                : `scale(0.2) translate(${buttonPosition.right / 5}px, ${buttonPosition.bottom / 5}px)`,
            transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
            pointerEvents: isVisible ? 'auto' : 'none'
        };
    };

    return (
        <div>
            <main>
                <div>Màn hình khách hàng</div>

                <div
                    ref={buttonRef}
                    style={{
                        opacity: isVisible ? 0 : 1,
                        transition: 'opacity 0.2s',
                        position: 'fixed',
                        right: '24px',
                        bottom: '24px'
                    }}
                >
                    <FloatButton
                        icon={<FaPhoneAlt/>}
                        onClick={handleOpen}
                    />
                </div>

                {(animationReady || isVisible) && (
                    <div style={{
                        position: 'fixed',
                        bottom: 0,
                        right: 0,
                        zIndex: 1000,
                        ...getAnimationStyles()
                    }}>
                        <ChatWindow onCloseChatWindow={handleClose}/>
                    </div>
                )}
            </main>
        </div>
    );
}

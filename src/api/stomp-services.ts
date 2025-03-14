import {Client} from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {Message} from "@/types/chat";

class StompService {
    private client;
    private onMessageCallback: (message: Message) => void = () => {
    };
    private connected: boolean = false;

    public constructor(chatGroupId: string) {
        this.client = new Client({
            webSocketFactory: () => new SockJS(`${process.env.NEXT_PUBLIC_CHAT_SERVER}/ws`),
            debug: (str: string) => console.log('STOMP Debug:', str),

            onConnect: () => {
                console.log('STOMP Connected');
                this.connected = true;
                this.client.subscribe(`/user/${chatGroupId}/messages`, message => {
                    const parsedMessage = JSON.parse(message.body);
                    console.log('Received message:', parsedMessage);
                    this.onMessageCallback(parsedMessage);
                });
            },
            onStompError: frame => {
                console.log('STOMP Error:', frame.headers.message);
                this.connected = false;
            },
            onWebSocketClose: () => {
                console.log('STOMP Disconnected');
                this.connected = false;
            },
        });
    }

    public connect = () => {
        this.client.activate();
    };

    public isConnected = () => {
        return this.connected;
    };

    public disconnect = () => {
        this.client.deactivate();
    };

    public setOnMessageCallback = (callback: (message: Message) => void) => {
        this.onMessageCallback = callback;
    };

    public sendMessage = (param: Message) => {
        if (this.isConnected()) {
            this.client.publish({
                destination: '/app/message',
                body: JSON.stringify(param),
            });
        } else {
            console.error('STOMP connection not established');
        }
    };
}

export default StompService;

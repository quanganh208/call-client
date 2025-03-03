import {Button, Modal} from "antd";
import {IoIosCall} from "react-icons/io";
import {IoPersonCircle} from "react-icons/io5";
import {MdCallEnd} from "react-icons/md";

interface CallModalProps {
    visible: boolean;
    name?: string;
    time: string;
    callType: 'audio' | 'video';
}

export default function CallModal({visible, name, time, callType}: CallModalProps) {
    return (<Modal
        open={visible}
        footer={null}
        closable={false}
        centered
        width={360}
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
            <div style={{display: 'flex', marginBottom: '8px', width: '100%'}}>
                <IoPersonCircle size={36} color='white'/>
                <div style={{marginLeft: '8px'}}>
                    <div style={{color: '#b0b8c8', fontSize: '12px'}}>{name || 'Không xác định'}, {time}</div>
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
                        Đang yêu cầu cuộc gọi {callType === 'audio' ? 'Audio' : 'Video'}
                    </div>
                </div>
            </div>

            <div style={{
                height: '1px',
                backgroundColor: '#283b65',
                width: '100%',
                margin: '16px 0'
            }}></div>

            <div style={{display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%'}}>
                <Button
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

                <Button
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
            </div>
        </div>
    </Modal>)
}

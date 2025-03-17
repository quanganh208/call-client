import {useState} from 'react';
import {Button, Card, Form, Input, Typography} from "antd";
import chatAPI from "@/api/chat-services";
import {UserInformation} from "@/types/chat";

interface UserInformationFormProps {
  onClose: () => void;
  onSubmit: (info: UserInformation) => void;
}

export default function UserInformationForm({onClose, onSubmit}: UserInformationFormProps) {
  const {Text} = Typography;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: UserInformation) => {
    try {
      setLoading(true);
      const response = await chatAPI.HandleCreateChatGroup(values.SocialName, values.Phone, values.Email);
      onSubmit(response);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLater = () => {
    form.resetFields();
    onClose();
  };

  return (
    <div
      style={{
        backgroundColor: 'rgba(30, 49, 80, 0.6)',
        borderRadius: '24px',
        width: '100%',
        height: '100%',
        position: 'absolute',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        zIndex: 2
      }}
    >
      <Card styles={{body: {padding: '16px'}}} style={{width: '93%', margin: '16px'}}>
        <Text style={{fontSize: '15px', display: 'block', marginBottom: '8px'}}>
          Vui lòng cho chúng tôi biết thêm một số thông tin của Quý Khách
        </Text>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="SocialName"
            label={<Text strong>Tên đầy đủ</Text>}
            rules={[{required: true, message: 'Vui lòng nhập tên đầy đủ'}]}
            style={{marginBottom: '16px'}}
          >
            <Input
              placeholder="Nhập tên đầy đủ"
              style={{
                borderRadius: '8px',
                padding: '8px 12px',
                backgroundColor: '#f5f7fa'
              }}
            />
          </Form.Item>

          <Form.Item
            name="Phone"
            label={<Text strong>Số điện thoại</Text>}
            rules={[{required: true, message: 'Vui lòng nhập số điện thoại'}]}
            style={{marginBottom: '16px'}}
          >
            <Input
              placeholder="Nhập số điện thoại"
              style={{
                borderRadius: '8px',
                padding: '8px 12px',
                backgroundColor: '#f5f7fa'
              }}
            />
          </Form.Item>

          <Form.Item
            name="Email"
            label={<Text strong>Email</Text>}
            rules={[{required: true, message: 'Vui lòng nhập email'}]}
            style={{marginBottom: '24px'}}
          >
            <Input
              placeholder="Nhập email"
              style={{
                borderRadius: '8px',
                padding: '8px 12px',
                backgroundColor: '#f5f7fa'
              }}
            />
          </Form.Item>

          <div style={{display: 'flex', gap: '12px'}}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              style={{
                backgroundColor: '#1E3150',
                borderRadius: '8px',
                padding: '8px 16px',
                height: 'auto',
                flex: 1
              }}
            >
              Gửi thông tin
            </Button>

            <Button
              onClick={handleLater}
              style={{
                borderRadius: '8px',
                padding: '8px 16px',
                height: 'auto',
                border: '1px solid #E0E0E0',
                color: '#666666'
              }}
            >
              Để sau
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}

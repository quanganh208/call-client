import axiosService from "@/api/axios-service";

class ChatApi {
    private HandleChatApi = async (
        url: string,
        method?: 'get' | 'post' | 'put' | 'delete',
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        headers?: any,
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        data?: any,
    ) => {
        return await axiosService(`/api${url}`, {
            baseURL: process.env.NEXT_PUBLIC_CHAT_SERVER,
            headers: {
                Accept: 'application/json',
                ...headers,
            },
            method: method ?? 'get',
            data,
        });
    };

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async HandleCreateChatGroup(name: string, phone: string, email: string): Promise<any> {
        return await this.HandleChatApi(
            '/chatgroup/create-user',
            'post',
            {
                'Content-Type': 'application/json',
            },
            {
                name,
                phone,
                email
            },
        );
    }
}

const chatAPI = new ChatApi();
export default chatAPI;

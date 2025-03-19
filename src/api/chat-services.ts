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
  async HandleCreateChatGroup(name: string, phone: string, email: string): Promise<any> {
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

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  async HandleGetHistoryMessage(chatGroupId: string, page: number): Promise<any> {
    return await this.HandleChatApi(
      `/chat/history/${chatGroupId}?page=${page}`,
    );
  }

  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  async HandleUploadFile(adClientId: string, adOrgId: string, adUserId: string, cmChatGroupId: string, file: File, socialName: string): Promise<any> {
    const formData = new FormData();
    formData.append('adClientId', adClientId);
    formData.append('adOrgId', adOrgId);
    formData.append('adUserId', adUserId);
    formData.append('cmChatGroupId', cmChatGroupId);
    formData.append('file', file);
    formData.append('socialName', socialName);

    return await this.HandleChatApi(
      '/chat/upload',
      'post',
      {
        'Content-Type': 'multipart/form-data',
      },
      formData,
    );
  }
}

const chatAPI = new ChatApi();
export default chatAPI;

export interface UserInformation {
  name: string;
  phone: string;
  email: string;
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  response?: any;
}

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: string;
  type: "text" | "file";
  fileInfo?: {
    fileName: string;
    fileType: string;
    fileSize: string;
    fileUrl: string;
  };
}

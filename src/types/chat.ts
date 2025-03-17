interface CmInteractiveChanel {
  id: number
  Name: string
  BotID: string
  BotAvatar: string
}

interface CmSocialChanel {
  id: number
  Name: string
}

interface CmCustomer {
  id: number
  Name: string
}

interface AdUser {
  id: number
  Value: string
  Name: string
  ImageURL: string
}

export interface UserInformation {
  AD_Client_ID: number
  AD_Org_ID: number
  CM_ChatGroup_ID: number
  Created: string
  CreatedBy: number
  Updated: string
  UpdatedBy: number
  ConversationID: string
  SocialName: string
  UserID: string
  ContentText: string
  Avatar: string
  IsActive: boolean
  Phone: string
  Email: string
  CM_InteractiveChanel_ID: number
  CM_Tag_ID: string
  DataType: string
  CM_InteractiveChanel: CmInteractiveChanel
  CM_SocialChanel: CmSocialChanel
  CM_Customer: CmCustomer
  AD_User: AdUser
}

export interface Message {
  cmChatId?: number
  adClientId: number
  adOrgId: number
  contentText: string
  created?: string
  createdBy?: number
  isActive?: string
  isDeleted?: string
  updated?: string
  updatedBy?: number
  dataType: string
  isReceive?: string
  socialName?: string
  cmChatGroupId: number
  adUserId: number
  file?: string
  istatus?: number
  status?: 'sending' | 'sent' | 'error'
}

// Tipos principales del sistema

export interface IConfig {
  id: string;
  key: string;
  value: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAIModel {
  id: string;
  modelId: string;
  name: string;
  provider: string;
  contextSize?: number;
  isActive: boolean;
  isAvailable: boolean;
}

export interface ISocialConnection {
  id: string;
  platform: 'whatsapp' | 'facebook' | 'instagram' | 'telegram' | 'tiktok';
  name: string;
  accessToken?: string;
  apiKey?: string;
  apiSecret?: string;
  phoneNumber?: string;
  phoneNumberId?: string;
  pageId?: string;
  botToken?: string;
  verifyToken?: string;
  webhookUrl?: string;
  isActive: boolean;
  config?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversation {
  id: string;
  externalId: string;
  name?: string;
  phone?: string;
  username?: string;
  platform: string;
  platformUserId?: string;
  status: 'active' | 'closed' | 'archived';
  leadStatus: 'new' | 'interested' | 'qualified' | 'customer' | 'lost';
  leadScore: number;
  tags?: string[];
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageDir?: 'incoming' | 'outgoing';
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  socialConnectionId?: string;
  messages?: IMessage[];
  lead?: ILead;
}

export interface IMessage {
  id: string;
  conversationId: string;
  externalId?: string;
  content: string;
  direction: 'incoming' | 'outgoing';
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  mediaUrl?: string;
  metadata?: Record<string, unknown>;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  isFromBot: boolean;
  createdAt: Date;
}

export interface ILead {
  id: string;
  conversationId: string;
  name?: string;
  email?: string;
  phone?: string;
  interest?: string;
  score: number;
  stage: 'awareness' | 'consideration' | 'decision' | 'purchase';
  source?: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Tipos para flujos tipo n8n
export type NodeType = 'trigger' | 'message' | 'condition' | 'action' | 'delay' | 'ai' | 'webhook';

export interface IFlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    config: Record<string, unknown>;
  };
}

export interface IFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: Record<string, unknown>;
}

export interface IFlow {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  triggerType: 'webhook' | 'message' | 'keyword' | 'schedule';
  triggerConfig?: Record<string, unknown>;
  nodes: IFlowNode[];
  edges: IFlowEdge[];
  executionCount: number;
  lastExecuted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFlowExecution {
  id: string;
  flowId: string;
  status: 'running' | 'completed' | 'failed';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  duration?: number;
  createdAt: Date;
}

export interface IKnowledgeBase {
  id: string;
  title: string;
  content: string;
  category?: string;
  keywords?: string[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
  variables?: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Chat types
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
  platform?: string;
  userId?: string;
}

export interface ChatResponse {
  response: string;
  leadStatus?: string;
  leadScore?: number;
}

// Dashboard stats
export interface DashboardStats {
  totalConversations: number;
  activeConversations: number;
  totalLeads: number;
  newLeads: number;
  interestedLeads: number;
  qualifiedLeads: number;
  customerLeads: number;
  totalMessages: number;
  messagesToday: number;
  avgResponseTime?: number;
}

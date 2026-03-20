'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  MessageSquare, Users, Settings, Zap, Database, Send, Plus, Trash2, Edit, Play, Pause,
  Bot, Phone, Mail, User, Clock, CheckCircle, AlertCircle, ChevronRight,
  LayoutDashboard, MessageCircle, RefreshCw, Copy, Brain, Webhook, Info, Share2,
  Moon, Sun, Heart, Activity, Stethoscope, Contact, FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Types
interface Message {
  id: string;
  content: string;
  direction: 'incoming' | 'outgoing';
  messageType: string;
  isFromBot: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  externalId: string;
  name: string | null;
  phone: string | null;
  email?: string | null;
  platform: string;
  status: string;
  leadStatus: string;
  leadScore: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageDir: string | null;
  unreadCount: number;
  messages?: Message[];
}

interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  platform: string;
  conversationId: string;
  createdAt: string;
}

interface Lead {
  id: string;
  conversationId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  score: number;
  stage: string;
  notes: string | null;
  conversation?: Conversation;
}

interface GroqKey {
  id: string;
  name: string;
  apiKey: string;
  url: string;
  model: string;
  isActive: boolean;
  createdAt: string;
}

interface SocialConnection {
  id: string;
  platform: string;
  name: string;
  isActive: boolean;
  webhookUrl: string | null;
  verifyToken: string | null;
}

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string | null;
  priority: number;
  isActive: boolean;
}

interface Flow {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  nodes: unknown[];
  edges: unknown[];
  executionCount: number;
}

type ViewType = 'dashboard' | 'conversations' | 'contacts' | 'leads' | 'flows' | 'knowledge' | 'settings';

// Get platform icon
const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'whatsapp': return <Phone className="h-4 w-4" />;
    case 'facebook': return <MessageSquare className="h-4 w-4" />;
    case 'instagram': return <MessageSquare className="h-4 w-4" />;
    case 'telegram': return <Send className="h-4 w-4" />;
    case 'tiktok': return <Share2 className="h-4 w-4" />;
    default: return <MessageSquare className="h-4 w-4" />;
  }
};

// Get lead status badge
const getLeadStatusBadge = (status: string, isDark: boolean) => {
  const variants: Record<string, { bg: string; text: string }> = {
    new: { bg: isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800', text: 'Nuevo' },
    interested: { bg: isDark ? 'bg-teal-900 text-teal-200' : 'bg-teal-100 text-teal-800', text: 'Interesado' },
    qualified: { bg: isDark ? 'bg-amber-900 text-amber-200' : 'bg-amber-100 text-amber-800', text: 'Calificado' },
    customer: { bg: isDark ? 'bg-emerald-900 text-emerald-200' : 'bg-emerald-100 text-emerald-800', text: 'Cliente' },
    lost: { bg: isDark ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-800', text: 'Perdido' },
  };
  const v = variants[status] || variants.new;
  return <Badge className={v.bg}>{v.text}</Badge>;
};

// Main Component
export default function SalesAutomationApp() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Data states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [flows, setFlows] = useState<Flow[]>([]);

  // Config states
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [groqKeys, setGroqKeys] = useState<GroqKey[]>([]);
  const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([]);
  const [newKeyName, setNewKeyName] = useState('');

  // UI states
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [testMessage, setTestMessage] = useState('');

  // Dialog states
  const [showApiDialog, setShowApiDialog] = useState(false);
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [showKnowledgeDialog, setShowKnowledgeDialog] = useState(false);
  const [showFlowDialog, setShowFlowDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);

  // New item states
  const [newConnection, setNewConnection] = useState({ platform: 'whatsapp', name: '', accessToken: '', botToken: '', phoneNumberId: '' });
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', category: 'curso', priority: 0 });
  const [newFlow, setNewFlow] = useState({ name: '', description: '', triggerType: 'message' });
  const [newContact, setNewContact] = useState({ name: '', phone: '', email: '', platform: 'telegram' });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Toggle dark mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Fetch functions
  const fetchData = useCallback(async () => {
    try {
      const [groqKeysRes, convRes, leadsRes, socialRes, knowRes, flowsRes] = await Promise.all([
        fetch('/api/groq-keys'),
        fetch('/api/conversations'),
        fetch('/api/leads'),
        fetch('/api/social'),
        fetch('/api/knowledge'),
        fetch('/api/flows'),
      ]);

      const [groqKeysData, convData, leadsData, socialData, knowData, flowsData] = await Promise.all([
        groqKeysRes.json(),
        convRes.json(),
        leadsRes.json(),
        socialRes.json(),
        knowRes.json(),
        flowsRes.json(),
      ]);

      if (groqKeysData.success) {
        setGroqKeys(groqKeysData.keys);
        const activeKey = groqKeysData.keys.find((k: GroqKey) => k.isActive);
        setHasApiKey(!!activeKey);
        setActiveModel(activeKey?.model || null);
        if (groqKeysData.providers?.openrouter?.freeModels) {
          setAvailableModels(groqKeysData.providers.openrouter.freeModels);
        }
      }
      if (convData.success) {
        setConversations(convData.data);
        // Extraer contactos de las conversaciones
        const uniqueContacts: Contact[] = [];
        convData.data.forEach((conv: Conversation) => {
          if (conv.name || conv.phone || conv.email) {
            uniqueContacts.push({
              id: conv.id,
              name: conv.name,
              phone: conv.phone,
              email: conv.email,
              platform: conv.platform,
              conversationId: conv.id,
              createdAt: conv.lastMessageAt || new Date().toISOString(),
            });
          }
        });
        setContacts(uniqueContacts);
      }
      if (leadsData.success) setLeads(leadsData.data);
      if (socialData.success) setSocialConnections(socialData.data);
      if (knowData.success) setKnowledge(knowData.data);
      if (flowsData.success) setFlows(flowsData.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Save API Key
  const saveGroqKey = async () => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const res = await fetch('/api/groq-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName || 'Mi API', apiKey }),
      });
      const data = await res.json();
      if (data.success) {
        setHasApiKey(true);
        setShowApiDialog(false);
        setAvailableModels(data.availableModels || []);
        setApiKey('');
        setNewKeyName('');
        fetchData();
      } else {
        alert(data.error || 'Error al guardar API key');
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('Error al verificar la API key');
    }
    setLoading(false);
  };

  // Delete API Key
  const deleteGroqKey = async (keyId: string) => {
    if (!confirm('¿Estás seguro de eliminar esta API key?')) return;
    try {
      const res = await fetch('/api/groq-keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId }),
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      console.error('Error deleting key:', error);
    }
  };

  // Activate API Key
  const activateGroqKey = async (keyId: string) => {
    try {
      const res = await fetch('/api/groq-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, isActive: true }),
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      console.error('Error activating key:', error);
    }
  };

  // Change model
  const changeKeyModel = async (keyId: string, model: string) => {
    try {
      const res = await fetch('/api/groq-keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId, model }),
      });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      console.error('Error changing model:', error);
    }
  };

  // Fetch conversation messages
  const fetchConversationMessages = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      const data = await res.json();
      if (data.success) setSelectedConversation(data.data);
    } catch (error) {
      console.error('Error fetching conversation:', error);
    }
  };

  // Test chat
  const testChat = async () => {
    if (!testMessage.trim()) return;
    setLoading(true);
    const userMsg = testMessage;
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setTestMessage('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: chatMessages }),
      });
      const data = await res.json();
      if (data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        alert(data.error || 'Error al obtener respuesta');
      }
    } catch (error) {
      console.error('Error in chat:', error);
      alert('Error al conectar con el servidor');
    }
    setLoading(false);
  };

  // Create knowledge
  const createKnowledge = async () => {
    try {
      const res = await fetch('/api/knowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKnowledge),
      });
      const data = await res.json();
      if (data.success) {
        setShowKnowledgeDialog(false);
        fetchData();
        setNewKnowledge({ title: '', content: '', category: 'curso', priority: 0 });
      }
    } catch (error) {
      console.error('Error creating knowledge:', error);
    }
  };

  // Delete knowledge
  const deleteKnowledge = async (id: string) => {
    if (!confirm('¿Eliminar este artículo?')) return;
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) fetchData();
    } catch (error) {
      console.error('Error deleting knowledge:', error);
    }
  };

  // Create flow
  const createFlow = async () => {
    try {
      const res = await fetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFlow,
          nodes: [{ id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Inicio', config: {} } }],
          edges: [],
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowFlowDialog(false);
        fetchData();
        setNewFlow({ name: '', description: '', triggerType: 'message' });
      }
    } catch (error) {
      console.error('Error creating flow:', error);
    }
  };

  // Toggle flow
  const toggleFlow = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/flows/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling flow:', error);
    }
  };

  // Update lead status
  const updateLeadStatus = async (id: string, stage: string) => {
    try {
      await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      fetchData();
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  // Stats
  const stats = {
    totalConversations: conversations.length,
    activeConversations: conversations.filter(c => c.status === 'active').length,
    totalLeads: leads.length,
    totalContacts: contacts.length,
    newLeads: leads.filter(l => l.stage === 'awareness').length,
    interestedLeads: leads.filter(l => l.stage === 'consideration').length,
    qualifiedLeads: leads.filter(l => l.stage === 'decision').length,
    customerLeads: leads.filter(l => l.stage === 'purchase').length,
    activeConnections: socialConnections.filter(c => c.isActive).length,
    activeFlows: flows.filter(f => f.isActive).length,
  };

  // Sidebar items
  const sidebarItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'conversations', icon: MessageCircle, label: 'Conversaciones' },
    { id: 'contacts', icon: Contact, label: 'Contactos' },
    { id: 'leads', icon: Users, label: 'Leads' },
    { id: 'flows', icon: Zap, label: 'Flujos' },
    { id: 'knowledge', icon: Database, label: 'Conocimiento' },
    { id: 'settings', icon: Settings, label: 'Configuración' },
  ];

  // RENDER DASHBOARD
  const renderDashboard = () => (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-500/10 rounded-lg">
            <Stethoscope className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-teal-700 dark:text-teal-300">Panel de Control</h1>
            <p className="text-sm text-muted-foreground">Sistema de Automatización para Cursos Médicos</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setDarkMode(!darkMode)}
          className="ml-auto"
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-teal-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Conversaciones Activas
            </CardDescription>
            <CardTitle className="text-3xl text-teal-600 dark:text-teal-400">{stats.activeConversations}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">de {stats.totalConversations} totales</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Contact className="h-4 w-4" />
              Contactos
            </CardDescription>
            <CardTitle className="text-3xl text-blue-600 dark:text-blue-400">{stats.totalContacts}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">usuarios registrados</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Leads
            </CardDescription>
            <CardTitle className="text-3xl text-emerald-600 dark:text-emerald-400">{stats.totalLeads}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={(stats.interestedLeads / Math.max(stats.totalLeads, 1)) * 100} className="h-2" />
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Automatizaciones
            </CardDescription>
            <CardTitle className="text-3xl text-purple-600 dark:text-purple-400">{stats.activeFlows}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">flujos activos</div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-500" />
            Embudo de Leads
          </CardTitle>
          <CardDescription>Distribución de leads por etapa del proceso de venta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { label: 'Concienciación', count: stats.newLeads, color: 'bg-slate-400' },
              { label: 'Consideración', count: stats.interestedLeads, color: 'bg-teal-400' },
              { label: 'Decisión', count: stats.qualifiedLeads, color: 'bg-amber-400' },
              { label: 'Compra', count: stats.customerLeads, color: 'bg-emerald-500' },
            ].map((stage, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="w-28 text-sm font-medium">{stage.label}</span>
                <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full ${stage.color} transition-all rounded-full`}
                    style={{ width: `${(stage.count / Math.max(stats.totalLeads, 1)) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-bold">{stage.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Test Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-teal-500" />
            Probar Chat con IA
          </CardTitle>
          <CardDescription>Prueba el comportamiento del bot antes de activarlo</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasApiKey ? (
            <Alert className="border-teal-200 dark:border-teal-800">
              <AlertCircle className="h-4 w-4 text-teal-500" />
              <AlertDescription>
                Configura tu API key (OpenRouter o Groq) en <strong>Configuración</strong> para usar el chat.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="h-64 border rounded-lg p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Heart className="h-12 w-12 mx-auto mb-3 text-teal-500/30" />
                    <p>Envía un mensaje para probar el bot</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${
                            msg.role === 'user'
                              ? 'bg-teal-600 text-white'
                              : 'bg-white dark:bg-slate-800 shadow-sm border'
                          }`}
                        >
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && testChat()}
                  className="flex-1"
                />
                <Button onClick={testChat} disabled={loading} className="bg-teal-600 hover:bg-teal-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // RENDER CONVERSATIONS
  const renderConversations = () => (
    <div className="flex h-full">
      {/* Conversations List */}
      <div className="w-80 border-r bg-slate-50 dark:bg-slate-900 flex flex-col">
        <div className="p-4 border-b bg-white dark:bg-slate-800 shrink-0">
          <h2 className="font-semibold">Conversaciones</h2>
          <div className="flex items-center gap-2 mt-2">
            <Input placeholder="Buscar..." className="h-8" />
            <Button size="icon" variant="ghost" onClick={fetchData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No hay conversaciones aún
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => fetchConversationMessages(conv.id)}
                  className={`w-full p-4 text-left hover:bg-white dark:hover:bg-slate-800 transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-white dark:bg-slate-800 border-l-4 border-teal-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {getPlatformIcon(conv.platform)}
                    <span className="font-medium truncate">{conv.name || conv.phone || 'Sin nombre'}</span>
                    {conv.unreadCount > 0 && (
                      <Badge className="bg-teal-500">{conv.unreadCount}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {conv.lastMessage}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {getLeadStatusBadge(conv.leadStatus, darkMode)}
                    <span className="text-xs text-muted-foreground">Score: {conv.leadScore}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b bg-white dark:bg-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {getPlatformIcon(selectedConversation.platform)}
                <div>
                  <h3 className="font-medium">{selectedConversation.name || selectedConversation.phone || 'Sin nombre'}</h3>
                  <p className="text-sm text-muted-foreground">{selectedConversation.platform}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getLeadStatusBadge(selectedConversation.leadStatus, darkMode)}
                <Badge variant="outline">Score: {selectedConversation.leadScore}</Badge>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto">
              <div className="space-y-4">
                {selectedConversation.messages?.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.direction === 'incoming' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg px-4 py-2 ${
                        msg.direction === 'incoming'
                          ? 'bg-slate-100 dark:bg-slate-800'
                          : msg.isFromBot
                          ? 'bg-teal-100 dark:bg-teal-900 text-teal-900 dark:text-teal-100'
                          : 'bg-teal-600 text-white'
                      }`}
                    >
                      {msg.isFromBot && (
                        <div className="flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 mb-1">
                          <Bot className="h-3 w-3" />
                          <span>IA</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t bg-white dark:bg-slate-800 shrink-0">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="min-h-[60px]"
                />
                <Button className="bg-teal-600 hover:bg-teal-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // RENDER CONTACTS
  const renderContacts = () => (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-teal-700 dark:text-teal-300">Contactos</h1>
          <p className="text-muted-foreground">Personas que han escrito al bot</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => setShowContactDialog(true)} className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </div>
      </div>

      {contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Contact className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="font-medium mb-2">No hay contactos registrados</h3>
            <p className="text-muted-foreground mb-4">
              Los contactos se registran automáticamente cuando alguien escribe al bot.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map(contact => (
            <Card key={contact.id} className="border-l-4 border-l-teal-500">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{contact.name || 'Sin nombre'}</CardTitle>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getPlatformIcon(contact.platform)}
                    {contact.platform}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{contact.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Registrado: {new Date(contact.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // RENDER LEADS
  const renderLeads = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-teal-700 dark:text-teal-300">Leads CRM</h1>
          <p className="text-muted-foreground">Gestión de prospects y oportunidades</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {leads.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No hay leads aún. Los leads se crean automáticamente cuando hay conversaciones.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">Nombre</th>
                    <th className="text-left p-4 font-medium">Contacto</th>
                    <th className="text-left p-4 font-medium">Interés</th>
                    <th className="text-left p-4 font-medium">Score</th>
                    <th className="text-left p-4 font-medium">Etapa</th>
                    <th className="text-left p-4 font-medium">Fuente</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {leads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                            <User className="h-4 w-4 text-teal-600" />
                          </div>
                          <span className="font-medium">{lead.name || 'Sin nombre'}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm space-y-1">
                          {lead.email && <div className="flex items-center gap-1"><Mail className="h-3 w-3" />{lead.email}</div>}
                          {lead.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</div>}
                        </div>
                      </td>
                      <td className="p-4 text-sm">{lead.interest || '-'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Progress value={lead.score} className="w-16 h-2" />
                          <span className="text-sm font-medium">{lead.score}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Select value={lead.stage} onValueChange={v => updateLeadStatus(lead.id, v)}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="awareness">Concienciación</SelectItem>
                            <SelectItem value="consideration">Consideración</SelectItem>
                            <SelectItem value="decision">Decisión</SelectItem>
                            <SelectItem value="purchase">Compra</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {lead.conversation && getPlatformIcon(lead.conversation.platform)}
                          <span className="text-sm">{lead.conversation?.platform || '-'}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // RENDER FLOWS
  const renderFlows = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-teal-700 dark:text-teal-300">Flujos de Automatización</h1>
          <p className="text-muted-foreground">Crea respuestas automáticas y procesos</p>
        </div>
        <Dialog open={showFlowDialog} onOpenChange={setShowFlowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Flujo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Flujo</DialogTitle>
              <DialogDescription>Crea un flujo de automatización para procesar mensajes automáticamente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nombre</Label>
                <Input
                  value={newFlow.name}
                  onChange={e => setNewFlow({ ...newFlow, name: e.target.value })}
                  placeholder="Ej: Respuesta automática de bienvenida"
                />
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea
                  value={newFlow.description}
                  onChange={e => setNewFlow({ ...newFlow, description: e.target.value })}
                  placeholder="Describe qué hace este flujo..."
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Trigger</Label>
                <Select value={newFlow.triggerType} onValueChange={v => setNewFlow({ ...newFlow, triggerType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="message">Mensaje Recibido</SelectItem>
                    <SelectItem value="keyword">Palabra Clave</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="schedule">Programado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFlowDialog(false)}>Cancelar</Button>
              <Button onClick={createFlow} disabled={!newFlow.name} className="bg-teal-600 hover:bg-teal-700">Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {flows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="font-medium mb-2">No hay flujos creados</h3>
            <p className="text-muted-foreground mb-4">Crea tu primer flujo de automatización.</p>
            <Button onClick={() => setShowFlowDialog(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" /> Crear Flujo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {flows.map(flow => (
            <Card key={flow.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{flow.name}</CardTitle>
                    <CardDescription>{flow.description || 'Sin descripción'}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{flow.triggerType}</Badge>
                    <Switch checked={flow.isActive} onCheckedChange={v => toggleFlow(flow.id, v)} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Play className="h-4 w-4" /> {flow.executionCount} ejecuciones</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {(flow.nodes as unknown[])?.length || 0} nodos</span>
                  </div>
                  <Button size="sm" variant="outline"><Edit className="h-4 w-4 mr-1" /> Editar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // RENDER KNOWLEDGE
  const renderKnowledge = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-teal-700 dark:text-teal-300">Base de Conocimiento</h1>
          <p className="text-muted-foreground">Información que el bot usa para responder</p>
        </div>
        <Dialog open={showKnowledgeDialog} onOpenChange={setShowKnowledgeDialog}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Artículo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Añadir Conocimiento</DialogTitle>
              <DialogDescription>Añade información sobre cursos, precios, horarios, etc.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={newKnowledge.title} onChange={e => setNewKnowledge({ ...newKnowledge, title: e.target.value })} placeholder="Ej: Curso de Cardiología Avanzada" />
              </div>
              <div className="space-y-2">
                <Label>Contenido</Label>
                <Textarea value={newKnowledge.content} onChange={e => setNewKnowledge({ ...newKnowledge, content: e.target.value })} placeholder="Describe el curso, precio, duración..." className="min-h-[200px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <Select value={newKnowledge.category} onValueChange={v => setNewKnowledge({ ...newKnowledge, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="curso">Curso</SelectItem>
                      <SelectItem value="precio">Precio</SelectItem>
                      <SelectItem value="horario">Horario</SelectItem>
                      <SelectItem value="certificado">Certificado</SelectItem>
                      <SelectItem value="metodologia">Metodología</SelectItem>
                      <SelectItem value="requisitos">Requisitos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridad</Label>
                  <Input type="number" value={newKnowledge.priority} onChange={e => setNewKnowledge({ ...newKnowledge, priority: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowKnowledgeDialog(false)}>Cancelar</Button>
              <Button onClick={createKnowledge} disabled={!newKnowledge.title || !newKnowledge.content} className="bg-teal-600 hover:bg-teal-700">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {knowledge.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="font-medium mb-2">Base de conocimiento vacía</h3>
            <p className="text-muted-foreground mb-4">Añade información sobre tus cursos médicos.</p>
            <Button onClick={() => setShowKnowledgeDialog(true)} className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" /> Añadir
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {knowledge.map(item => (
            <Card key={item.id} className="border-l-4 border-l-teal-500">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <Badge>{item.category}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-3">{item.content}</p>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-xs text-muted-foreground">Prioridad: {item.priority}</span>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteKnowledge(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  // RENDER SETTINGS
  const renderSettings = () => (
    <div className="p-6 overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-teal-700 dark:text-teal-300">Configuración</h1>
            <p className="text-muted-foreground">Administra tu cuenta y preferencias</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>

        <Tabs defaultValue="api">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api">API de IA</TabsTrigger>
            <TabsTrigger value="connections">Conexiones</TabsTrigger>
            <TabsTrigger value="appearance">Apariencia</TabsTrigger>
          </TabsList>

          <TabsContent value="api" className="space-y-4 mt-6">
            <Card className="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-teal-950 dark:to-blue-950 border-teal-200 dark:border-teal-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-teal-500" />
                  Proveedores de IA Gratuitos
                </CardTitle>
                <CardDescription>Elige un proveedor para usar modelos de IA gratuitos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-teal-500">Recomendado</Badge>
                      <span className="font-semibold">OpenRouter</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">+10 modelos gratuitos: Llama 3.1, Gemma 2, Mistral</p>
                    <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 underline">Obtener API Key →</a>
                    <p className="text-xs text-muted-foreground mt-2">Keys: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">sk-or-</code></p>
                  </div>
                  <div className="p-4 border rounded-lg bg-white dark:bg-slate-900">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">Alternativa</Badge>
                      <span className="font-semibold">Groq</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">Llama 3.1, Mixtral, Gemma - Muy rápido</p>
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 underline">Obtener API Key →</a>
                    <p className="text-xs text-muted-foreground mt-2">Keys: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">gsk_</code></p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  API Keys Configuradas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {groqKeys.length === 0 ? (
                  <div className="text-center py-6">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No hay API keys configuradas</p>
                    <Button onClick={() => setShowApiDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Agregar API Key
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {groqKeys.map((key) => (
                      <div key={key.id} className={`flex items-center justify-between p-4 border rounded-lg ${key.isActive ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/50' : ''}`}>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{key.name}</span>
                            <Badge variant="outline" className="uppercase text-xs">
                              {key.url?.includes('openrouter') ? 'OpenRouter' : key.url?.includes('groq') ? 'Groq' : 'Otro'}
                            </Badge>
                            {key.isActive && <Badge className="bg-teal-500">Activa</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground font-mono mt-1">{key.apiKey}</p>
                          <p className="text-sm text-muted-foreground mt-1">Modelo: <span className="font-medium">{key.model}</span></p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={key.model} onValueChange={(m) => changeKeyModel(key.id, m)} disabled={!key.isActive}>
                            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {availableModels.length > 0 ? availableModels.map((m) => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              )) : <SelectItem value={key.model}>{key.model}</SelectItem>}
                            </SelectContent>
                          </Select>
                          {!key.isActive && <Button size="sm" variant="outline" onClick={() => activateGroqKey(key.id)}>Activar</Button>}
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteGroqKey(key.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" onClick={() => setShowApiDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Agregar otra API Key
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={showApiDialog} onOpenChange={setShowApiDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar API Key</DialogTitle>
                  <DialogDescription>Pega tu API key. El sistema detectará el proveedor automáticamente.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nombre (opcional)</Label>
                    <Input placeholder="Ej: Mi OpenRouter" value={newKeyName} onChange={(e) => setNewKeyName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" placeholder="sk-or-... (OpenRouter) o gsk_... (Groq)" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                    <p className="text-xs text-muted-foreground">OpenRouter: <code>sk-or-</code> | Groq: <code>gsk_</code></p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowApiDialog(false)}>Cancelar</Button>
                  <Button onClick={saveGroqKey} disabled={loading || !apiKey} className="bg-teal-600 hover:bg-teal-700">{loading ? 'Verificando...' : 'Guardar y Verificar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="connections" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Conexiones de Redes Sociales</CardTitle>
                <CardDescription>Conecta tus plataformas de mensajería</CardDescription>
              </CardHeader>
              <CardContent>
                {socialConnections.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-muted-foreground mb-4">No hay conexiones configuradas</p>
                    <Button onClick={() => setShowConnectionDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" /> Nueva Conexión
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {socialConnections.map((conn) => (
                      <div key={conn.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {getPlatformIcon(conn.platform)}
                          <div>
                            <span className="font-medium">{conn.name}</span>
                            <p className="text-sm text-muted-foreground">{conn.platform}</p>
                          </div>
                        </div>
                        <Switch checked={conn.isActive} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Apariencia</CardTitle>
                <CardDescription>Personaliza la interfaz</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Modo Oscuro</Label>
                    <p className="text-sm text-muted-foreground">Cambia entre tema claro y oscuro</p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  // MAIN RENDER
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} border-r bg-white dark:bg-slate-900 flex flex-col transition-all shrink-0`}>
        <div className="p-4 border-b flex items-center gap-2">
          <div className="p-2 bg-teal-500 rounded-lg">
            <Heart className="h-5 w-5 text-white" />
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-teal-700 dark:text-teal-300">MedBot AI</h1>
              <p className="text-xs text-muted-foreground">Cursos Médicos</p>
            </div>
          )}
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewType)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                currentView === item.id
                  ? 'bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-muted-foreground"
          >
            <ChevronRight className={`h-5 w-5 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main ref={mainContentRef} className="flex-1 overflow-hidden flex flex-col">
        {currentView === 'dashboard' && renderDashboard()}
        {currentView === 'conversations' && renderConversations()}
        {currentView === 'contacts' && renderContacts()}
        {currentView === 'leads' && renderLeads()}
        {currentView === 'flows' && renderFlows()}
        {currentView === 'knowledge' && renderKnowledge()}
        {currentView === 'settings' && renderSettings()}
      </main>
    </div>
  );
}

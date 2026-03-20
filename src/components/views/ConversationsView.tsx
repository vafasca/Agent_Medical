'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  Search, 
  Filter, 
  Send, 
  Phone, 
  MoreVertical,
  MessageSquare,
  User,
  Bot,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  socialId: string;
  name: string | null;
  phone: string | null;
  platform: string;
  status: string;
  leadStatus: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lead: {
    id: string;
    name: string | null;
    score: number;
    stage: string;
  } | null;
}

interface Message {
  id: string;
  content: string;
  direction: string;
  messageType: string;
  createdAt: string;
}

const platformColors: Record<string, string> = {
  whatsapp: 'bg-green-500',
  facebook: 'bg-blue-500',
  instagram: 'bg-pink-500',
  telegram: 'bg-sky-500',
  tiktok: 'bg-black dark:bg-white dark:text-black'
};

const leadStatusColors: Record<string, string> = {
  new: 'bg-slate-500',
  interested: 'bg-blue-500',
  qualified: 'bg-amber-500',
  customer: 'bg-emerald-500',
  lost: 'bg-red-500'
};

export default function ConversationsView() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, [platformFilter, statusFilter]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (platformFilter !== 'all') params.set('platform', platformFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setMessagesLoading(true);
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}&limit=100`);
      const data = await res.json();
      setMessages(data.messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage,
          direction: 'outgoing'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        // Update conversation list
        setConversations(prev => 
          prev.map(c => 
            c.id === selectedConversation.id 
              ? { ...c, lastMessage: newMessage.substring(0, 200), lastMessageAt: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchConversations();
  };

  const updateLeadStatus = async (conversationId: string, leadStatus: string) => {
    try {
      await fetch('/api/conversations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: conversationId, leadStatus })
      });

      setConversations(prev =>
        prev.map(c => c.id === conversationId ? { ...c, leadStatus } : c)
      );

      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => prev ? { ...prev, leadStatus } : null);
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Conversations List */}
      <div className="w-80 border-r flex flex-col bg-card">
        <div className="p-4 border-b">
          <form onSubmit={handleSearch} className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" size="icon" variant="ghost">
              <Filter className="w-4 h-4" />
            </Button>
          </form>
          <div className="flex gap-2">
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Plataforma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="telegram">Telegram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="new">Nuevo</SelectItem>
                <SelectItem value="interested">Interesado</SelectItem>
                <SelectItem value="qualified">Calificado</SelectItem>
                <SelectItem value="customer">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-12 h-12 bg-muted rounded-full" />
                  <div className="flex-1">
                    <div className="h-4 bg-muted rounded w-24 mb-2" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No hay conversaciones</p>
            </div>
          ) : (
            <div className="p-2">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 rounded-lg transition-colors text-left",
                    selectedConversation?.id === conv.id
                      ? "bg-emerald-500/10"
                      : "hover:bg-accent"
                  )}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400">
                        {conv.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center",
                      platformColors[conv.platform] || 'bg-gray-500'
                    )}>
                      <Phone className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{conv.name || 'Sin nombre'}</p>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(conv.lastMessageAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{conv.lastMessage || 'Sin mensajes'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs text-white", leadStatusColors[conv.leadStatus])}
                      >
                        {conv.leadStatus}
                      </Badge>
                      {conv.lead && (
                        <Badge variant="secondary" className="text-xs">
                          Score: {conv.lead.score}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b px-4 flex items-center justify-between bg-card">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400">
                    {selectedConversation.name?.charAt(0) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedConversation.name || 'Sin nombre'}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedConversation.platform} • {selectedConversation.lead?.stage || 'Sin etapa'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={selectedConversation.leadStatus}
                  onValueChange={(value) => updateLeadStatus(selectedConversation.id, value)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">Nuevo</SelectItem>
                    <SelectItem value="interested">Interesado</SelectItem>
                    <SelectItem value="qualified">Calificado</SelectItem>
                    <SelectItem value="customer">Cliente</SelectItem>
                    <SelectItem value="lost">Perdido</SelectItem>
                  </SelectContent>
                </Select>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Ver Lead</DropdownMenuItem>
                    <DropdownMenuItem>Archivar</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex gap-3 max-w-[80%]",
                        msg.direction === 'outgoing' ? "ml-auto" : ""
                      )}
                    >
                      {msg.direction === 'incoming' && (
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="bg-muted">
                            <User className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={cn(
                          "rounded-lg p-3",
                          msg.direction === 'outgoing'
                            ? "bg-emerald-500 text-white"
                            : "bg-muted"
                        )}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          msg.direction === 'outgoing' ? "text-emerald-100" : "text-muted-foreground"
                        )}>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(msg.createdAt).toLocaleString('es')}
                        </p>
                      </div>
                      {msg.direction === 'outgoing' && (
                        <Avatar className="w-8 h-8 shrink-0">
                          <AvatarFallback className="bg-emerald-500 text-white">
                            <Bot className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t bg-card">
              <div className="flex gap-2">
                <Input
                  placeholder="Escribe un mensaje..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  disabled={sending}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!newMessage.trim() || sending}
                  className="bg-emerald-500 hover:bg-emerald-600"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Selecciona una conversación</p>
              <p className="text-sm">Elige una conversación de la lista para ver los mensajes</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

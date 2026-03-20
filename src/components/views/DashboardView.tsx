'use client';

import { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  GitBranch,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface DashboardStats {
  overview: {
    totalConversations: number;
    activeConversations: number;
    totalLeads: number;
    totalMessages: number;
    todayMessages: number;
    activeFlows: number;
    knowledgeItems: number;
    conversionRate: number;
  };
  leadsByStage: {
    new: number;
    interested: number;
    qualified: number;
    customer: number;
  };
  conversationsByPlatform: Record<string, number>;
  recentConversations: Array<{
    id: string;
    name: string;
    platform: string;
    lastMessage: string;
    lastMessageAt: string;
    lead: { name: string; score: number } | null;
  }>;
  topLeads: Array<{
    id: string;
    name: string;
    score: number;
    interest: string;
    conversation: { platform: string } | null;
  }>;
  messagesByDay: Array<{ date: string; count: number }>;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const platformData = Object.entries(stats.conversationsByPlatform).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  }));

  const stageData = [
    { name: 'Nuevos', value: stats.leadsByStage.new, color: '#10b981' },
    { name: 'Interesados', value: stats.leadsByStage.interested, color: '#3b82f6' },
    { name: 'Calificados', value: stats.leadsByStage.qualified, color: '#f59e0b' },
    { name: 'Clientes', value: stats.leadsByStage.customer, color: '#8b5cf6' }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversaciones Activas
            </CardTitle>
            <MessageSquare className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.activeConversations}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.overview.totalConversations} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
            <Users className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.totalLeads}</div>
            <div className="flex items-center text-xs text-emerald-600 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>+{stats.leadsByStage.new} nuevos</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mensajes Hoy
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.todayMessages}</div>
            <p className="text-xs text-muted-foreground mt-1">
              de {stats.overview.totalMessages} totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tasa de Conversión
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.overview.conversionRate}%</div>
            <div className="flex items-center text-xs text-emerald-600 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              <span>{stats.leadsByStage.customer} clientes</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Messages Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Mensajes por Día</CardTitle>
            <CardDescription>Últimos 7 días</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.messagesByDay}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('es', { weekday: 'short' })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Leads by Stage */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Etapa</CardTitle>
            <CardDescription>Distribución del funnel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {stageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {stageData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <Card>
          <CardHeader>
            <CardTitle>Conversaciones Recientes</CardTitle>
            <CardDescription>Últimas interacciones</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {stats.recentConversations.map((conv) => (
                  <div key={conv.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400">
                        {conv.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{conv.name || 'Sin nombre'}</p>
                        <Badge variant="outline" className="text-xs">
                          {conv.platform}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{conv.lastMessage}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(conv.lastMessageAt).toLocaleString('es')}
                      </p>
                    </div>
                    {conv.lead && (
                      <Badge variant="secondary" className="shrink-0">
                        Score: {conv.lead.score}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Top Leads</CardTitle>
            <CardDescription>Leads con mayor puntuación</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {stats.topLeads.map((lead, index) => (
                  <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{lead.name || 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {lead.interest || 'Sin interés definido'}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-emerald-500">Score: {lead.score}</Badge>
                      {lead.conversation && (
                        <p className="text-xs text-muted-foreground mt-1">{lead.conversation.platform}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

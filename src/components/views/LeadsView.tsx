'use client';

import { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical,
  Users,
  Mail,
  Phone,
  Star,
  TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  score: number;
  stage: string;
  source: string | null;
  notes: string | null;
  createdAt: string;
  conversation: {
    platform: string;
    lastMessage: string | null;
    lastMessageAt: string | null;
    leadStatus: string;
  } | null;
}

const stageColors: Record<string, { bg: string; text: string }> = {
  awareness: { bg: 'bg-slate-100 dark:bg-slate-900', text: 'text-slate-600 dark:text-slate-400' },
  consideration: { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-600 dark:text-blue-400' },
  decision: { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-600 dark:text-amber-400' },
  purchase: { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-600 dark:text-emerald-400' }
};

const stageLabels: Record<string, string> = {
  awareness: 'Consciencia',
  consideration: 'Consideración',
  decision: 'Decisión',
  purchase: 'Compra'
};

export default function LeadsView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    interest: '',
    notes: '',
    stage: '',
    score: 0
  });

  useEffect(() => {
    fetchLeads();
  }, [stageFilter]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (stageFilter !== 'all') params.set('stage', stageFilter);
      if (searchQuery) params.set('search', searchQuery);

      const res = await fetch(`/api/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads);
    } catch (error) {
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLeads();
  };

  const openEditDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setEditForm({
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      interest: lead.interest || '',
      notes: lead.notes || '',
      stage: lead.stage,
      score: lead.score
    });
    setEditDialogOpen(true);
  };

  const handleUpdateLead = async () => {
    if (!selectedLead) return;

    try {
      const res = await fetch('/api/leads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedLead.id,
          ...editForm
        })
      });

      if (res.ok) {
        const data = await res.json();
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? data.lead : l));
        setEditDialogOpen(false);
      }
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  };

  const handleDeleteLead = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este lead?')) return;

    try {
      const res = await fetch(`/api/leads?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setLeads(prev => prev.filter(l => l.id !== id));
      }
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-slate-500';
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Gestiona tus potenciales clientes</p>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <form onSubmit={handleSearch} className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar leads..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" variant="outline">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </form>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las etapas</SelectItem>
                <SelectItem value="awareness">Consciencia</SelectItem>
                <SelectItem value="consideration">Consideración</SelectItem>
                <SelectItem value="decision">Decisión</SelectItem>
                <SelectItem value="purchase">Compra</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-muted rounded w-24 mb-2" />
                <div className="h-3 bg-muted rounded w-full mb-4" />
                <div className="h-8 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">No hay leads</p>
            <p className="text-muted-foreground">Los leads aparecerán cuando se detecten conversaciones interesadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => (
            <Card key={lead.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400">
                        {lead.name?.charAt(0) || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{lead.name || 'Sin nombre'}</p>
                      <p className="text-sm text-muted-foreground">{lead.conversation?.platform || 'N/A'}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => openEditDialog(lead)}>
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => handleDeleteLead(lead.id)}
                      >
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  {/* Stage Badge */}
                  <div className="flex items-center gap-2">
                    <Badge className={cn(stageColors[lead.stage]?.bg, stageColors[lead.stage]?.text)}>
                      {stageLabels[lead.stage] || lead.stage}
                    </Badge>
                    <Badge variant="outline">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {lead.source || 'Directo'}
                    </Badge>
                  </div>

                  {/* Score */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">Score</span>
                      <span className={cn("font-bold", getScoreColor(lead.score))}>
                        {lead.score}
                      </span>
                    </div>
                    <Progress value={lead.score} className="h-2" />
                  </div>

                  {/* Interest */}
                  {lead.interest && (
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-amber-500" />
                      <span className="text-muted-foreground truncate">{lead.interest}</span>
                    </div>
                  )}

                  {/* Contact Info */}
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {lead.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{lead.email}</span>
                      </div>
                    )}
                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{lead.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Created Date */}
                  <p className="text-xs text-muted-foreground">
                    Creado: {new Date(lead.createdAt).toLocaleDateString('es')}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Lead</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="interest">Interés</Label>
              <Input
                id="interest"
                value={editForm.interest}
                onChange={(e) => setEditForm(prev => ({ ...prev, interest: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="stage">Etapa</Label>
                <Select
                  value={editForm.stage}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, stage: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="awareness">Consciencia</SelectItem>
                    <SelectItem value="consideration">Consideración</SelectItem>
                    <SelectItem value="decision">Decisión</SelectItem>
                    <SelectItem value="purchase">Compra</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="score">Score (0-100)</Label>
                <Input
                  id="score"
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.score}
                  onChange={(e) => setEditForm(prev => ({ ...prev, score: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateLead} className="bg-emerald-500 hover:bg-emerald-600">
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

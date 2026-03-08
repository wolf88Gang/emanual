import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/currency';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, DollarSign, Wrench, TrendingUp } from 'lucide-react';

interface MaintenanceStats {
  totalTasks: number;
  completedTasks: number;
  avgCompletionDays: number;
  tasksByZone: { name: string; count: number }[];
  tasksByAssetType: { name: string; count: number }[];
  completionsByMonth: { month: string; completed: number; created: number }[];
  topAssets: { name: string; taskCount: number }[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--accent))',
  'hsl(var(--info))',
  'hsl(var(--success))',
  'hsl(var(--warning))',
  'hsl(var(--destructive))',
];

export function MaintenanceDashboard() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const es = language === 'es';
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentEstate) fetchStats();
  }, [currentEstate]);

  const fetchStats = async () => {
    if (!currentEstate) return;
    setLoading(true);

    try {
      const [tasksRes, completionsRes, zonesRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, status, created_at, due_date, priority, asset_id, zone_id, assets:asset_id(name, asset_type), zones:zone_id(name)')
          .eq('estate_id', currentEstate.id),
        supabase
          .from('task_completions')
          .select('id, task_id, completed_at, tasks:task_id(created_at, asset_id, zone_id)')
          .order('completed_at', { ascending: false })
          .limit(500),
        supabase
          .from('zones')
          .select('id, name')
          .eq('estate_id', currentEstate.id),
      ]);

      const tasks = (tasksRes.data || []) as any[];
      const completions = (completionsRes.data || []) as any[];
      const zones = (zonesRes.data || []) as any[];

      const completed = tasks.filter(t => t.status === 'completed');

      // Avg completion time (days between created_at and completion)
      let totalDays = 0;
      let countWithTime = 0;
      completions.forEach(c => {
        if (c.tasks?.created_at && c.completed_at) {
          const diff = (new Date(c.completed_at).getTime() - new Date(c.tasks.created_at).getTime()) / (1000 * 60 * 60 * 24);
          if (diff >= 0 && diff < 365) { totalDays += diff; countWithTime++; }
        }
      });

      // Tasks by zone
      const zoneMap: Record<string, number> = {};
      tasks.forEach(t => {
        const zName = (t.zones as any)?.name || (es ? 'Sin zona' : 'No zone');
        zoneMap[zName] = (zoneMap[zName] || 0) + 1;
      });

      // Tasks by asset type
      const typeMap: Record<string, number> = {};
      tasks.forEach(t => {
        const type = (t.assets as any)?.asset_type || 'other';
        typeMap[type] = (typeMap[type] || 0) + 1;
      });

      // Top assets by task count
      const assetMap: Record<string, { name: string; count: number }> = {};
      tasks.forEach(t => {
        const aName = (t.assets as any)?.name;
        if (aName) {
          if (!assetMap[aName]) assetMap[aName] = { name: aName, count: 0 };
          assetMap[aName].count++;
        }
      });

      // Completions by month (last 6 months)
      const monthData: Record<string, { completed: number; created: number }> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthData[key] = { completed: 0, created: 0 };
      }
      tasks.forEach(t => {
        const key = t.created_at?.slice(0, 7);
        if (key && monthData[key]) monthData[key].created++;
      });
      completions.forEach(c => {
        const key = c.completed_at?.slice(0, 7);
        if (key && monthData[key]) monthData[key].completed++;
      });

      setStats({
        totalTasks: tasks.length,
        completedTasks: completed.length,
        avgCompletionDays: countWithTime > 0 ? totalDays / countWithTime : 0,
        tasksByZone: Object.entries(zoneMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        tasksByAssetType: Object.entries(typeMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
        completionsByMonth: Object.entries(monthData).map(([month, d]) => ({ month, ...d })),
        topAssets: Object.values(assetMap).sort((a, b) => b.count - a.count).slice(0, 8),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  if (!stats) return null;

  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="estate-card">
          <CardContent className="p-4 text-center">
            <Wrench className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats.totalTasks}</div>
            <div className="text-xs text-muted-foreground">{es ? 'Total tareas' : 'Total tasks'}</div>
          </CardContent>
        </Card>
        <Card className="estate-card">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-success mb-1" />
            <div className="text-2xl font-bold">{completionRate}%</div>
            <div className="text-xs text-muted-foreground">{es ? 'Completadas' : 'Completed'}</div>
          </CardContent>
        </Card>
        <Card className="estate-card">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-info mb-1" />
            <div className="text-2xl font-bold">{stats.avgCompletionDays.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">{es ? 'Días promedio' : 'Avg days'}</div>
          </CardContent>
        </Card>
        <Card className="estate-card">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-accent mb-1" />
            <div className="text-2xl font-bold">{stats.topAssets.length}</div>
            <div className="text-xs text-muted-foreground">{es ? 'Activos activos' : 'Active assets'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Completions by month */}
        <Card className="estate-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{es ? 'Tareas por mes' : 'Tasks per month'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.completionsByMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="created" fill="hsl(var(--muted-foreground))" name={es ? 'Creadas' : 'Created'} radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name={es ? 'Completadas' : 'Completed'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks by zone */}
        <Card className="estate-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{es ? 'Tareas por zona' : 'Tasks by zone'}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={stats.tasksByZone.slice(0, 6)}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.tasksByZone.slice(0, 6).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top assets needing maintenance */}
      <Card className="estate-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{es ? 'Activos con más tareas' : 'Assets with most tasks'}</CardTitle>
          <CardDescription className="text-xs">
            {es ? 'Los activos que requieren más mantenimiento' : 'Assets requiring the most maintenance'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats.topAssets.map((a, i) => (
              <div key={a.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{a.name}</span>
                    <Badge variant="secondary" className="text-xs">{a.count}</Badge>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${(a.count / (stats.topAssets[0]?.count || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

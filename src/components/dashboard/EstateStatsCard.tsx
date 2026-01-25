import React from 'react';
import { 
  TreeDeciduous, 
  Droplets, 
  FileText,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface EstateStats {
  totalAssets: number;
  totalZones: number;
  totalDocuments: number;
  totalTasks: number;
  completedTasks: number;
}

interface EstateStatsCardProps {
  stats: EstateStats;
  className?: string;
}

export function EstateStatsCard({ stats, className }: EstateStatsCardProps) {
  const statItems = [
    {
      icon: TreeDeciduous,
      value: stats.totalAssets,
      label: 'Assets',
      iconClass: 'text-asset-tree bg-asset-tree/10',
    },
    {
      icon: MapPin,
      value: stats.totalZones,
      label: 'Zones',
      iconClass: 'text-primary bg-primary/10',
    },
    {
      icon: FileText,
      value: stats.totalDocuments,
      label: 'Documents',
      iconClass: 'text-info bg-info/10',
    },
    {
      icon: TrendingUp,
      value: stats.totalTasks > 0 
        ? Math.round((stats.completedTasks / stats.totalTasks) * 100) 
        : 100,
      label: 'Task Rate',
      suffix: '%',
      iconClass: 'text-success bg-success/10',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      {statItems.map((stat, index) => (
        <Card key={index} className="estate-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                stat.iconClass
              )}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-semibold font-serif">
                  {stat.value}{stat.suffix || ''}
                </p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

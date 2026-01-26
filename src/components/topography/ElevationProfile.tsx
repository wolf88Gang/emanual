import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, TrendingUp, Ruler } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ElevationProfileProps {
  data: { distance: number; elevation: number }[] | null;
  loading?: boolean;
}

export function ElevationProfile({ data, loading }: ElevationProfileProps) {
  const { language } = useLanguage();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" />
            {language === 'es' ? 'Perfil de Elevación' : 'Elevation Profile'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Ruler className="h-8 w-8 mb-2" />
            <p className="text-sm text-center">
              {language === 'es' 
                ? 'Dibuja un transecto en el mapa para ver el perfil de elevación' 
                : 'Draw a transect on the map to see the elevation profile'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const minElev = Math.min(...data.map(d => d.elevation));
  const maxElev = Math.max(...data.map(d => d.elevation));
  const elevRange = maxElev - minElev;
  const totalDistance = data[data.length - 1]?.distance || 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4" />
          {language === 'es' ? 'Perfil de Elevación' : 'Elevation Profile'}
        </CardTitle>
        <CardDescription>
          {language === 'es' ? 'Distancia' : 'Distance'}: {(totalDistance / 1000).toFixed(2)} km | 
          {language === 'es' ? ' Desnivel' : ' Elevation change'}: {elevRange.toFixed(0)}m
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="distance"
                tickFormatter={(v) => `${(v / 1000).toFixed(1)}km`}
                className="text-xs fill-muted-foreground"
              />
              <YAxis
                domain={[minElev - 5, maxElev + 5]}
                tickFormatter={(v) => `${v}m`}
                className="text-xs fill-muted-foreground"
              />
              <Tooltip
                formatter={(value: number) => [`${value}m`, language === 'es' ? 'Elevación' : 'Elevation']}
                labelFormatter={(value: number) => `${(value / 1000).toFixed(2)} km`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="elevation"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#elevationGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

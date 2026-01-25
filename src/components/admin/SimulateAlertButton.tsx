import React, { useState } from 'react';
import { AlertTriangle, CloudRain, Wind, Sun, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WeatherRule {
  id: string;
  rule_type: string;
  action_text: string;
  action_text_es: string | null;
}

interface SimulateAlertButtonProps {
  weatherRules: WeatherRule[];
  onAlertCreated?: () => void;
}

const ruleIcons: Record<string, typeof CloudRain> = {
  heavy_rain: CloudRain,
  high_wind: Wind,
  drought: Sun,
  freeze: AlertTriangle,
};

const ruleLabels: Record<string, { en: string; es: string }> = {
  heavy_rain: { en: 'Heavy Rain', es: 'Lluvia Fuerte' },
  high_wind: { en: 'High Wind', es: 'Viento Fuerte' },
  drought: { en: 'Drought', es: 'Sequía' },
  freeze: { en: 'Freeze', es: 'Helada' },
};

const severities: Record<string, string> = {
  heavy_rain: 'warning',
  high_wind: 'warning',
  drought: 'info',
  freeze: 'critical',
};

export function SimulateAlertButton({ weatherRules, onAlertCreated }: SimulateAlertButtonProps) {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [simulating, setSimulating] = useState(false);

  async function simulateAlert(rule: WeatherRule) {
    if (!currentEstate) return;
    
    setSimulating(true);
    try {
      const messageEn = `${ruleLabels[rule.rule_type]?.en || rule.rule_type} alert triggered. ${rule.action_text}`;
      const messageEs = `Alerta de ${ruleLabels[rule.rule_type]?.es || rule.rule_type}. ${rule.action_text_es || rule.action_text}`;

      const { error } = await supabase
        .from('weather_alerts')
        .insert({
          estate_id: currentEstate.id,
          rule_id: rule.id,
          fired_at: new Date().toISOString(),
          severity: severities[rule.rule_type] || 'info',
          message: messageEn,
          message_es: messageEs,
          status: 'active',
        });

      if (error) throw error;

      toast.success(
        language === 'es'
          ? `¡Alerta de ${ruleLabels[rule.rule_type]?.es} simulada!`
          : `${ruleLabels[rule.rule_type]?.en} alert simulated!`
      );
      
      onAlertCreated?.();
    } catch (error) {
      console.error('Error simulating alert:', error);
      toast.error(
        language === 'es'
          ? 'Error al simular alerta'
          : 'Failed to simulate alert'
      );
    } finally {
      setSimulating(false);
    }
  }

  if (weatherRules.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={simulating}>
          {simulating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4 mr-2" />
          )}
          {language === 'es' ? 'Simular Alerta' : 'Simulate Alert'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {weatherRules.map((rule) => {
          const Icon = ruleIcons[rule.rule_type] || AlertTriangle;
          const label = ruleLabels[rule.rule_type];
          
          return (
            <DropdownMenuItem
              key={rule.id}
              onClick={() => simulateAlert(rule)}
              className="cursor-pointer"
            >
              <Icon className="h-4 w-4 mr-2" />
              {language === 'es' ? label?.es : label?.en}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

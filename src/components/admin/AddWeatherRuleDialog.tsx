import React, { useState } from 'react';
import { Loader2, Plus, Snowflake, CloudRain, Wind, Sun, Mountain, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AddWeatherRuleDialogProps {
  onRuleAdded?: () => void;
}

type WeatherRuleType = 'freeze' | 'heavy_rain' | 'high_wind' | 'drought';

type TemperatureUnit = 'F' | 'C';

interface RuleConfig {
  icon: React.ElementType;
  label: { en: string; es: string };
  thresholdLabel: { en: string; es: string };
  thresholdUnit: string;
  defaultThreshold: number;
  defaultAction: { en: string; es: string };
  supportsTemperatureUnit?: boolean;
}

const ruleConfigs: Record<WeatherRuleType, RuleConfig> = {
  freeze: {
    icon: Snowflake,
    label: { en: 'Freeze Warning', es: 'Alerta de Helada' },
    thresholdLabel: { en: 'Temperature below', es: 'Temperatura menor a' },
    thresholdUnit: '°',
    defaultThreshold: 35,
    defaultAction: {
      en: 'Cover tropical plants. Turn off irrigation. Check pool equipment.',
      es: 'Cubrir plantas tropicales sensibles. Apagar riego. Revisar equipo de piscina.',
    },
    supportsTemperatureUnit: true,
  },
  heavy_rain: {
    icon: CloudRain,
    label: { en: 'Heavy Rain / Downpour', es: 'Aguacero / Lluvia Fuerte' },
    thresholdLabel: { en: 'Rainfall above (mm)', es: 'Lluvia mayor a (mm)' },
    thresholdUnit: 'mm',
    defaultThreshold: 50,
    defaultAction: {
      en: 'Check slope drainage. Inspect erosion control. Clear drain debris. Review flood-prone areas.',
      es: 'Revisar drenaje de pendientes. Inspeccionar control de erosión. Limpiar escombros de desagües. Revisar zonas propensas a inundación.',
    },
  },
  high_wind: {
    icon: Wind,
    label: { en: 'High Wind', es: 'Viento Fuerte' },
    thresholdLabel: { en: 'Wind speed above (km/h)', es: 'Viento mayor a (km/h)' },
    thresholdUnit: 'km/h',
    defaultThreshold: 65,
    defaultAction: {
      en: 'Secure loose items. Move potted plants to shelter. Check tree stability.',
      es: 'Asegurar objetos sueltos. Mover macetas a refugio. Revisar estabilidad de árboles.',
    },
  },
  drought: {
    icon: Sun,
    label: { en: 'Drought Alert', es: 'Alerta de Sequía' },
    thresholdLabel: { en: 'Days without rain', es: 'Días sin lluvia' },
    thresholdUnit: 'days',
    defaultThreshold: 7,
    defaultAction: {
      en: 'Increase watering frequency. Prioritize high-value plants. Check irrigation system.',
      es: 'Aumentar frecuencia de riego. Priorizar plantas de alto valor. Revisar sistema de riego.',
    },
  },
};

export function AddWeatherRuleDialog({ onRuleAdded }: AddWeatherRuleDialogProps) {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [ruleType, setRuleType] = useState<WeatherRuleType>('freeze');
  const [threshold, setThreshold] = useState<number>(35);
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('C');
  const [actionText, setActionText] = useState('');
  const [actionTextEs, setActionTextEs] = useState('');
  const [autoCreateTasks, setAutoCreateTasks] = useState(true);
  const [enabled, setEnabled] = useState(true);

  const config = ruleConfigs[ruleType];

  function handleRuleTypeChange(type: WeatherRuleType) {
    setRuleType(type);
    const newConfig = ruleConfigs[type];
    // Convert default threshold to Celsius if freeze rule
    if (type === 'freeze' && temperatureUnit === 'C') {
      setThreshold(Math.round((newConfig.defaultThreshold - 32) * 5 / 9));
    } else {
      setThreshold(newConfig.defaultThreshold);
    }
    setActionText(newConfig.defaultAction.en);
    setActionTextEs(newConfig.defaultAction.es);
  }

  function handleTemperatureUnitChange(unit: TemperatureUnit) {
    // Convert threshold when changing units
    if (unit === 'C' && temperatureUnit === 'F') {
      setThreshold(Math.round((threshold - 32) * 5 / 9));
    } else if (unit === 'F' && temperatureUnit === 'C') {
      setThreshold(Math.round((threshold * 9 / 5) + 32));
    }
    setTemperatureUnit(unit);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!currentEstate) {
      toast.error(language === 'es' ? 'Seleccione una finca' : 'Select an estate');
      return;
    }

    if (!actionText.trim()) {
      toast.error(language === 'es' ? 'Ingrese texto de acción' : 'Enter action text');
      return;
    }

    setSaving(true);
    try {
      // Store temperature in Fahrenheit internally for consistency
      let storedValue = threshold;
      let storedUnit = config.thresholdUnit;
      
      if (config.supportsTemperatureUnit) {
        storedUnit = `°${temperatureUnit}`;
        // If user entered Celsius, convert to Fahrenheit for storage
        if (temperatureUnit === 'C') {
          storedValue = Math.round((threshold * 9 / 5) + 32);
          storedUnit = '°F'; // Store in F internally
        }
      }

      const thresholdJson = {
        value: storedValue,
        unit: storedUnit,
        displayUnit: config.supportsTemperatureUnit ? `°${temperatureUnit}` : config.thresholdUnit,
        displayValue: threshold,
      };

      const { error } = await supabase
        .from('weather_rules')
        .insert({
          estate_id: currentEstate.id,
          rule_type: ruleType,
          threshold_json: thresholdJson,
          action_text: actionText.trim(),
          action_text_es: actionTextEs.trim() || null,
          auto_create_tasks: autoCreateTasks,
          enabled,
        });

      if (error) throw error;

      toast.success(
        language === 'es' 
          ? '✅ Regla climática creada' 
          : '✅ Weather rule created'
      );
      
      setOpen(false);
      resetForm();
      onRuleAdded?.();
    } catch (error: any) {
      console.error('Error creating weather rule:', error);
      toast.error(error.message || (language === 'es' ? 'Error al crear' : 'Failed to create'));
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setRuleType('freeze');
    setTemperatureUnit('C');
    // Default to Celsius equivalent of 35°F (about 2°C)
    setThreshold(2);
    setActionText('');
    setActionTextEs('');
    setAutoCreateTasks(true);
    setEnabled(true);
  }

  const Icon = config.icon;
  const displayUnit = config.supportsTemperatureUnit ? `°${temperatureUnit}` : config.thresholdUnit;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          {language === 'es' ? 'Agregar Regla' : 'Add Rule'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {language === 'es' ? 'Nueva Regla Climática' : 'New Weather Rule'}
          </DialogTitle>
          <DialogDescription>
            {language === 'es'
              ? 'Configure alertas automáticas basadas en condiciones climáticas'
              : 'Configure automatic alerts based on weather conditions'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Rule Type */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Tipo de Regla' : 'Rule Type'}</Label>
            <Select value={ruleType} onValueChange={(v) => handleRuleTypeChange(v as WeatherRuleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ruleConfigs) as WeatherRuleType[]).map((type) => {
                  const cfg = ruleConfigs[type];
                  const RuleIcon = cfg.icon;
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <RuleIcon className="h-4 w-4" />
                        {language === 'es' ? cfg.label.es : cfg.label.en}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Preview card */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <Icon className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">
                {language === 'es' ? config.label.es : config.label.en}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'es' ? config.thresholdLabel.es : config.thresholdLabel.en}
              </p>
            </div>
          </div>

          {/* Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold">
              {language === 'es' ? config.thresholdLabel.es : config.thresholdLabel.en}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="threshold"
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-24"
              />
              {config.supportsTemperatureUnit ? (
                <Select value={temperatureUnit} onValueChange={(v) => handleTemperatureUnitChange(v as TemperatureUnit)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="C">°C</SelectItem>
                    <SelectItem value="F">°F</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-muted-foreground">{config.thresholdUnit}</span>
              )}
            </div>
          </div>

          {/* Action Text (English) */}
          <div className="space-y-2">
            <Label htmlFor="action-text">
              {language === 'es' ? 'Texto de Acción (Inglés)' : 'Action Text (English)'}
            </Label>
            <Textarea
              id="action-text"
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              placeholder={config.defaultAction.en}
              rows={2}
            />
          </div>

          {/* Action Text (Spanish) */}
          <div className="space-y-2">
            <Label htmlFor="action-text-es">
              {language === 'es' ? 'Texto de Acción (Español)' : 'Action Text (Spanish)'}
            </Label>
            <Textarea
              id="action-text-es"
              value={actionTextEs}
              onChange={(e) => setActionTextEs(e.target.value)}
              placeholder={config.defaultAction.es}
              rows={2}
            />
          </div>

          {/* Auto-create tasks toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium text-sm">
                {language === 'es' ? 'Crear tareas automáticamente' : 'Auto-create tasks'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'es'
                  ? 'Genera tareas cuando se active la alerta'
                  : 'Generate tasks when alert is triggered'}
              </p>
            </div>
            <Switch checked={autoCreateTasks} onCheckedChange={setAutoCreateTasks} />
          </div>

          {/* Enabled toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium text-sm">
                {language === 'es' ? 'Regla activa' : 'Rule enabled'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'es'
                  ? 'Activar/desactivar esta regla'
                  : 'Enable/disable this rule'}
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'es' ? 'Guardando...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'es' ? 'Crear Regla' : 'Create Rule'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

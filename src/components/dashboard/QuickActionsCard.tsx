import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, 
  Plus, 
  Upload, 
  CheckCircle,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface QuickActionsCardProps {
  className?: string;
  onCheckin?: () => void;
  onAddAsset?: () => void;
  onUploadDocument?: () => void;
}

export function QuickActionsCard({ 
  className, 
  onCheckin,
  onAddAsset,
  onUploadDocument 
}: QuickActionsCardProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const actions = [
    {
      icon: Camera,
      label: t('dashboard.startCheckin'),
      description: 'Record site visit',
      onClick: onCheckin || (() => navigate('/tasks?action=checkin')),
      primary: true,
    },
    {
      icon: Plus,
      label: t('dashboard.addAsset'),
      description: 'Add new asset',
      onClick: onAddAsset || (() => navigate('/assets?action=add')),
      primary: false,
    },
    {
      icon: Upload,
      label: t('dashboard.uploadDocument'),
      description: 'Upload document',
      onClick: onUploadDocument || (() => navigate('/documents?action=upload')),
      primary: false,
    },
  ];

  return (
    <Card className={cn('estate-card', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif">
          {t('dashboard.quickActions')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={cn(
                'crew-button',
                !action.primary && 'crew-button-secondary'
              )}
            >
              <action.icon className="h-8 w-8" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

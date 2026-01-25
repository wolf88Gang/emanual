import React from 'react';
import { 
  Camera, 
  CheckCircle2, 
  Upload,
  User,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type ActivityType = 'checkin' | 'task_complete' | 'document_upload';

interface Activity {
  id: string;
  type: ActivityType;
  user: {
    name: string;
    avatar_url?: string;
  };
  description: string;
  timestamp: string;
  zone?: string;
  photo_url?: string;
}

interface RecentActivityCardProps {
  activities: Activity[];
  className?: string;
}

const activityConfig = {
  checkin: {
    icon: Camera,
    iconClass: 'text-primary bg-primary/10',
  },
  task_complete: {
    icon: CheckCircle2,
    iconClass: 'text-success bg-success/10',
  },
  document_upload: {
    icon: Upload,
    iconClass: 'text-info bg-info/10',
  },
};

export function RecentActivityCard({ activities, className }: RecentActivityCardProps) {
  const { t } = useLanguage();

  return (
    <Card className={cn('estate-card', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-serif">
          {t('dashboard.recentActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <User className="h-10 w-10 mx-auto mb-2" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;
              
              return (
                <div key={activity.id} className="flex gap-3">
                  <div className={cn(
                    'shrink-0 w-9 h-9 rounded-full flex items-center justify-center',
                    config.iconClass
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={activity.user.avatar_url} />
                        <AvatarFallback className="text-[10px] bg-secondary">
                          {activity.user.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm truncate">
                        {activity.user.name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {activity.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                      {activity.zone && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {activity.zone}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {activity.photo_url && (
                    <div className="shrink-0">
                      <img
                        src={activity.photo_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

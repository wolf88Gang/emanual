import React from 'react';
import {
  Flower2,
  TreeDeciduous,
  Droplets,
  Lightbulb,
  Square,
  Wrench,
  Home,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type AssetType = 'plant' | 'tree' | 'irrigation_controller' | 'valve' | 'lighting_transformer' | 'hardscape' | 'equipment' | 'structure';

interface AssetTypeIconProps {
  type: AssetType;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const iconMap: Record<AssetType, LucideIcon> = {
  plant: Flower2,
  tree: TreeDeciduous,
  irrigation_controller: Droplets,
  valve: Droplets,
  lighting_transformer: Lightbulb,
  hardscape: Square,
  equipment: Wrench,
  structure: Home,
};

const colorMap: Record<AssetType, string> = {
  plant: 'text-asset-plant',
  tree: 'text-asset-tree',
  irrigation_controller: 'text-asset-irrigation',
  valve: 'text-asset-irrigation',
  lighting_transformer: 'text-asset-lighting',
  hardscape: 'text-asset-hardscape',
  equipment: 'text-asset-equipment',
  structure: 'text-asset-structure',
};

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

export function AssetTypeIcon({ type, className, size = 'md' }: AssetTypeIconProps) {
  const Icon = iconMap[type] || Wrench;
  const colorClass = colorMap[type] || 'text-muted-foreground';
  
  return <Icon className={cn(sizeMap[size], colorClass, className)} />;
}

export function getAssetBadgeClass(type: AssetType): string {
  const badgeMap: Record<AssetType, string> = {
    plant: 'asset-badge-plant',
    tree: 'asset-badge-tree',
    irrigation_controller: 'asset-badge-irrigation',
    valve: 'asset-badge-irrigation',
    lighting_transformer: 'asset-badge-lighting',
    hardscape: 'asset-badge-hardscape',
    equipment: 'asset-badge-equipment',
    structure: 'asset-badge-structure',
  };
  return badgeMap[type] || '';
}

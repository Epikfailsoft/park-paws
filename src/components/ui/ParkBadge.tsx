import { cn } from '@/lib/utils';
import { MapPin, Clock, Check } from 'lucide-react';
import type { Park } from '@/types/dogspace';

interface ParkBadgeProps {
  status: Park['status'];
  showIcon?: boolean;
  showBeta?: boolean;
}

const STATUS_CONFIG = {
  active: {
    label: 'Aktif',
    className: 'park-badge-active',
    icon: Check,
  },
  requested: {
    label: 'Başvuruda',
    className: 'park-badge-requested',
    icon: Clock,
  },
  closed: {
    label: 'Kapalı',
    className: 'park-badge-closed',
    icon: MapPin,
  },
} as const;

export function ParkBadge({ status, showIcon = true, showBeta = false }: ParkBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("park-badge", config.className)}>
        {showIcon && <Icon className="h-3 w-3" />}
        {config.label}
      </span>
      {showBeta && status === 'active' && (
        <span className="rounded-full bg-harmony/20 px-2 py-0.5 text-[10px] font-medium text-harmony-foreground">
          Beta
        </span>
      )}
    </div>
  );
}

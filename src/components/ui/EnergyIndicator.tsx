import { cn } from '@/lib/utils';

interface EnergyIndicatorProps {
  level: 1 | 2 | 3;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const ENERGY_LABELS = {
  1: 'Sakin',
  2: 'Normal',
  3: 'Enerjik',
} as const;

export function EnergyIndicator({ level, size = 'md', showLabel = false }: EnergyIndicatorProps) {
  const dotSizes = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-3 w-3',
  };

  const gapSizes = {
    sm: 'gap-0.5',
    md: 'gap-1',
    lg: 'gap-1.5',
  };

  return (
    <div className="flex items-center gap-2">
      <div className={cn("energy-bar", gapSizes[size])}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "energy-dot rounded-full transition-all",
              dotSizes[size],
              i <= level && `active-${level}`
            )}
          />
        ))}
      </div>
      {showLabel && (
        <span className="text-xs text-muted-foreground">
          {ENERGY_LABELS[level]}
        </span>
      )}
    </div>
  );
}

import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, MessageCircle, MapPin, Dog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/discover', icon: Compass, label: 'Keşfet', color: 'hsl(210, 60%, 55%)' },
  { path: '/messages', icon: MessageCircle, label: 'Sosyal', color: 'hsl(260, 60%, 55%)' },
  { path: '/park', icon: MapPin, label: 'Park', color: 'hsl(152, 60%, 45%)' },
  { path: '/profile', icon: Dog, label: 'Köpeğim', color: 'hsl(14, 90%, 58%)' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasDog } = useAuth();

  if (['/auth', '/onboarding', '/admin'].includes(location.pathname)) return null;
  if (!hasDog) return null;

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around py-1.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 px-5 rounded-xl transition-all min-w-[4rem]",
                isActive ? "bg-primary/10" : "text-muted-foreground"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 transition-all",
                  isActive && "scale-110"
                )}
                style={isActive ? { color: item.color, filter: `drop-shadow(0 2px 4px ${item.color}40)` } : {}}
              />
              <span className={cn(
                "text-[10px] font-semibold",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

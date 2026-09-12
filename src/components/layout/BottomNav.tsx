import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, MapPin, Inbox, Dog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navItems = [
  { path: '/discover', icon: Compass, label: 'Keşfet', cssVar: '--page-discover' },
  { path: '/park', icon: MapPin, label: 'Park', cssVar: '--page-park' },
  { path: '/mydog', icon: Dog, label: 'Köpeğim', cssVar: '--page-profile' },
  { path: '/inbox', icon: Inbox, label: 'Sosyal', cssVar: '--page-social' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, hasDog, isObserver } = useAuth();

  if (['/auth', '/onboarding', '/admin'].includes(location.pathname)) return null;
  if (!user) return null;
  if (!hasDog && !isObserver) return null;

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
                style={isActive ? { color: `hsl(var(${item.cssVar}))`, filter: `drop-shadow(0 2px 4px hsl(var(${item.cssVar}) / 0.4))` } : {}}
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

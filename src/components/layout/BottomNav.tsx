import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Compass, MessageCircle, Dog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

// V1.22 Navigation: 4 tabs - Park, Discover, Messages, My Dog
const navItems = [
  { path: '/park', icon: MapPin, label: 'Park' },
  { path: '/discover', icon: Compass, label: 'Keşfet' },
  { path: '/messages', icon: MessageCircle, label: 'Mesajlar' },
  { path: '/profile', icon: Dog, label: 'Köpeğim' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { hasDog } = useAuth();

  // Don't show nav on auth or onboarding pages
  if (location.pathname === '/auth' || location.pathname === '/onboarding') {
    return null;
  }

  // Don't show on admin page
  if (location.pathname === '/admin') {
    return null;
  }

  // Don't show if user has no dog (they should be redirected to onboarding)
  if (!hasDog) {
    return null;
  }

  return (
    <nav className="bottom-nav">
      <div className="flex items-center justify-around py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "bottom-nav-item min-w-[4rem]",
                isActive && "active"
              )}
            >
              <Icon 
                className={cn(
                  "nav-icon h-5 w-5 transition-transform",
                  isActive && "text-primary"
                )} 
              />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

import { useState, useRef } from 'react';
import { MapPin, PawPrint, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOCIAL_STYLE_OPTIONS } from '@/types/dogspace';
import type { DiscoverDog } from '@/types/dogspace';

interface SwipeCardProps {
  dog: DiscoverDog;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onTap?: () => void;
  isTop: boolean;
  hasWaved: boolean;
}

const SWIPE_THRESHOLD = 100;

export function SwipeCard({ dog, onSwipeLeft, onSwipeRight, onTap, isTop, hasWaved }: SwipeCardProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isLeaving, setIsLeaving] = useState<'left' | 'right' | null>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const socialStyle = SOCIAL_STYLE_OPTIONS.find(o => o.value === dog.social_style);

  const handleStart = (clientX: number, clientY: number) => {
    if (!isTop) return;
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    setOffset({
      x: clientX - startPos.current.x,
      y: (clientY - startPos.current.y) * 0.3,
    });
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const totalMove = Math.abs(offset.x) + Math.abs(offset.y);
    if (offset.x > SWIPE_THRESHOLD) {
      setIsLeaving('right');
      setTimeout(onSwipeRight, 300);
    } else if (offset.x < -SWIPE_THRESHOLD) {
      setIsLeaving('left');
      setTimeout(onSwipeLeft, 300);
    } else if (totalMove < 5 && onTap) {
      onTap();
      setOffset({ x: 0, y: 0 });
    } else {
      setOffset({ x: 0, y: 0 });
    }
  };

  const rotation = offset.x * 0.1;
  const opacity = Math.max(0, 1 - Math.abs(offset.x) / 400);
  const likeOpacity = Math.min(1, Math.max(0, offset.x / SWIPE_THRESHOLD));
  const nopeOpacity = Math.min(1, Math.max(0, -offset.x / SWIPE_THRESHOLD));

  const transform = isLeaving === 'left'
    ? 'translateX(-150%) rotate(-30deg)'
    : isLeaving === 'right'
    ? 'translateX(150%) rotate(30deg)'
    : `translateX(${offset.x}px) translateY(${offset.y}px) rotate(${rotation}deg)`;

  return (
    <div
      className={cn(
        "absolute inset-0 rounded-3xl overflow-hidden shadow-2xl cursor-grab",
        isDragging && "cursor-grabbing",
        isLeaving && "transition-transform duration-300 ease-out",
        !isTop && "scale-[0.95] translate-y-2"
      )}
      style={{
        transform,
        opacity: isLeaving ? 0.5 : opacity,
        zIndex: isTop ? 10 : 5,
        transition: isDragging ? 'none' : isLeaving ? 'transform 0.3s, opacity 0.3s' : 'transform 0.3s ease-out, opacity 0.3s',
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={handleEnd}
      onMouseLeave={() => isDragging && handleEnd()}
      onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={handleEnd}
    >
      {/* Photo */}
      <img
        src={dog.photo_url}
        alt={dog.dog_name}
        className="absolute inset-0 h-full w-full object-cover select-none pointer-events-none"
        draggable={false}
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

      {/* WOOF stamp */}
      <div
        className="absolute top-8 left-6 z-20 rounded-lg border-4 border-green-500 px-4 py-2 rotate-[-15deg]"
        style={{ opacity: likeOpacity }}
      >
        <span className="text-3xl font-extrabold text-green-500 tracking-wide">WOOF!</span>
      </div>

      {/* NOPE stamp */}
      <div
        className="absolute top-8 right-6 z-20 rounded-lg border-4 border-red-500 px-4 py-2 rotate-[15deg]"
        style={{ opacity: nopeOpacity }}
      >
        <span className="text-3xl font-extrabold text-red-500 tracking-wide">NOPE</span>
      </div>

      {/* Already woofed badge */}
      {hasWaved && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 rounded-full bg-primary/90 px-3 py-1.5 backdrop-blur-sm">
          <PawPrint className="h-3 w-3 text-primary-foreground" />
          <span className="text-xs font-bold text-primary-foreground">Havladın</span>
        </div>
      )}

      {/* Dog info */}
      <div className="absolute bottom-0 left-0 right-0 z-10 p-5 text-white">
        <div className="flex items-end justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-3xl font-extrabold leading-tight truncate">{dog.dog_name}</h2>
            <p className="text-sm text-white/80 mt-0.5">{dog.breed_name || 'Karışık'}</p>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-sm text-white/90">{dog.approximate_age}</span>
              {dog.gender && (
                <span className="text-sm font-semibold" style={{ color: dog.gender === 'female' ? '#f472b6' : '#60a5fa' }}>
                  {dog.gender === 'male' ? '♂' : '♀'}
                </span>
              )}
              {socialStyle && (
                <span className="rounded-full bg-white/20 backdrop-blur-sm px-2 py-0.5 text-xs font-medium">
                  {socialStyle.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/70">
              {dog.distance_km != null && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {dog.distance_km < 1 ? `${Math.round(dog.distance_km * 1000)} m` : `${dog.distance_km.toFixed(1)} km`}
                </span>
              )}
              {dog.current_park_name && (
                <span className="flex items-center gap-1 font-semibold text-primary">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  {dog.current_park_name}
                </span>
              )}
              {dog.playdate_on && !dog.current_park_name && (
                <span className="flex items-center gap-1 font-semibold text-accent">
                  <Zap className="h-3 w-3" /> Playdate
                </span>
              )}
            </div>
            {dog.owner_name_stub && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {dog.owner_photo_stub ? (
                  <img src={dog.owner_photo_stub} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/30" />
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[9px] font-medium">
                    {dog.owner_name_stub[0]}
                  </div>
                )}
                <span className="text-xs text-white/60">{dog.owner_name_stub}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

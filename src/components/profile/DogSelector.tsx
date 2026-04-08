import { Plus, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Dog } from '@/types/dogspace';

interface DogSelectorProps {
  dogs: Dog[];
  selectedDogId: string;
  onSelect: (dogId: string) => void;
  onAddNew: () => void;
}

export function DogSelector({ dogs, selectedDogId, onSelect, onAddNew }: DogSelectorProps) {
  const [open, setOpen] = useState(false);
  const selected = dogs.find(d => d.id === selectedDogId);

  if (dogs.length <= 1 && dogs.length > 0) {
    return (
      <button onClick={onAddNew}
        className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm">
        <Plus className="h-3.5 w-3.5" /> Köpek Ekle
      </button>
    );
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur-sm">
        {selected && (
          <img src={selected.photo_url} alt="" className="h-6 w-6 rounded-full object-cover ring-1 ring-white/40" />
        )}
        <span className="max-w-[100px] truncate">{selected?.name || 'Seç'}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-border bg-card shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {dogs.map(dog => (
              <button key={dog.id}
                onClick={() => { onSelect(dog.id); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  dog.id === selectedDogId ? "bg-primary/10" : "hover:bg-secondary/50"
                )}>
                <img src={dog.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium truncate", dog.id === selectedDogId ? "text-primary" : "text-foreground")}>{dog.name}</p>
                  <p className="text-[10px] text-muted-foreground">{dog.approximate_age}</p>
                </div>
              </button>
            ))}
            <button onClick={() => { onAddNew(); setOpen(false); }}
              className="flex w-full items-center gap-3 px-3 py-2.5 border-t border-border text-primary hover:bg-secondary/50 transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium">Yeni Köpek Ekle</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

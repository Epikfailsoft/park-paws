import { X } from 'lucide-react';

interface WaveLimitModalProps {
  open: boolean;
  onClose: () => void;
}

export function WaveLimitModal({ open, onClose }: WaveLimitModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-card p-6" style={{ boxShadow: 'var(--shadow-elevated)' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold text-foreground">Woof Limiti Doldu</h3>
          <button onClick={onClose} className="rounded-full bg-muted p-1.5">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <div className="text-center py-4">
          <span className="text-5xl mb-4 block">🔒</span>
          <p className="text-foreground font-medium mb-2">
            Bugünlük woof'ların bitti
          </p>
          <p className="text-sm text-muted-foreground mb-4">
            Yarın 09:00'da yenilenir. Woof limiti, kaliteli eşleşmeler için var.
          </p>

          {/* Plus Play Teaser */}
          <div className="rounded-xl bg-muted/50 p-4 mt-4">
            <p className="text-xs text-muted-foreground">
              🚀 Yakında: sınırsız woof + harita görünümü
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">Plus Play</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-primary py-3 font-medium text-primary-foreground"
        >
          Tamam
        </button>
      </div>
    </div>
  );
}

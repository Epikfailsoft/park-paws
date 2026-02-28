import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Syringe, Stethoscope, Bug, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DogCare {
  dog_id: string;
  vaccination_status: 'up_to_date' | 'due_soon' | 'overdue' | 'unknown';
  vaccination_date: string | null;
  vaccination_next_date: string | null;
  last_vet_visit: string | null;
  parasite_protection_date: string | null;
  parasite_protection_next_date: string | null;
  notes: string | null;
  updated_at: string;
}

interface CareCenterProps {
  dogId: string;
  parkActivityDays?: number; // from last 7 days
}

const VAX_STATUS_MAP = {
  up_to_date: { label: 'Güncel', color: 'text-primary bg-primary/10', icon: '✅' },
  due_soon: { label: 'Yakında', color: 'text-[hsl(var(--park-requested))] bg-[hsl(var(--park-requested))]/10', icon: '⚠️' },
  overdue: { label: 'Gecikmiş', color: 'text-destructive bg-destructive/10', icon: '❌' },
  unknown: { label: 'Bilinmiyor', color: 'text-muted-foreground bg-muted', icon: '❓' },
};

function calculateCareScore(care: DogCare | null, parkActivityDays: number): number {
  if (!care) return 0;
  let score = 0;
  // +40 vaccines up to date
  if (care.vaccination_status === 'up_to_date') score += 40;
  else if (care.vaccination_status === 'due_soon') score += 20;
  // +20 vet visit within 12 months
  if (care.last_vet_visit) {
    const lastVisit = new Date(care.last_vet_visit);
    const monthsAgo = (Date.now() - lastVisit.getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo <= 12) score += 20;
    else if (monthsAgo <= 18) score += 10;
  }
  // +20 parasite protection active
  if (care.parasite_protection_next_date) {
    const nextDate = new Date(care.parasite_protection_next_date);
    if (nextDate > new Date()) score += 20;
    else score += 5;
  }
  // +20 regular park activity (at least 3/7 days)
  if (parkActivityDays >= 5) score += 20;
  else if (parkActivityDays >= 3) score += 15;
  else if (parkActivityDays >= 1) score += 10;
  return Math.min(100, score);
}

function getCareLabel(score: number): string {
  if (score >= 80) return 'Sorumlu Sahip 🏆';
  if (score >= 60) return 'İyi Bakım 👍';
  if (score >= 40) return 'Geliştirilmeli 📋';
  return 'Başlangıç 🌱';
}

export function CareCenter({ dogId, parkActivityDays = 0 }: CareCenterProps) {
  const [care, setCare] = useState<DogCare | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [vaxStatus, setVaxStatus] = useState<DogCare['vaccination_status']>('unknown');
  const [vaxDate, setVaxDate] = useState('');
  const [vaxNextDate, setVaxNextDate] = useState('');
  const [vetDate, setVetDate] = useState('');
  const [parasiteDate, setParasiteDate] = useState('');
  const [parasiteNextDate, setParasiteNextDate] = useState('');

  useEffect(() => {
    fetchCare();
  }, [dogId]);

  const fetchCare = async () => {
    try {
      const { data } = await supabase
        .from('dog_care')
        .select('*')
        .eq('dog_id', dogId)
        .maybeSingle();

      if (data) {
        const careData = data as unknown as DogCare;
        setCare(careData);
        setVaxStatus(careData.vaccination_status);
        setVaxDate(careData.vaccination_date || '');
        setVaxNextDate(careData.vaccination_next_date || '');
        setVetDate(careData.last_vet_visit || '');
        setParasiteDate(careData.parasite_protection_date || '');
        setParasiteNextDate(careData.parasite_protection_next_date || '');
      }
    } catch (error) {
      console.error('Error fetching care data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        dog_id: dogId,
        vaccination_status: vaxStatus,
        vaccination_date: vaxDate || null,
        vaccination_next_date: vaxNextDate || null,
        last_vet_visit: vetDate || null,
        parasite_protection_date: parasiteDate || null,
        parasite_protection_next_date: parasiteNextDate || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('dog_care')
        .upsert(payload as any);

      if (error) throw error;

      toast.success('Sağlık bilgileri güncellendi');
      await fetchCare();
      setEditing(false);
    } catch (error) {
      console.error('Error saving care:', error);
      toast.error('Bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const score = calculateCareScore(care, parkActivityDays);
  const scoreColor = score >= 80 ? 'text-primary' : score >= 60 ? 'text-[hsl(var(--park-requested))]' : score >= 40 ? 'text-accent' : 'text-muted-foreground';

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="h-24 animate-pulse bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-4 space-y-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* Header with Care Score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Sağlık Merkezi
          </h3>
        </div>
        <button
          onClick={() => setEditing(!editing)}
          className="text-xs text-primary font-medium"
        >
          {editing ? 'İptal' : 'Düzenle'}
        </button>
      </div>

      {/* Care Score */}
      <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
        <div>
          <p className="text-xs text-muted-foreground">Care Score</p>
          <p className={cn("text-2xl font-bold font-display", scoreColor)}>
            {score}<span className="text-sm font-normal text-muted-foreground">/100</span>
          </p>
        </div>
        <span className="text-sm font-medium text-foreground">{getCareLabel(score)}</span>
      </div>

      {editing ? (
        /* Edit Form */
        <div className="space-y-3">
          {/* Vaccination Status */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Aşı Durumu</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(VAX_STATUS_MAP) as Array<keyof typeof VAX_STATUS_MAP>).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setVaxStatus(key)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    vaxStatus === key
                      ? VAX_STATUS_MAP[key].color + ' ring-2 ring-offset-1'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {VAX_STATUS_MAP[key].icon} {VAX_STATUS_MAP[key].label}
                </button>
              ))}
            </div>
          </div>

          {/* Vaccination Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Son Aşı</label>
              <input type="date" value={vaxDate} onChange={e => setVaxDate(e.target.value)} className="dogspace-input w-full text-sm py-2" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Sonraki Aşı</label>
              <input type="date" value={vaxNextDate} onChange={e => setVaxNextDate(e.target.value)} className="dogspace-input w-full text-sm py-2" />
            </div>
          </div>

          {/* Vet Visit */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Son Veteriner Ziyareti</label>
            <input type="date" value={vetDate} onChange={e => setVetDate(e.target.value)} className="dogspace-input w-full text-sm py-2" />
          </div>

          {/* Parasite Protection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Parazit Koruma</label>
              <input type="date" value={parasiteDate} onChange={e => setParasiteDate(e.target.value)} className="dogspace-input w-full text-sm py-2" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Sonraki</label>
              <input type="date" value={parasiteNextDate} onChange={e => setParasiteNextDate(e.target.value)} className="dogspace-input w-full text-sm py-2" />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Kaydet'}
          </button>
        </div>
      ) : (
        /* View Mode */
        <div className="space-y-2.5">
          {/* Vaccination */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Syringe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Aşılar</span>
            </div>
            <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", VAX_STATUS_MAP[care?.vaccination_status || 'unknown'].color)}>
              {VAX_STATUS_MAP[care?.vaccination_status || 'unknown'].icon} {VAX_STATUS_MAP[care?.vaccination_status || 'unknown'].label}
            </span>
          </div>

          {/* Vet Visit */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Son Veteriner</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {care?.last_vet_visit
                ? new Date(care.last_vet_visit).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Belirtilmedi'}
            </span>
          </div>

          {/* Parasite */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Bug className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">Parazit Koruma</span>
            </div>
            <span className={cn(
              "text-xs",
              care?.parasite_protection_next_date && new Date(care.parasite_protection_next_date) > new Date()
                ? "text-primary font-medium"
                : "text-muted-foreground"
            )}>
              {care?.parasite_protection_next_date
                ? new Date(care.parasite_protection_next_date) > new Date()
                  ? `✅ ${new Date(care.parasite_protection_next_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} kadar`
                  : '⚠️ Süresi dolmuş'
                : 'Belirtilmedi'}
            </span>
          </div>

          {!care && (
            <button
              onClick={() => setEditing(true)}
              className="w-full mt-2 rounded-xl bg-primary/10 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary/20"
            >
              Sağlık Bilgilerini Ekle
            </button>
          )}
        </div>
      )}
    </div>
  );
}

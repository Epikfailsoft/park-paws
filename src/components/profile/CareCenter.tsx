import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Syringe, Stethoscope, Bug, Loader2, TrendingUp } from 'lucide-react';
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
  parkActivityDays?: number;
}

const VAX_STATUS_MAP = {
  up_to_date: { label: 'Güncel', color: 'bg-primary/15 text-primary', icon: '✅' },
  due_soon: { label: 'Yakında', color: 'bg-harmony/15 text-harmony', icon: '⚠️' },
  overdue: { label: 'Gecikmiş', color: 'bg-destructive/15 text-destructive', icon: '❌' },
  unknown: { label: 'Bilinmiyor', color: 'bg-muted text-muted-foreground', icon: '❓' },
};

function calculateCareScore(care: DogCare | null, parkActivityDays: number): number {
  if (!care) return 0;
  let score = 0;
  if (care.vaccination_status === 'up_to_date') score += 40;
  else if (care.vaccination_status === 'due_soon') score += 20;
  if (care.last_vet_visit) {
    const monthsAgo = (Date.now() - new Date(care.last_vet_visit).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsAgo <= 12) score += 20;
    else if (monthsAgo <= 18) score += 10;
  }
  if (care.parasite_protection_next_date) {
    if (new Date(care.parasite_protection_next_date) > new Date()) score += 20;
    else score += 5;
  }
  if (parkActivityDays >= 5) score += 20;
  else if (parkActivityDays >= 3) score += 15;
  else if (parkActivityDays >= 1) score += 10;
  return Math.min(100, score);
}

function getCareLabel(score: number): { text: string; emoji: string } {
  if (score >= 80) return { text: 'Sorumlu Aile', emoji: '🏆' };
  if (score >= 60) return { text: 'İyi Bakım', emoji: '👍' };
  if (score >= 40) return { text: 'Geliştirilmeli', emoji: '📋' };
  return { text: 'Başlangıç', emoji: '🌱' };
}

function getScoreGradient(score: number): string {
  if (score >= 80) return 'var(--gradient-hero)';
  if (score >= 60) return 'linear-gradient(135deg, hsl(42 95% 55%), hsl(28 90% 55%))';
  if (score >= 40) return 'linear-gradient(135deg, hsl(14 90% 58%), hsl(340 80% 58%))';
  return 'linear-gradient(135deg, hsl(220 10% 65%), hsl(220 10% 55%))';
}

export function CareCenter({ dogId, parkActivityDays = 0 }: CareCenterProps) {
  const [care, setCare] = useState<DogCare | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vaxStatus, setVaxStatus] = useState<DogCare['vaccination_status']>('unknown');
  const [vaxDate, setVaxDate] = useState('');
  const [vaxNextDate, setVaxNextDate] = useState('');
  const [vetDate, setVetDate] = useState('');
  const [parasiteDate, setParasiteDate] = useState('');
  const [parasiteNextDate, setParasiteNextDate] = useState('');

  useEffect(() => { fetchCare(); }, [dogId]);

  const fetchCare = async () => {
    try {
      const { data } = await supabase.from('dog_care').select('*').eq('dog_id', dogId).maybeSingle();
      if (data) {
        const c = data as unknown as DogCare;
        setCare(c);
        setVaxStatus(c.vaccination_status);
        setVaxDate(c.vaccination_date || '');
        setVaxNextDate(c.vaccination_next_date || '');
        setVetDate(c.last_vet_visit || '');
        setParasiteDate(c.parasite_protection_date || '');
        setParasiteNextDate(c.parasite_protection_next_date || '');
      }
    } catch (error) { console.error('Error fetching care:', error); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('dog_care').upsert({
        dog_id: dogId, vaccination_status: vaxStatus,
        vaccination_date: vaxDate || null, vaccination_next_date: vaxNextDate || null,
        last_vet_visit: vetDate || null, parasite_protection_date: parasiteDate || null,
        parasite_protection_next_date: parasiteNextDate || null, updated_at: new Date().toISOString(),
      } as any);
      if (error) throw error;
      toast.success('Sağlık bilgileri güncellendi');
      await fetchCare(); setEditing(false);
    } catch (error) { console.error('Error saving care:', error); toast.error('Bir hata oluştu'); }
    finally { setSaving(false); }
  };

  const score = calculateCareScore(care, parkActivityDays);
  const careLabel = getCareLabel(score);

  if (loading) {
    return <div className="section-card"><div className="h-24 animate-pulse bg-muted rounded-xl" /></div>;
  }

  return (
    <div className="section-card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15">
            <Shield className="h-3.5 w-3.5 text-primary" />
          </span>
          Sağlık Merkezi
        </h3>
        <button onClick={() => setEditing(!editing)} className="text-xs text-primary font-semibold hover:underline">
          {editing ? 'İptal' : 'Düzenle'}
        </button>
      </div>

      {/* Care Score - Big & Bold */}
      <div className="relative overflow-hidden rounded-2xl p-4" style={{ background: getScoreGradient(score) }}>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-white/70">Care Score</p>
            <p className="text-4xl font-extrabold text-white font-display">
              {score}<span className="text-lg font-normal text-white/60">/100</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-3xl">{careLabel.emoji}</span>
            <p className="text-sm font-semibold text-white mt-1">{careLabel.text}</p>
          </div>
        </div>
        {/* Score bar */}
        <div className="relative z-10 mt-3 h-2 rounded-full bg-white/20">
          <div className="h-full rounded-full bg-white/80 transition-all duration-700" style={{ width: `${score}%` }} />
        </div>
        {/* Decorative circle */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aşı Durumu</label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(VAX_STATUS_MAP) as Array<keyof typeof VAX_STATUS_MAP>).map(key => (
                <button key={key} type="button" onClick={() => setVaxStatus(key)}
                  className={cn("rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                    vaxStatus === key ? VAX_STATUS_MAP[key].color + ' ring-2 ring-offset-1' : 'bg-muted text-muted-foreground'
                  )}>
                  {VAX_STATUS_MAP[key].icon} {VAX_STATUS_MAP[key].label}
                </button>
              ))}
            </div>
          </div>
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
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Son Veteriner Ziyareti</label>
            <input type="date" value={vetDate} onChange={e => setVetDate(e.target.value)} className="dogspace-input w-full text-sm py-2" />
          </div>
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
          <button onClick={handleSave} disabled={saving}
            className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--gradient-hero)' }}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : 'Kaydet'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Health items with icons */}
          {[
            { icon: Syringe, label: 'Aşılar', value: VAX_STATUS_MAP[care?.vaccination_status || 'unknown'], iconColor: 'text-primary' },
            { icon: Stethoscope, label: 'Son Veteriner', iconColor: 'text-accent',
              customValue: care?.last_vet_visit 
                ? new Date(care.last_vet_visit).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Belirtilmedi' },
            { icon: Bug, label: 'Parazit Koruma', iconColor: 'text-harmony',
              customValue: care?.parasite_protection_next_date
                ? new Date(care.parasite_protection_next_date) > new Date()
                  ? `✅ ${new Date(care.parasite_protection_next_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} kadar`
                  : '⚠️ Süresi dolmuş'
                : 'Belirtilmedi' },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-card", item.iconColor)}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              {item.customValue ? (
                <span className="text-xs font-medium text-muted-foreground">{item.customValue}</span>
              ) : (
                <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", item.value!.color)}>
                  {item.value!.icon} {item.value!.label}
                </span>
              )}
            </div>
          ))}

          {!care && (
            <button onClick={() => setEditing(true)}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all"
              style={{ background: 'var(--gradient-hero)', color: 'white' }}>
              + Sağlık Bilgilerini Ekle
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MapPin, Compass, Loader2, Zap, AlertTriangle, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { validateTurkishPhone } from '@/lib/upload-validation';
import type { Dog, Park } from '@/types/dogspace';
import { 
  isPlaydateActive, 
  getPlaydateRemainingHours,
  isParkCheckinActive,
  getParkCheckinRemainingMinutes,
  formatTimeRemaining,
} from '@/types/dogspace';

interface StatusPulseProps {
  dog: Dog;
  selectedPark: Park | null;
  onRefresh: () => void;
}

export function StatusPulse({ dog, selectedPark, onRefresh }: StatusPulseProps) {
  const [loading, setLoading] = useState<'playdate' | 'checkin' | 'lost' | null>(null);
  const [showLostConfirm, setShowLostConfirm] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [fetchingPhone, setFetchingPhone] = useState(false);

  const playdateActive = isPlaydateActive(dog);
  const parkActive = isParkCheckinActive(dog);
  const playdateHoursLeft = getPlaydateRemainingHours(dog);
  const parkMinutesLeft = getParkCheckinRemainingMinutes(dog);

  // Fetch existing emergency phone when lost mode dialog opens
  const fetchExistingPhone = useCallback(async () => {
    setFetchingPhone(true);
    try {
      const { data } = await supabase
        .from('dog_private')
        .select('emergency_phone')
        .eq('dog_id', dog.id)
        .single();
      if (data?.emergency_phone) {
        setEmergencyPhone(data.emergency_phone);
      }
    } catch (err) {
      // Try dog_lost_profile as fallback
      try {
        const { data } = await supabase
          .from('dog_lost_profile')
          .select('emergency_phone')
          .eq('dog_id', dog.id)
          .single();
        if (data?.emergency_phone) {
          setEmergencyPhone(data.emergency_phone);
        }
      } catch { /* no existing phone */ }
    } finally {
      setFetchingPhone(false);
    }
  }, [dog.id]);

  const togglePlaydate = async () => {
    setLoading('playdate');
    try {
      const { data, error } = await supabase.rpc('toggle_playdate', { p_dog_id: dog.id, p_activate: !playdateActive });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      toast.success(playdateActive ? 'Playdate kapatıldı' : 'Playdate açık! 24 saat boyunca görünürsün.');
      onRefresh();
    } catch (error) {
      console.error('Error toggling playdate:', error);
      toast.error('Bir hata oluştu');
    } finally { setLoading(null); }
  };

  const toggleParkCheckin = async () => {
    if (!selectedPark) { toast.error('Önce bir park seçmelisin'); return; }
    setLoading('checkin');
    try {
      const { data, error } = await supabase.rpc('toggle_park_checkin', { p_dog_id: dog.id, p_park_id: selectedPark.id, p_activate: !parkActive });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      toast.success(parkActive ? 'Parktan çıkış yapıldı' : `${selectedPark.name}'da aktifsin!`);
      onRefresh();
    } catch (error) {
      console.error('Error toggling park check-in:', error);
      toast.error('Bir hata oluştu');
    } finally { setLoading(null); }
  };

  const handleLostToggle = () => {
    if (dog.is_lost) {
      confirmLostMode(false);
    } else {
      setShowLostConfirm(true);
      fetchExistingPhone();
    }
  };

  const confirmLostMode = async (enable: boolean) => {
    if (enable) {
      const phoneValidation = validateTurkishPhone(emergencyPhone);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || 'Geçersiz telefon numarası');
        return;
      }
    }
    setLoading('lost');
    try {
      const { data, error } = await supabase.rpc('toggle_lost_mode', { 
        p_dog_id: dog.id, p_enable: enable,
        p_emergency_phone: enable ? emergencyPhone : '05001234567',
      });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      toast.success(enable ? '🔴 Kayıp modu aktif!' : 'Kayıp modu kapatıldı');
      setShowLostConfirm(false);
      setEmergencyPhone('');
      setPhoneError('');
      onRefresh();
    } catch (error) {
      console.error('Error toggling lost mode:', error);
      toast.error('Bir hata oluştu');
    } finally { setLoading(null); }
  };

  return (
    <>
      <div className="section-card space-y-3">
        <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: 'var(--gradient-hero)' }}>
            <Zap className="h-3.5 w-3.5 text-white" />
          </span>
          Durum Kontrol
        </h3>

        <div className="space-y-2">
          {/* Playdate Toggle */}
          <button onClick={togglePlaydate} disabled={loading === 'playdate'}
            className={cn("flex w-full items-center justify-between rounded-xl p-4 transition-all",
              playdateActive ? "text-white shadow-lg" : "bg-muted/50 text-foreground hover:bg-muted"
            )} style={playdateActive ? { background: 'hsl(var(--page-discover))' } : {}}>
            <div className="flex items-center gap-3">
              <Compass className="h-5 w-5" />
              <div className="text-left">
                <p className="font-semibold text-sm">Playdate</p>
                <p className={cn("text-xs", playdateActive ? "text-white/80" : "text-muted-foreground")}>
                  {playdateActive ? `${playdateHoursLeft}s kaldı` : 'Kapalı'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading === 'playdate' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold",
                  playdateActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>{playdateActive ? 'ON' : 'OFF'}</span>
              )}
            </div>
          </button>

          {/* Park Check-in Toggle */}
          <button onClick={toggleParkCheckin} disabled={loading === 'checkin' || !selectedPark}
            className={cn("flex w-full items-center justify-between rounded-xl p-4 transition-all",
              parkActive ? "text-white shadow-lg" : "bg-muted/50 text-foreground hover:bg-muted",
              !selectedPark && "opacity-40"
            )} style={parkActive ? { background: 'hsl(var(--page-park))' } : {}}>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5" />
              <div className="text-left">
                <p className="font-semibold text-sm">Park Check-in</p>
                <p className={cn("text-xs", parkActive ? "text-white/80" : "text-muted-foreground")}>
                  {parkActive ? `${formatTimeRemaining(parkMinutesLeft)} kaldı` : selectedPark ? 'Parkta değilsin' : 'Önce park seç'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading === 'checkin' ? <Loader2 className="h-4 w-4 animate-spin" /> : parkActive ? (
                <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                  </span>IN
                </span>
              ) : <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">OUT</span>}
            </div>
          </button>

          {/* Lost Mode Toggle */}
          <button onClick={handleLostToggle} disabled={loading === 'lost'}
            className={cn("flex w-full items-center justify-between rounded-xl p-4 transition-all",
              dog.is_lost ? "bg-destructive text-white shadow-lg animate-pulse" : "bg-muted/50 text-foreground hover:bg-destructive/10"
            )}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5" />
              <div className="text-left">
                <p className="font-semibold text-sm">Kayıp Modu</p>
                <p className={cn("text-xs", dog.is_lost ? "text-white/80" : "text-muted-foreground")}>
                  {dog.is_lost ? 'Acil durum aktif' : 'Bildir'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {loading === 'lost' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <span className={cn("rounded-full px-3 py-1 text-xs font-bold",
                  dog.is_lost ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>{dog.is_lost ? 'ON' : 'OFF'}</span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Lost Mode Confirmation Modal */}
      {showLostConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4">
          <div className="max-w-sm w-full rounded-2xl bg-card p-6">
            <h2 className="text-xl font-bold text-foreground mb-2">⚠️ Kayıp Modu Aktif Et</h2>
            <p className="text-sm text-muted-foreground mb-4">Telefon numaran yalnızca parkta aktif olan kullanıcılara görünecektir.</p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  <Phone className="inline h-4 w-4 mr-1" />Acil Telefon Numarası
                </label>
                {fetchingPhone ? (
                  <div className="flex items-center gap-2 py-2"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Numara yükleniyor...</span></div>
                ) : (
                  <input type="tel" placeholder="+905XXXXXXXXX veya 05XXXXXXXXX" value={emergencyPhone}
                    onChange={(e) => { setEmergencyPhone(e.target.value); setPhoneError(''); }}
                    className="dogspace-input w-full" />
                )}
                {phoneError && <p className="mt-1 text-sm text-destructive">{phoneError}</p>}
              </div>
              {selectedPark && (
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">Son görüldüğü park: <span className="font-medium text-foreground">{selectedPark.name}</span></p>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowLostConfirm(false); setPhoneError(''); setEmergencyPhone(''); }}
                className="flex-1 rounded-xl border border-border py-3 font-medium text-foreground">İptal</button>
              <button onClick={() => confirmLostMode(true)} disabled={loading === 'lost' || !emergencyPhone.trim()}
                className="flex-1 rounded-xl bg-destructive py-3 font-semibold text-destructive-foreground disabled:opacity-50">
                {loading === 'lost' ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Aktif Et'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

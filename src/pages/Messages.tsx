import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OwnerChip } from '@/components/ui/OwnerChip';
import { MessageCircle, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Harmony, Dog, Profile, Message } from '@/types/dogspace';
import { TEMPLATES, RATE_LIMITS } from '@/types/dogspace';

interface HarmonyWithDogs extends Harmony {
  dog_1: Dog & { owner: Profile };
  dog_2: Dog & { owner: Profile };
  messages: Message[];
}

export default function Messages() {
  const { profile, dogs } = useAuth();
  const [harmonies, setHarmonies] = useState<HarmonyWithDogs[]>([]);
  const [selectedHarmony, setSelectedHarmony] = useState<HarmonyWithDogs | null>(null);
  const [templatesRemaining, setTemplatesRemaining] = useState<number>(RATE_LIMITS.DAILY_TEMPLATES);
  const [loading, setLoading] = useState(true);

  const myDog = dogs[0];

  useEffect(() => {
    if (myDog) {
      fetchHarmonies();
      fetchTemplateCount();
    }
  }, [myDog]);

  const fetchHarmonies = async () => {
    if (!myDog) return;

    try {
      const { data, error } = await supabase
        .from('harmonies')
        .select(`
          *,
          dog_1:dogs!harmonies_dog_1_id_fkey(*, owner:profiles!dogs_owner_id_fkey(*)),
          dog_2:dogs!harmonies_dog_2_id_fkey(*, owner:profiles!dogs_owner_id_fkey(*)),
          messages(*)
        `)
        .or(`dog_1_id.eq.${myDog.id},dog_2_id.eq.${myDog.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHarmonies((data as unknown as HarmonyWithDogs[]) || []);
    } catch (error) {
      console.error('Error fetching harmonies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateCount = async () => {
    if (!myDog) return;

    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('daily_template_counts')
      .select('count')
      .eq('dog_id', myDog.id)
      .eq('date', today)
      .single();

    if (data) {
      setTemplatesRemaining(RATE_LIMITS.DAILY_TEMPLATES - data.count);
    }
  };

  const getOtherDog = (harmony: HarmonyWithDogs): Dog & { owner: Profile } => {
    return harmony.dog_1.id === myDog?.id ? harmony.dog_2 : harmony.dog_1;
  };

  const getNextTemplate = (harmony: HarmonyWithDogs): number | null => {
    const sentTemplates = harmony.messages
      .filter(m => m.from_dog_id === myDog?.id)
      .map(m => m.template_number);
    
    for (let i = 1; i <= 3; i++) {
      if (!sentTemplates.includes(i as 1 | 2 | 3)) return i;
    }
    return null;
  };

  const handleSendTemplate = async (harmony: HarmonyWithDogs) => {
    if (!myDog || templatesRemaining <= 0) {
      toast.error('Bugünlük mesaj hakkın bitti!');
      return;
    }

    const templateNum = getNextTemplate(harmony);
    if (!templateNum) {
      toast.info('Tüm mesajları gönderdin!');
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          harmony_id: harmony.id,
          from_dog_id: myDog.id,
          template_number: templateNum,
        });

      if (error) throw error;

      // Update template count
      const today = new Date().toISOString().split('T')[0];
      await supabase
        .from('daily_template_counts')
        .upsert({
          dog_id: myDog.id,
          date: today,
          count: RATE_LIMITS.DAILY_TEMPLATES - templatesRemaining + 1,
        }, {
          onConflict: 'dog_id,date',
        });

      setTemplatesRemaining(prev => prev - 1);
      toast.success('Mesaj gönderildi!');
      fetchHarmonies();
    } catch (error) {
      console.error('Error sending template:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleQuickReply = async (harmony: HarmonyWithDogs, messageId: string, reply: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ template_response: reply })
        .eq('id', messageId);

      if (error) throw error;

      toast.success('Yanıt gönderildi!');
      fetchHarmonies();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Detail view
  if (selectedHarmony) {
    const otherDog = getOtherDog(selectedHarmony);
    const sortedMessages = [...selectedHarmony.messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const nextTemplate = getNextTemplate(selectedHarmony);

    return (
      <div className="flex min-h-screen flex-col bg-background safe-top">
        {/* Chat Header */}
        <header className="sticky top-0 z-40 glass border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedHarmony(null)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground"
            >
              ←
            </button>
            <img
              src={otherDog.photo_url}
              alt={otherDog.name}
              className="h-10 w-10 rounded-xl object-cover"
            />
            <div className="flex-1">
              <h2 className="font-display font-semibold text-foreground">
                {otherDog.name}
              </h2>
              <OwnerChip owner={otherDog.owner} />
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 safe-bottom">
          {sortedMessages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Henüz mesaj yok. İlk adımı sen at!
              </p>
            </div>
          ) : (
            sortedMessages.map((message) => {
              const isMine = message.from_dog_id === myDog?.id;
              const template = TEMPLATES[message.template_number as 1 | 2 | 3];
              
              return (
                <div key={message.id} className="space-y-2">
                  {/* Template message */}
                  <div className={cn("template-bubble", isMine ? "template-bubble-sent" : "template-bubble-received")}>
                    {template.text}
                  </div>
                  
                  {/* Response */}
                  {message.template_response ? (
                    <div className={cn("template-bubble", !isMine ? "template-bubble-sent" : "template-bubble-received")}>
                      {message.template_response}
                    </div>
                  ) : !isMine && (
                    /* Quick replies for received messages */
                    <div className="flex flex-wrap gap-2 pl-2">
                      {template.replies.map((reply) => (
                        <button
                          key={reply}
                          onClick={() => handleQuickReply(selectedHarmony, message.id, reply)}
                          className="quick-reply"
                        >
                          {reply}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Send next template */}
        {nextTemplate && (
          <div className="sticky bottom-0 border-t bg-card px-4 py-3">
            <button
              onClick={() => handleSendTemplate(selectedHarmony)}
              disabled={templatesRemaining <= 0}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Sonraki mesajı gönder ({templatesRemaining} kaldı)
            </button>
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <MessageCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold text-foreground">
                Mesajlar
              </h1>
              <p className="text-xs text-muted-foreground">
                Playdate planla
              </p>
            </div>
          </div>
          <div className="rounded-full bg-secondary px-3 py-1.5">
            <span className="text-sm font-medium text-secondary-foreground">
              ✉️ {templatesRemaining} kaldı
            </span>
          </div>
        </div>
      </header>

      {/* Harmonies List */}
      <div className="px-4 py-4">
        {harmonies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-harmony/20">
              <span className="text-3xl">🐕</span>
            </div>
            <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
              Henüz eşleşme yok
            </h2>
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Keşfet sayfasından köpeklere el salla. Karşılıklı el sallama = Harmony!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {harmonies.map((harmony) => {
              const otherDog = getOtherDog(harmony);
              const lastMessage = harmony.messages[harmony.messages.length - 1];
              const hasUnread = lastMessage && !lastMessage.template_response && lastMessage.from_dog_id !== myDog?.id;

              return (
                <button
                  key={harmony.id}
                  onClick={() => setSelectedHarmony(harmony)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left transition-all",
                    hasUnread && "ring-2 ring-harmony"
                  )}
                  style={{ boxShadow: 'var(--shadow-card)' }}
                >
                  <div className="relative">
                    <img
                      src={otherDog.photo_url}
                      alt={otherDog.name}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                    {hasUnread && (
                      <span className="absolute -right-1 -top-1 flex h-3 w-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-harmony opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-harmony" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-foreground">
                        {otherDog.name}
                      </h3>
                      <span className="text-xs text-harmony">✨ Harmony</span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {lastMessage 
                        ? lastMessage.template_response || TEMPLATES[lastMessage.template_number as 1 | 2 | 3].text
                        : "Mesajlaşmaya başla..."
                      }
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

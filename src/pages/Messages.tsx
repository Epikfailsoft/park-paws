import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OwnerChip } from '@/components/ui/OwnerChip';
import { MessageCircle, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Harmony, Dog, Profile, Message } from '@/types/dogspace';
import { TEMPLATES, RATE_LIMITS, formatOwnerName } from '@/types/dogspace';

interface HarmonyWithDogs extends Harmony {
  dog_a: Dog & { owner: Profile };
  dog_b: Dog & { owner: Profile };
  messages: Message[];
}

export default function Messages() {
  const { profile, dogs } = useAuth();
  const [harmonies, setHarmonies] = useState<HarmonyWithDogs[]>([]);
  const [selectedHarmony, setSelectedHarmony] = useState<HarmonyWithDogs | null>(null);
  const [sentTemplates, setSentTemplates] = useState<number[]>([]);
  const [templatesRemaining, setTemplatesRemaining] = useState<number>(RATE_LIMITS.DAILY_TEMPLATES);
  const [loading, setLoading] = useState(true);

  const myDog = dogs[0];

  useEffect(() => {
    if (myDog) {
      fetchHarmonies();
    } else {
      setLoading(false);
    }
  }, [myDog]);

  const fetchHarmonies = async () => {
    if (!myDog) return;

    try {
      const { data, error } = await supabase
        .from('harmonies')
        .select(`
          *,
          dog_a:dogs!harmonies_dog_a_id_fkey(*, owner:profiles(*), breed:breeds(*)),
          dog_b:dogs!harmonies_dog_b_id_fkey(*, owner:profiles(*), breed:breeds(*)),
          messages(*)
        `)
        .or(`dog_a_id.eq.${myDog.id},dog_b_id.eq.${myDog.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHarmonies((data as unknown as HarmonyWithDogs[]) || []);
    } catch (error) {
      console.error('Error fetching harmonies:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateSequence = async (harmonyId: string) => {
    if (!profile) return;

    const { data } = await supabase
      .from('template_sequence')
      .select('sent_templates')
      .eq('harmony_id', harmonyId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (data) {
      setSentTemplates(data.sent_templates || []);
    } else {
      setSentTemplates([]);
    }
  };

  const getOtherDog = (harmony: HarmonyWithDogs): Dog & { owner: Profile } => {
    return harmony.dog_a.id === myDog?.id ? harmony.dog_b : harmony.dog_a;
  };

  const getNextTemplate = (): number | null => {
    for (let i = 1; i <= 3; i++) {
      if (!sentTemplates.includes(i)) return i;
    }
    return null;
  };

  const canSendTemplate = (templateId: number): boolean => {
    // Check if all previous templates have been sent
    for (let i = 1; i < templateId; i++) {
      if (!sentTemplates.includes(i)) return false;
    }
    return !sentTemplates.includes(templateId);
  };

  const handleSendTemplate = async (harmony: HarmonyWithDogs, templateId: number) => {
    if (!profile || templatesRemaining <= 0) {
      toast.error('Bugünlük mesaj hakkın bitti!');
      return;
    }

    if (!canSendTemplate(templateId)) {
      toast.error('Önce önceki mesajları göndermelisin!');
      return;
    }

    const template = TEMPLATES[templateId as 1 | 2 | 3];

    try {
      // Create message
      const { error } = await supabase
        .from('messages')
        .insert({
          harmony_id: harmony.id,
          sender_id: profile.id,
          message_type: 'template',
          template_id: templateId,
          content: template.text,
        });

      if (error) throw error;

      // Update template sequence
      const newSentTemplates = [...sentTemplates, templateId];
      await supabase
        .from('template_sequence')
        .upsert({
          harmony_id: harmony.id,
          user_id: profile.id,
          sent_templates: newSentTemplates,
        });

      setSentTemplates(newSentTemplates);
      setTemplatesRemaining(prev => prev - 1);
      toast.success('Mesaj gönderildi!');
      fetchHarmonies();
    } catch (error) {
      console.error('Error sending template:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const handleQuickReply = async (harmony: HarmonyWithDogs, messageId: string, reply: string) => {
    if (!profile) return;

    try {
      // Create reply message
      const { error } = await supabase
        .from('messages')
        .insert({
          harmony_id: harmony.id,
          sender_id: profile.id,
          message_type: 'reply',
          content: reply,
        });

      if (error) throw error;

      toast.success('Yanıt gönderildi!');
      fetchHarmonies();
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Bir hata oluştu');
    }
  };

  const openHarmonyDetail = async (harmony: HarmonyWithDogs) => {
    setSelectedHarmony(harmony);
    await fetchTemplateSequence(harmony.id);
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
    const nextTemplate = getNextTemplate();

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
              <p className="text-xs text-muted-foreground">
                {formatOwnerName(otherDog.owner.display_name, otherDog.owner.last_name)}
              </p>
            </div>
          </div>
        </header>

        {/* Template Selection */}
        <div className="p-4 bg-secondary/30 border-b">
          <h3 className="font-semibold text-sm mb-3">Template Mesajlar (Sırayla)</h3>
          <div className="space-y-2">
            {([1, 2, 3] as const).map((templateId) => {
              const template = TEMPLATES[templateId];
              const alreadySent = sentTemplates.includes(templateId);
              const canSend = canSendTemplate(templateId);

              return (
                <button
                  key={templateId}
                  onClick={() => handleSendTemplate(selectedHarmony, templateId)}
                  disabled={!canSend || alreadySent || templatesRemaining <= 0}
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-xl text-sm transition-all",
                    alreadySent
                      ? "bg-primary/20 text-primary border border-primary"
                      : canSend
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {alreadySent && '✅ '}
                  {!canSend && !alreadySent && '🔒 '}
                  {templateId}. {template.text}
                </button>
              );
            })}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 safe-bottom">
          {sortedMessages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Henüz mesaj yok. Yukarıdan template seç!
              </p>
            </div>
          ) : (
            sortedMessages.map((message) => {
              const isMine = message.sender_id === profile?.id;
              const template = message.template_id ? TEMPLATES[message.template_id as 1 | 2 | 3] : null;

              return (
                <div key={message.id} className="space-y-2">
                  {/* Message */}
                  <div className={cn("template-bubble", isMine ? "template-bubble-sent" : "template-bubble-received")}>
                    {message.content}
                  </div>

                  {/* Quick replies for received template messages */}
                  {!isMine && message.message_type === 'template' && template && (
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

        {/* Remaining indicator */}
        <div className="sticky bottom-0 border-t bg-card px-4 py-3 text-center">
          <p className="text-sm text-muted-foreground">
            ✉️ {templatesRemaining} mesaj hakkı kaldı
          </p>
        </div>
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
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--harmony))]/20">
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
              const hasUnread = lastMessage && lastMessage.sender_id !== profile?.id;

              return (
                <button
                  key={harmony.id}
                  onClick={() => openHarmonyDetail(harmony)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left transition-all",
                    hasUnread && "ring-2 ring-[hsl(var(--harmony))]"
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
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--harmony))] opacity-75" />
                        <span className="relative inline-flex h-3 w-3 rounded-full bg-[hsl(var(--harmony))]" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-foreground">
                        {otherDog.name}
                      </h3>
                      <span className="text-xs text-[hsl(var(--harmony))]">✨ Harmony</span>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {lastMessage
                        ? lastMessage.content
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

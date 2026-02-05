import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { OwnerChip } from '@/components/ui/OwnerChip';
import { MessageCircle, Loader2, Send, Image } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Harmony, Dog, Profile, Message } from '@/types/dogspace';
import { formatOwnerName, QUICK_ACTIONS } from '@/types/dogspace';

interface HarmonyWithDogs extends Harmony {
  dog_a: Dog & { owner: Profile };
  dog_b: Dog & { owner: Profile };
  messages: Message[];
}

export default function Messages() {
  const { profile, dogs } = useAuth();
  const [harmonies, setHarmonies] = useState<HarmonyWithDogs[]>([]);
  const [selectedHarmony, setSelectedHarmony] = useState<HarmonyWithDogs | null>(null);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const myDog = dogs[0];

  useEffect(() => {
    if (myDog) {
      fetchHarmonies();
    } else {
      setLoading(false);
    }
  }, [myDog]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedHarmony?.messages]);

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

  const getOtherDog = (harmony: HarmonyWithDogs): Dog & { owner: Profile } => {
    return harmony.dog_a.id === myDog?.id ? harmony.dog_b : harmony.dog_a;
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedHarmony || !profile || !content.trim()) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .rpc('send_message', {
          p_harmony_id: selectedHarmony.id,
          p_content: content.trim()
        });

      if (error) throw error;

      const result = data as { status: string; message: string };
      
      if (result.status === 'ERROR') {
        toast.error(result.message);
        return;
      }

      setMessageText('');
      
      // Refresh messages
      const { data: updatedHarmony } = await supabase
        .from('harmonies')
        .select(`
          *,
          dog_a:dogs!harmonies_dog_a_id_fkey(*, owner:profiles(*), breed:breeds(*)),
          dog_b:dogs!harmonies_dog_b_id_fkey(*, owner:profiles(*), breed:breeds(*)),
          messages(*)
        `)
        .eq('id', selectedHarmony.id)
        .single();

      if (updatedHarmony) {
        setSelectedHarmony(updatedHarmony as unknown as HarmonyWithDogs);
      }
      
      fetchHarmonies();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'suggest_park') {
      setMessageText('Hangi park size daha uygun?');
    } else if (actionId === 'suggest_time') {
      setMessageText('Hangi zaman aralığı daha iyi olur?');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Chat view
  if (selectedHarmony) {
    const otherDog = getOtherDog(selectedHarmony);
    const sortedMessages = [...selectedHarmony.messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

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

        {/* Quick Actions */}
        <div className="p-3 bg-secondary/30 border-b flex gap-2 overflow-x-auto no-scrollbar">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action.id)}
              className="flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-sm whitespace-nowrap"
            >
              <span>{action.icon}</span>
              {action.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {sortedMessages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                Henüz mesaj yok. Sohbete başla!
              </p>
            </div>
          ) : (
            sortedMessages.map((message) => {
              const isMine = message.sender_id === profile?.id;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "template-bubble",
                    isMine ? "template-bubble-sent" : "template-bubble-received"
                  )}
                >
                  {message.content}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="sticky bottom-0 border-t bg-card px-4 py-3 safe-bottom">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Mesaj yaz..."
              className="flex-1 rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(messageText);
                }
              }}
            />
            <button
              onClick={() => handleSendMessage(messageText)}
              disabled={!messageText.trim() || sending}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-background safe-top safe-bottom">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <MessageCircle className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">
              Mesajlar
            </h1>
            <p className="text-xs text-muted-foreground">
              Playdate koordinasyonu
            </p>
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
              Önce köpekler eşleşir. Keşfet'ten wave gönder, karşılıklı wave = Harmony!
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
                  onClick={() => setSelectedHarmony(harmony)}
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

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, Loader2, Send, Image, X, Users, Heart, Activity } from 'lucide-react';
import dogiLogo from '@/assets/dogi-logo.png';
import { cn } from '@/lib/utils';
import { validatePhotoFile, compressImage } from '@/lib/upload-validation';
import { toast } from 'sonner';
import type { Harmony, Dog, Profile, Message } from '@/types/dogspace';
import { formatOwnerName, QUICK_ACTIONS } from '@/types/dogspace';
import { FriendList } from '@/components/social/FriendList';
import { ActivityLog } from '@/components/social/ActivityLog';
import { DogProfileModal } from '@/components/social/DogProfileModal';

interface HarmonyWithDogs extends Harmony {
  dog_a: Dog & { owner: Profile };
  dog_b: Dog & { owner: Profile };
  messages: Message[];
}

type SocialTab = 'friends' | 'chat' | 'activity';

const TEMPLATES = [
  { id: 1, text: 'Köpekler için kısa bir playdate yapalım mı?', icon: '🎾' },
  { id: 2, text: 'Hangi park size daha uygun?', icon: '🏞️' },
  { id: 3, text: 'Hangi zaman aralığı daha iyi olur?', icon: '⏰' },
];

export default function Messages() {
  const { profile, dogs, selectedPark } = useAuth();
  const [harmonies, setHarmonies] = useState<HarmonyWithDogs[]>([]);
  const [selectedHarmony, setSelectedHarmony] = useState<HarmonyWithDogs | null>(null);
  const [activeTab, setActiveTab] = useState<SocialTab>('friends');
  const [profileModalDog, setProfileModalDog] = useState<(Dog & { owner: Profile }) | null>(null);
  const [isPlusPlay, setIsPlusPlay] = useState(false); // TODO: check subscription

  useEffect(() => {
    if (selectedHarmony) {
      document.body.setAttribute('data-chat-open', 'true');
    } else {
      document.body.removeAttribute('data-chat-open');
    }
    return () => document.body.removeAttribute('data-chat-open');
  }, [selectedHarmony]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myDog = dogs[0];

  useEffect(() => {
    if (myDog) fetchHarmonies();
    else setLoading(false);
  }, [myDog]);

  useEffect(() => {
    if (!selectedHarmony) return;
    const channel = supabase
      .channel(`harmony:${selectedHarmony.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `harmony_id=eq.${selectedHarmony.id}` },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => prev.some((m) => m.id === newMessage.id) ? prev : [...prev, newMessage]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedHarmony?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (selectedHarmony) {
      setMessages([...selectedHarmony.messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()));
    }
  }, [selectedHarmony?.id]);

  const fetchHarmonies = async () => {
    if (!myDog) return;
    try {
      const { data, error } = await supabase
        .from('harmonies')
        .select(`*, dog_a:dogs!harmonies_dog_a_id_fkey(*, owner:profiles(*), breed:breeds(*)), dog_b:dogs!harmonies_dog_b_id_fkey(*, owner:profiles(*), breed:breeds(*)), messages(*)`)
        .or(`dog_a_id.eq.${myDog.id},dog_b_id.eq.${myDog.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setHarmonies(data as unknown as HarmonyWithDogs[] || []);
    } catch (error) { console.error('Error fetching harmonies:', error); }
    finally { setLoading(false); }
  };

  const getOtherDog = (harmony: HarmonyWithDogs): Dog & { owner: Profile } => {
    return harmony.dog_a.id === myDog?.id ? harmony.dog_b : harmony.dog_a;
  };

  const handleSendTemplate = async (templateId: number) => {
    if (!selectedHarmony || !profile) return;
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_template', { p_harmony_id: selectedHarmony.id, p_template_id: templateId });
      if (error) throw error;
      const result = data as { status: string; message: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      toast.success('Mesaj gönderildi');
      fetchHarmonies();
      // Refresh messages
      const template = TEMPLATES.find(t => t.id === templateId);
      if (template) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          harmony_id: selectedHarmony.id,
          sender_id: profile.id,
          message_type: 'template' as any,
          content: template.text,
          template_id: templateId,
          created_at: new Date().toISOString(),
        }]);
      }
    } catch (error) { console.error('Error sending template:', error); toast.error('Mesaj gönderilemedi'); }
    finally { setSending(false); }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedHarmony || !profile || !content.trim()) return;
    if (!isPlusPlay) {
      toast.error('Serbest mesaj yazmak için Plus Play aboneliği gerekli');
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.rpc('send_message', { p_harmony_id: selectedHarmony.id, p_content: content.trim() });
      if (error) throw error;
      const result = data as { status: string; message: string; message_id?: string };
      if (result.status === 'ERROR') { toast.error(result.message); return; }
      setMessageText('');
      if (result.message_id) {
        setMessages((prev) => [...prev, { id: result.message_id!, harmony_id: selectedHarmony.id, sender_id: profile.id, message_type: 'reply', content: content.trim(), created_at: new Date().toISOString() }]);
      }
      fetchHarmonies();
    } catch (error) { console.error('Error sending message:', error); toast.error('Mesaj gönderilemedi'); }
    finally { setSending(false); }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPlusPlay) { toast.error('Fotoğraf göndermek için Plus Play aboneliği gerekli'); return; }
    const rawFile = e.target.files?.[0];
    if (!rawFile || !selectedHarmony || !profile) return;
    const validation = validatePhotoFile(rawFile);
    if (!validation.valid) { toast.error(validation.error!); return; }
    let file: File;
    try { file = await compressImage(rawFile); } catch { toast.error('Fotoğraf işlenemedi'); return; }
    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `messages/${selectedHarmony.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('dog-photos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('dog-photos').getPublicUrl(fileName);
      // For photo messages, use send_message directly
      setSending(true);
      const { data, error } = await supabase.rpc('send_message', { p_harmony_id: selectedHarmony.id, p_content: `📷 ${publicUrl}` });
      if (error) throw error;
      toast.success('Fotoğraf gönderildi!');
    } catch (error) { console.error('Error uploading photo:', error); toast.error('Fotoğraf gönderilemedi'); }
    finally { setUploadingPhoto(false); setSending(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const renderMessageContent = (content: string) => {
    if (content.startsWith('📷 ')) {
      const url = content.replace('📷 ', '');
      return <img src={url} alt="Shared photo" className="max-w-[200px] rounded-lg cursor-pointer" onClick={() => window.open(url, '_blank')} />;
    }
    return content;
  };

  const openChatByHarmonyId = (harmonyId: string) => {
    const h = harmonies.find(h => h.id === harmonyId);
    if (h) setSelectedHarmony(h);
    else {
      // Need to fetch if not loaded yet
      setActiveTab('chat');
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Chat view
  if (selectedHarmony) {
    const otherDog = getOtherDog(selectedHarmony);
    return (
      <div className="flex min-h-screen flex-col bg-background safe-top">
        <header className="sticky top-0 z-40 glass border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedHarmony(null)} className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">←</button>
            <button onClick={() => setProfileModalDog(otherDog)} className="flex items-center gap-3 flex-1 min-w-0">
              <img src={otherDog.photo_url} alt={otherDog.name} className="h-10 w-10 rounded-xl object-cover" />
              <div className="flex-1 min-w-0 text-left">
                <h2 className="font-display font-semibold text-foreground">{otherDog.name}</h2>
                <p className="text-xs text-muted-foreground">{formatOwnerName(otherDog.owner.display_name, otherDog.owner.last_name)} · Profili gör</p>
              </div>
            </button>
          </div>
        </header>

        {/* Template buttons - always visible */}
        <div className="p-3 bg-secondary/30 border-b">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium uppercase tracking-wide">Park Koordinasyonu</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSendTemplate(t.id)}
                disabled={sending}
                className="flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-sm whitespace-nowrap hover:border-primary/50 transition-colors"
              >
                <span>{t.icon}</span>{t.text.substring(0, 30)}...
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 ?
            <div className="text-center py-8">
              <p className="text-muted-foreground text-sm">Henüz mesaj yok.</p>
              <p className="text-xs text-muted-foreground mt-1">Yukarıdaki template mesajlarla sohbete başla!</p>
            </div> :
            messages.map((message) => {
              const isMine = message.sender_id === profile?.id;
              const isTemplate = message.message_type === 'template';
              return (
                <div key={message.id} className={cn(
                  "template-bubble",
                  isMine ? "template-bubble-sent" : "template-bubble-received",
                  isTemplate && "border border-primary/20"
                )}>
                  {isTemplate && <span className="text-[10px] text-primary/60 block mb-0.5">📋 Template</span>}
                  {renderMessageContent(message.content)}
                </div>
              );
            })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="sticky bottom-0 border-t bg-card px-4 py-3 safe-bottom">
          {isPlusPlay ? (
            <div className="flex gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <Image className="h-5 w-5" />}
              </button>
              <input type="text" placeholder="Mesaj yaz..." className="flex-1 rounded-xl border-2 border-border bg-background px-4 py-2.5 text-sm focus:border-primary focus:outline-none" value={messageText} onChange={(e) => setMessageText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(messageText); } }} />
              <button onClick={() => handleSendMessage(messageText)} disabled={!messageText.trim() || sending} className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
                {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground mb-2">Serbest mesaj yazmak için Plus Play gerekli</p>
              <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-3">
                <p className="text-sm font-semibold text-primary">🚀 Plus Play · ₺99/ay</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Serbest mesajlaşma, fotoğraf paylaşımı ve daha fazlası</p>
              </div>
            </div>
          )}
        </div>
        <DogProfileModal dog={profileModalDog} onClose={() => setProfileModalDog(null)} />
      </div>
    );
  }

  const tabs: { id: SocialTab; label: string; icon: React.ReactNode }[] = [
    { id: 'friends', label: 'Arkadaşlar', icon: <Heart className="h-4 w-4" /> },
    { id: 'chat', label: 'Mesajlar', icon: <MessageCircle className="h-4 w-4" /> },
    { id: 'activity', label: 'Aktivite', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <div className="relative min-h-screen safe-top safe-bottom" style={{ background: `linear-gradient(180deg, hsl(var(--page-social-light)) 0%, hsl(var(--background)) 30%)` }}>
      <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center opacity-[0.04]">
        <img src={dogiLogo} alt="" className="h-[70vh] w-[70vh] object-contain" />
      </div>
      <header className="sticky top-0 z-40 glass border-b px-4 py-4 bg-primary">
        <div className="flex items-center gap-3">
          <img src={dogiLogo} alt="DOGI" className="h-[50px] w-[50px] rounded-xl" />
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Sosyal</h1>
            <p className="text-xs text-muted-foreground">Arkadaşlar, mesajlar ve aktivite</p>
          </div>
        </div>
      </header>

      <div className="flex border-b bg-card px-2">
        {tabs.map((tab) =>
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn("flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors border-b-2",
              activeTab === tab.id ? "text-foreground border-primary" : "text-muted-foreground border-transparent"
            )}>
            {tab.icon}{tab.label}
          </button>
        )}
      </div>

      <div className="px-4 py-4">
        {activeTab === 'friends' && <FriendList onOpenChat={openChatByHarmonyId} />}

        {activeTab === 'chat' && (
          <>
            {harmonies.length === 0 ?
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[hsl(var(--harmony))]/20"><span className="text-3xl">🐕</span></div>
                <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Henüz eşleşme yok</h2>
                <p className="max-w-[280px] text-sm text-muted-foreground">Önce köpekler eşleşir. Keşfet'ten woof gönder, karşılıklı woof = Harmony!</p>
              </div> :
              <div className="space-y-3">
                {harmonies.map((harmony) => {
                  const otherDog = getOtherDog(harmony);
                  const lastMessage = harmony.messages[harmony.messages.length - 1];
                  const hasUnread = lastMessage && lastMessage.sender_id !== profile?.id;
                  return (
                    <button key={harmony.id} onClick={() => setSelectedHarmony(harmony)}
                      className={cn("flex w-full items-center gap-3 rounded-2xl bg-card p-3 text-left transition-all", hasUnread && "ring-2 ring-[hsl(var(--harmony))]")}
                      style={{ boxShadow: 'var(--shadow-card)' }}>
                      <div className="relative">
                        <img src={otherDog.photo_url} alt={otherDog.name} className="h-14 w-14 rounded-xl object-cover" />
                        {hasUnread &&
                          <span className="absolute -right-1 -top-1 flex h-3 w-3">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--harmony))] opacity-75" />
                            <span className="relative inline-flex h-3 w-3 rounded-full bg-[hsl(var(--harmony))]" />
                          </span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display font-semibold text-foreground">{otherDog.name}</h3>
                          <span className="text-xs text-[hsl(var(--harmony))]">✨ Harmony</span>
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {lastMessage ? lastMessage.content.startsWith('📷 ') ? '📷 Fotoğraf' : lastMessage.content : "Mesajlaşmaya başla..."}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            }
          </>
        )}

        {activeTab === 'activity' && <ActivityLog />}
      </div>

      <DogProfileModal dog={profileModalDog} onClose={() => setProfileModalDog(null)} />
    </div>
  );
}

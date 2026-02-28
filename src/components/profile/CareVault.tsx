import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Plus, Trash2, Loader2, Download, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { RATE_LIMITS } from '@/types/dogspace';

interface CareDocument {
  id: string;
  dog_id: string;
  document_type: 'vaccine' | 'vet' | 'other';
  file_url: string;
  file_name: string;
  uploaded_at: string;
}

interface CareVaultProps {
  dogId: string;
  profileId: string;
}

const DOC_TYPE_LABELS = {
  vaccine: { label: 'Aşı Kartı', icon: '💉', color: 'bg-primary/15 text-primary' },
  vet: { label: 'Vet Raporu', icon: '🩺', color: 'bg-accent/15 text-accent' },
  other: { label: 'Diğer', icon: '📄', color: 'bg-harmony/15 text-harmony' },
};

export function CareVault({ dogId, profileId }: CareVaultProps) {
  const [documents, setDocuments] = useState<CareDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<'vaccine' | 'vet' | 'other'>('vaccine');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchDocuments(); }, [dogId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase.from('care_documents').select('*').eq('dog_id', dogId).order('uploaded_at', { ascending: false });
      if (error) throw error;
      setDocuments((data || []) as CareDocument[]);
    } catch (error) { console.error('Error:', error); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (documents.length >= RATE_LIMITS.CARE_VAULT_MAX_DOCS) { toast.error(`Maksimum ${RATE_LIMITS.CARE_VAULT_MAX_DOCS} belge`); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Dosya 5MB\'dan küçük olmalı'); return; }
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}/care/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('dog-photos').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('dog-photos').getPublicUrl(fileName);
      const { error: dbError } = await supabase.from('care_documents').insert({ dog_id: dogId, document_type: selectedType, file_url: publicUrl, file_name: file.name });
      if (dbError) throw dbError;
      toast.success('Belge yüklendi!'); setShowUpload(false); fetchDocuments();
    } catch (error) { console.error('Error:', error); toast.error('Yükleme başarısız'); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleDelete = async (docId: string) => {
    try {
      const { error } = await supabase.from('care_documents').delete().eq('id', docId);
      if (error) throw error;
      toast.success('Belge silindi'); fetchDocuments();
    } catch (error) { console.error('Error:', error); toast.error('Silme başarısız'); }
  };

  if (loading) {
    return <div className="section-card"><div className="h-24 animate-pulse bg-muted rounded-xl" /></div>;
  }

  return (
    <div className="section-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/15">
            <Lock className="h-3.5 w-3.5 text-accent" />
          </span>
          Care Vault
        </h3>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {documents.length}/{RATE_LIMITS.CARE_VAULT_MAX_DOCS}
        </span>
      </div>

      <div className="space-y-2">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-xl bg-muted/30 p-3 transition-all hover:bg-muted/50">
            <div className="flex items-center gap-3 min-w-0">
              <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl text-lg", DOC_TYPE_LABELS[doc.document_type].color)}>
                {DOC_TYPE_LABELS[doc.document_type].icon}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{doc.file_name}</p>
                <p className="text-xs text-muted-foreground">{DOC_TYPE_LABELS[doc.document_type].label}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all">
                <Download className="h-4 w-4" />
              </a>
              <button onClick={() => handleDelete(doc.id)}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-all">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {documents.length === 0 && !showUpload && (
          <div className="text-center py-8 rounded-xl bg-muted/20">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Aşı kartı, veteriner raporu ekle</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Belgelerin güvende</p>
          </div>
        )}
      </div>

      {showUpload && (
        <div className="mt-3 rounded-xl bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Belge Türü</p>
          <div className="flex gap-2">
            {(['vaccine', 'vet', 'other'] as const).map((type) => (
              <button key={type} onClick={() => setSelectedType(type)}
                className={cn("flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all",
                  selectedType === type ? "text-white shadow-md" : "bg-muted text-muted-foreground"
                )} style={selectedType === type ? { background: 'var(--gradient-hero)' } : {}}>
                {DOC_TYPE_LABELS[type].icon} {DOC_TYPE_LABELS[type].label}
              </button>
            ))}
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3 font-semibold text-white"
            style={{ background: 'var(--gradient-accent)' }}>
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Plus className="h-5 w-5" /> Dosya Seç</>}
          </button>
        </div>
      )}

      {!showUpload && documents.length < RATE_LIMITS.CARE_VAULT_MAX_DOCS && (
        <button onClick={() => setShowUpload(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 py-3 text-sm font-semibold text-primary hover:border-primary hover:bg-primary/5 transition-all">
          <Plus className="h-4 w-4" />
          Belge Ekle
        </button>
      )}
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FileText, Plus, Trash2, Loader2, Download } from 'lucide-react';
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
  vaccine: { label: 'Aşı Kartı', icon: '💉' },
  vet: { label: 'Veteriner Raporu', icon: '🩺' },
  other: { label: 'Diğer', icon: '📄' },
};

export function CareVault({ dogId, profileId }: CareVaultProps) {
  const [documents, setDocuments] = useState<CareDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedType, setSelectedType] = useState<'vaccine' | 'vet' | 'other'>('vaccine');
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, [dogId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('care_documents')
        .select('*')
        .eq('dog_id', dogId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setDocuments((data || []) as CareDocument[]);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (documents.length >= RATE_LIMITS.CARE_VAULT_MAX_DOCS) {
      toast.error(`Maksimum ${RATE_LIMITS.CARE_VAULT_MAX_DOCS} belge yükleyebilirsin`);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dosya boyutu 5MB\'dan küçük olmalı');
      return;
    }

    setUploading(true);
    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${profileId}/care/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('dog-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dog-photos')
        .getPublicUrl(fileName);

      // Create document record
      const { error: dbError } = await supabase
        .from('care_documents')
        .insert({
          dog_id: dogId,
          document_type: selectedType,
          file_url: publicUrl,
          file_name: file.name,
        });

      if (dbError) throw dbError;

      toast.success('Belge yüklendi!');
      setShowUpload(false);
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Yükleme başarısız');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      const { error } = await supabase
        .from('care_documents')
        .delete()
        .eq('id', docId);

      if (error) throw error;

      toast.success('Belge silindi');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Silme başarısız');
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
        <div className="h-24 animate-pulse bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-card p-4" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          🔐 Care Vault
        </h3>
        <span className="text-xs text-muted-foreground">
          {documents.length}/{RATE_LIMITS.CARE_VAULT_MAX_DOCS}
        </span>
      </div>

      {/* Documents List */}
      <div className="space-y-2">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between rounded-xl bg-secondary/50 p-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xl">{DOC_TYPE_LABELS[doc.document_type].icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {doc.file_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {DOC_TYPE_LABELS[doc.document_type].label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={doc.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => handleDelete(doc.id)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {documents.length === 0 && !showUpload && (
          <div className="text-center py-6">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Aşı kartı, veteriner raporu ekle
            </p>
          </div>
        )}
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="mt-3 rounded-xl bg-secondary/50 p-4 space-y-3">
          <p className="text-sm font-medium text-foreground">Belge Türü</p>
          <div className="flex gap-2">
            {(['vaccine', 'vet', 'other'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={cn(
                  "flex-1 rounded-lg py-2 text-xs font-medium transition-all",
                  selectedType === type
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {DOC_TYPE_LABELS[type].icon} {DOC_TYPE_LABELS[type].label}
              </button>
            ))}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleUpload}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3 font-medium text-primary-foreground"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Dosya Seç
              </>
            )}
          </button>
        </div>
      )}

      {/* Add Button */}
      {!showUpload && documents.length < RATE_LIMITS.CARE_VAULT_MAX_DOCS && (
        <button
          onClick={() => setShowUpload(true)}
          className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Belge Ekle
        </button>
      )}
    </div>
  );
}

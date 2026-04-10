import { X } from 'lucide-react';

interface PhotoLightboxProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export function PhotoLightbox({ src, alt = '', onClose }: PhotoLightboxProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md" onClick={onClose}>
      <button onClick={onClose} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white z-10">
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

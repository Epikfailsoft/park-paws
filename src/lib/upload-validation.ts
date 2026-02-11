// Photo upload validation constants & helpers
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  MAX_WIDTH: 1920,
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  ALLOWED_EXTENSIONS: ['jpg', 'jpeg', 'png', 'webp'] as const,
} as const;

export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE) {
    return { valid: false, error: 'Fotoğraf boyutu 5MB\'dan küçük olmalı' };
  }

  // Check file type
  if (!UPLOAD_LIMITS.ALLOWED_TYPES.includes(file.type as typeof UPLOAD_LIMITS.ALLOWED_TYPES[number])) {
    return { valid: false, error: 'Sadece JPG, PNG ve WEBP formatları desteklenir' };
  }

  // Check extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !UPLOAD_LIMITS.ALLOWED_EXTENSIONS.includes(ext as typeof UPLOAD_LIMITS.ALLOWED_EXTENSIONS[number])) {
    return { valid: false, error: 'Geçersiz dosya uzantısı' };
  }

  return { valid: true };
}

/**
 * Compress image to max width while maintaining aspect ratio
 */
export function compressImage(file: File, maxWidth = UPLOAD_LIMITS.MAX_WIDTH): Promise<File> {
  return new Promise((resolve, reject) => {
    // Skip compression for small files
    if (file.size < 500 * 1024) {
      resolve(file);
      return;
    }

    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      if (!ctx) {
        resolve(file);
        return;
      }

      let { width, height } = img;

      // Only resize if wider than maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        file.type,
        0.85
      );
    };

    img.onerror = () => reject(new Error('Fotoğraf yüklenemedi'));
    img.src = URL.createObjectURL(file);
  });
}

// Turkish phone validation
export function validateTurkishPhone(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/\s/g, '');
  if (/^\+90[0-9]{10}$/.test(cleaned) || /^0[0-9]{10}$/.test(cleaned)) {
    return { valid: true };
  }
  return { valid: false, error: 'Geçersiz telefon formatı. +90XXXXXXXXXX veya 0XXXXXXXXXX kullanın' };
}

// Analytics event logger
export async function logEvent(
  supabase: { from: (table: string) => { insert: (data: Record<string, unknown>) => Promise<unknown> } },
  eventName: string,
  userId: string | undefined,
  payload?: Record<string, unknown>
) {
  try {
    await supabase.from('events').insert({
      event_name: eventName,
      user_id: userId,
      payload: payload || {},
    });
  } catch {
    // Silent fail - analytics should never block UX
  }
}

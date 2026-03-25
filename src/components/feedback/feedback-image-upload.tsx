'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { ImagePlus, X, Loader2 } from 'lucide-react';

interface FeedbackImageUploadProps {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
}

export function FeedbackImageUpload({ imageUrls, onChange, maxImages = 3 }: FeedbackImageUploadProps) {
  const t = useTranslations('feedback.form');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const remaining = maxImages - imageUrls.length;
    const filesToUpload = Array.from(files).slice(0, remaining);

    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const file of filesToUpload) {
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) continue;

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/feedback/upload', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          newUrls.push(data.url);
        }
      }
      if (newUrls.length > 0) {
        onChange([...imageUrls, ...newUrls]);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    onChange(imageUrls.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {/* Thumbnails */}
      {imageUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url, index) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt={`Screenshot ${index + 1}`}
                className="size-20 rounded-lg border object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {imageUrls.length < maxImages && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border-2 border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full justify-center"
          >
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
            {uploading ? '...' : t('images')}
          </button>
          <p className="mt-1 text-[11px] text-muted-foreground">{t('imagesHint')}</p>
        </div>
      )}
    </div>
  );
}

import React, { useRef } from 'react';
import { Camera, X } from 'lucide-react';

/** Resizes/compresses an image file in the browser before it's sent to the
 * server as base64 — keeps the request small even on a phone camera photo. */
export function compressImage(file: File, maxDim = 900, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not read the image.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Canvas not supported.')); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

interface PhotoUploaderProps {
  label: string;
  photos: string[];
  onChange: (photos: string[]) => void;
  multiple?: boolean;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({ label, photos, onChange, multiple = false }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const compressed = await Promise.all(Array.from(files).map(f => compressImage(f)));
    onChange(multiple ? [...photos, ...compressed] : [compressed[0]]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeAt = (idx: number) => {
    onChange(photos.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <label className="block text-slate-600 font-semibold mb-1">{label}</label>
      <div className="flex flex-wrap gap-2">
        {photos.map((p, idx) => (
          <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-200">
            <img src={p} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(idx)}
              className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600 text-white flex items-center justify-center"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
        {(multiple || photos.length === 0) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors"
          >
            <Camera className="w-5 h-5" />
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        capture="environment"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  );
};

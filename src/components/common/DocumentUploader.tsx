import React, { useState } from 'react';
import { Camera, Upload, CheckCircle2, FileText, Image as ImageIcon, Trash2 } from 'lucide-react';

interface DocumentUploaderProps {
  documents?: {
    photo?: string;
    academicPhoto?: string;
    citizenshipPhoto?: string;
    panNidPhoto?: string;
    others?: string[];
  };
  onChange: (docs: {
    photo?: string;
    academicPhoto?: string;
    citizenshipPhoto?: string;
    panNidPhoto?: string;
    others?: string[];
  }) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ documents = {}, onChange }) => {
  const [docState, setDocState] = useState(documents);

  const handleFileUpload = (
    field: 'photo' | 'academicPhoto' | 'citizenshipPhoto' | 'panNidPhoto',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        const updated = { ...docState, [field]: base64 };
        setDocState(updated);
        onChange(updated);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeDoc = (field: 'photo' | 'academicPhoto' | 'citizenshipPhoto' | 'panNidPhoto') => {
    const updated = { ...docState, [field]: undefined };
    setDocState(updated);
    onChange(updated);
  };

  const uploadSlots = [
    { key: 'photo' as const, label: 'Employee Photo / Profile Picture', required: true, fallbackIcon: <Camera className="w-5 h-5 text-indigo-400" /> },
    { key: 'academicPhoto' as const, label: 'Academic Qualification Certificate Photo', required: false, fallbackIcon: <FileText className="w-5 h-5 text-emerald-400" /> },
    { key: 'citizenshipPhoto' as const, label: 'Citizenship / Passport Photo', required: false, fallbackIcon: <ImageIcon className="w-5 h-5 text-amber-400" /> },
    { key: 'panNidPhoto' as const, label: 'PAN Card or NID Card Photo', required: false, fallbackIcon: <FileText className="w-5 h-5 text-purple-400" /> },
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
        <Upload className="w-4 h-4 text-indigo-400" /> Employee Official Verification Documents & Photos
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {uploadSlots.map(slot => {
          const currentImg = docState[slot.key];

          return (
            <div
              key={slot.key}
              className="p-3.5 rounded-xl bg-white/80 border border-slate-200 hover:border-slate-200 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-600">
                    {slot.label} {slot.required && <span className="text-red-400">*</span>}
                  </span>
                  {currentImg && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded
                    </span>
                  )}
                </div>

                {currentImg ? (
                  <div className="relative group rounded-lg overflow-hidden border border-slate-200 h-28 bg-slate-950 flex items-center justify-center">
                    <img src={currentImg} alt={slot.label} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeDoc(slot.key)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-indigo-500/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer bg-white/40 hover:bg-slate-100/40 transition-colors h-28">
                    {slot.fallbackIcon}
                    <span className="text-[11px] font-medium text-slate-500 mt-2 text-center">
                      Click to upload photo or document
                    </span>
                    <span className="text-[9px] text-slate-500">JPG, PNG, WEBP max 5MB</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => handleFileUpload(slot.key, e)}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

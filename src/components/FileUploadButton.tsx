"use client";

import { useRef, useState } from "react";
import { Paperclip, Loader2 } from "lucide-react";

export interface UploadedFile {
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
}

interface FileUploadButtonProps {
  onFileUploaded: (file: UploadedFile) => void;
  disabled?: boolean;
}

export default function FileUploadButton({ onFileUploaded, disabled }: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Dosya yüklenemedi");
        return;
      }

      onFileUploaded({
        file_name: data.file_name,
        file_url: data.file_url,
        file_size: data.file_size,
        mime_type: data.mime_type
      });

    } catch (err) {
      console.error(err);
      alert("Dosya yüklenirken bir ağ hatası oluştu.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <button
        type="button"
        disabled={isUploading || disabled}
        onClick={() => fileInputRef.current?.click()}
        className="p-2 text-slate-400 hover:text-slate-200 transition disabled:opacity-50"
        title="Dosya veya Görsel Ekle"
      >
        {isUploading ? (
          <Loader2 size={18} className="animate-spin text-indigo-400" />
        ) : (
          <Paperclip size={18} />
        )}
      </button>
    </div>
  );
}

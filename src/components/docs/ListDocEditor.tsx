"use client";

import React, { useState } from "react";
import { FileText, Save, Check } from "lucide-react";

interface ListDocEditorProps {
  listId: string;
  listName: string;
  initialContent: string;
  onSave: (listId: string, content: string) => Promise<void>;
  readOnly?: boolean;
}

export default function ListDocEditor({
  listId,
  listName,
  initialContent,
  onSave,
  readOnly = false,
}: ListDocEditorProps) {
  const [content, setContent] = useState(initialContent || "");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async () => {
    if (readOnly || isSaving) return;
    try {
      setIsSaving(true);
      await onSave(listId, content);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } catch (err) {
      console.error("Dokümantasyon kaydedilemedi:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-600" />
          <h4 className="text-xs font-bold text-slate-800 tracking-tight">
            {listName} Dokümantasyonu
          </h4>
        </div>
        {!readOnly && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl transition-all active:scale-95 ${
              savedSuccess
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" /> Kaydedildi
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" /> {isSaving ? "Kaydediliyor..." : "Kaydet"}
              </>
            )}
          </button>
        )}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        readOnly={readOnly}
        placeholder={
          readOnly
            ? "Bu listeye henüz bir dokümantasyon eklenmemiş."
            : "Bu listeye ait notları, imar/malzeme detaylarını buraya yazabilirsiniz..."
        }
        rows={8}
        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 placeholder:text-slate-400 resize-y"
      />
    </div>
  );
}

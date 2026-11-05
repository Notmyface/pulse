"use client";

import { useState, useRef } from "react";
import { 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Archive, 
  File, 
  Download, 
  Search, 
  Upload, 
  Loader2, 
  FolderOpen,
  ExternalLink
} from "lucide-react";
import { formatTimeAgo } from "@/lib/utils";
import type { ChatMessage } from "@/types/database";
import type { UploadedFile } from "@/components/FileUploadButton";

interface ChannelDocsTabProps {
  documents: ChatMessage[];
  currentUserId: string;
  onUploadDocument: (file: UploadedFile) => Promise<void>;
  channelName?: string;
}

type FilterType = "all" | "docs" | "images" | "sheets" | "archives";

export default function ChannelDocsTab({
  documents,
  currentUserId,
  onUploadDocument,
  channelName
}: ChannelDocsTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dosya sınıflandırma yardımcıları
  const getFileType = (name: string, mime: string): "image" | "doc" | "sheet" | "archive" | "other" => {
    const lowerName = name.toLowerCase();
    const lowerMime = mime.toLowerCase();

    if (lowerMime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(lowerName)) {
      return "image";
    }
    if (lowerMime.includes("sheet") || lowerMime.includes("excel") || lowerMime.includes("csv") || /\.(xlsx?|csv)$/i.test(lowerName)) {
      return "sheet";
    }
    if (lowerMime.includes("zip") || lowerMime.includes("compressed") || /\.(zip|rar|7z|tar|gz)$/i.test(lowerName)) {
      return "archive";
    }
    if (lowerMime.includes("pdf") || lowerMime.includes("word") || lowerMime.includes("document") || /\.(pdf|docx?|txt|rtf|md)$/i.test(lowerName)) {
      return "doc";
    }
    return "other";
  };

  // Filtreleme
  const filteredDocuments = documents.filter(doc => {
    const name = doc.attachment_name || "Dosya";
    const mime = doc.attachment_mime || "";
    const type = getFileType(name, mime);

    // Arama filtreleme
    if (searchQuery.trim() && !name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Kategori filtreleme
    if (filterType === "docs" && type !== "doc") return false;
    if (filterType === "images" && type !== "image") return false;
    if (filterType === "sheets" && type !== "sheet") return false;
    if (filterType === "archives" && type !== "archive") return false;

    return true;
  });

  // Kategori sayıları
  const counts = {
    all: documents.length,
    docs: documents.filter(d => getFileType(d.attachment_name || "", d.attachment_mime || "") === "doc").length,
    images: documents.filter(d => getFileType(d.attachment_name || "", d.attachment_mime || "") === "image").length,
    sheets: documents.filter(d => getFileType(d.attachment_name || "", d.attachment_mime || "") === "sheet").length,
    archives: documents.filter(d => getFileType(d.attachment_name || "", d.attachment_mime || "") === "archive").length,
  };

  // Doğrudan Belge Yükleme
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

      await onUploadDocument({
        file_name: data.file_name,
        file_url: data.file_url,
        file_size: data.file_size,
        mime_type: data.mime_type
      });

    } catch (err) {
      console.error(err);
      alert("Dosya yüklenirken bir hata oluştu.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* 1. ÜST AKSİYON & ARAMA ÇUBUĞU */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Dökümanlarda ara..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/30 transition disabled:opacity-50 shrink-0"
        >
          {isUploading ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Yükleniyor...
            </>
          ) : (
            <>
              <Upload size={13} /> Belge Yükle
            </>
          )}
        </button>
      </div>

      {/* 2. KATEGORİ FİLTRE BUTONLARI */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs shrink-0 scrollbar-none">
        <button
          onClick={() => setFilterType("all")}
          className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition shrink-0 ${
            filterType === "all"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          Tümü ({counts.all})
        </button>
        <button
          onClick={() => setFilterType("docs")}
          className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition shrink-0 ${
            filterType === "docs"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          📄 Belgeler ({counts.docs})
        </button>
        <button
          onClick={() => setFilterType("images")}
          className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition shrink-0 ${
            filterType === "images"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          🖼️ Görseller ({counts.images})
        </button>
        <button
          onClick={() => setFilterType("sheets")}
          className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition shrink-0 ${
            filterType === "sheets"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          📊 Tablolar ({counts.sheets})
        </button>
        <button
          onClick={() => setFilterType("archives")}
          className={`px-2.5 py-1 rounded-lg font-medium text-[11px] transition shrink-0 ${
            filterType === "archives"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          📦 Arşivler ({counts.archives})
        </button>
      </div>

      {/* 3. DÖKÜMAN LİSTESİ */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
              <FolderOpen size={24} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-300">
                {searchQuery ? "Aramanıza uygun döküman bulunamadı." : "Henüz bir döküman veya dosya paylaşılmadı."}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs">
                Kanalda paylaşılan PDF, görsel ve dökümanlar kolay erişim için burada toplanır.
              </p>
            </div>
            {!searchQuery && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-medium transition"
              >
                <Upload size={13} /> İlk Belgeyi Yükle
              </button>
            )}
          </div>
        ) : (
          filteredDocuments.map(doc => {
            const name = doc.attachment_name || "Dosya";
            const size = doc.attachment_size ? `${(doc.attachment_size / 1024).toFixed(0)} KB` : "";
            const mime = doc.attachment_mime || "";
            const url = doc.attachment_url || "#";
            const type = getFileType(name, mime);
            const isMe = doc.sender_id === currentUserId;
            const uploaderName = isMe ? "Siz" : (doc.sender?.full_name || "Ekip Üyesi");

            return (
              <div
                key={doc.id}
                className="p-3 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-indigo-500/40 transition flex items-center justify-between gap-3 shadow-sm group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Dosya Türü İkonu / Önizleme */}
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-center shrink-0 overflow-hidden">
                    {type === "image" ? (
                      <ImageIcon size={18} className="text-pink-400" />
                    ) : type === "sheet" ? (
                      <FileSpreadsheet size={18} className="text-emerald-400" />
                    ) : type === "archive" ? (
                      <Archive size={18} className="text-amber-400" />
                    ) : type === "doc" && name.toLowerCase().endsWith(".pdf") ? (
                      <FileText size={18} className="text-rose-400" />
                    ) : (
                      <FileText size={18} className="text-indigo-400" />
                    )}
                  </div>

                  {/* Dosya Bilgileri */}
                  <div className="truncate">
                    <h4 className="text-xs font-medium text-slate-200 truncate group-hover:text-white transition">
                      {name}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      {size && <span>{size}</span>}
                      {size && <span>•</span>}
                      <span>Paylaşan: <strong className="text-slate-300 font-normal">{uploaderName}</strong></span>
                      <span>•</span>
                      <span>{formatTimeAgo(doc.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Aksiyon: İndir / Aç */}
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs font-medium transition shrink-0 shadow-sm"
                  title="Görüntüle veya İndir"
                >
                  <Download size={13} />
                  <span className="hidden sm:inline">İndir</span>
                </a>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

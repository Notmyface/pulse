"use client";

import React, { useState } from "react";
import { Folder, FileText, Image as ImageIcon, Download, Paperclip, Trash2, File } from "lucide-react";
import FileUploadButton, { type UploadedFile } from "@/components/FileUploadButton";

export interface ListAttachment {
  id: string;
  project_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  uploader_name?: string;
}

interface ListFilesManagerProps {
  projectId: string;
  projectName: string;
  files: ListAttachment[];
  onUploadFile: (file: UploadedFile) => Promise<void>;
  onDeleteFile?: (fileId: string) => Promise<void>;
  canUpload?: boolean;
}

export default function ListFilesManager({
  projectId,
  projectName,
  files,
  onUploadFile,
  onDeleteFile,
  canUpload = true,
}: ListFilesManagerProps) {
  const [isUploading, setIsUploading] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (mime: string) => mime.startsWith("image/");

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-3">
      {/* Üst Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs font-bold text-slate-800 tracking-tight">
            {projectName} Dosyaları
          </h4>
          <span className="text-[10px] text-slate-400 font-medium">
            {files.length} dosya yüklendi
          </span>
        </div>

        {canUpload && (
          <div className="flex items-center gap-1.5">
            <FileUploadButton
              onFileUploaded={async (uploaded) => {
                await onUploadFile(uploaded);
              }}
            />
          </div>
        )}
      </div>

      {/* Dosya Listesi */}
      <div className="space-y-2">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 hover:border-indigo-200 transition-all text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-600">
                {isImage(file.mime_type) ? (
                  <ImageIcon className="w-4 h-4 text-indigo-500" />
                ) : (
                  <FileText className="w-4 h-4 text-slate-500" />
                )}
              </div>
              <div className="truncate">
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-800 hover:text-indigo-600 truncate block"
                >
                  {file.file_name}
                </a>
                <span className="text-[10px] text-slate-400">
                  {formatFileSize(file.file_size)} •{" "}
                  {new Date(file.created_at).toLocaleDateString("tr-TR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <a
                href={file.file_url}
                download={file.file_name}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white"
                title="İndir"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
              {onDeleteFile && (
                <button
                  onClick={() => onDeleteFile(file.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white"
                  title="Sil"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}

        {files.length === 0 && (
          <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
            Bu listeye henüz bir dosya veya doküman eklenmedi.
          </div>
        )}
      </div>
    </div>
  );
}

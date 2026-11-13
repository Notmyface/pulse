"use client";

import React from "react";
import { Undo2, CheckCircle2 } from "lucide-react";

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  isOpen: boolean;
}

export default function UndoToast({ message, onUndo, isOpen }: UndoToastProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center justify-between gap-3 bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-md max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-200">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="truncate">{message}</span>
        </div>
        <button
          onClick={onUndo}
          className="flex items-center gap-1 text-xs font-semibold bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white px-3 py-1.5 rounded-xl transition-all shadow-sm shrink-0"
        >
          <Undo2 className="w-3.5 h-3.5" />
          Geri Al
        </button>
      </div>
    </div>
  );
}

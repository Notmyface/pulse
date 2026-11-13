"use client";

import React, { useState } from "react";
import { X, Filter, Check, RotateCcw } from "lucide-react";
import type { TaskPriority } from "@/types/database";

export interface FilterState {
  scope: "all" | "created_by_me" | "assigned_to_me";
  time: {
    this_week: boolean;
    next_week: boolean;
    this_month: boolean;
    past: boolean;
    all: boolean;
  };
  status: {
    completed: boolean;
    incomplete: boolean;
  };
  priorities: TaskPriority[];
}

interface TaskFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onApply: (newFilters: FilterState) => void;
}

export default function TaskFilterSheet({
  isOpen,
  onClose,
  filters: initialFilters,
  onApply,
}: TaskFilterSheetProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(initialFilters);

  if (!isOpen) return null;

  const togglePriority = (p: TaskPriority) => {
    setLocalFilters((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(p)
        ? prev.priorities.filter((item) => item !== p)
        : [...prev.priorities, p],
    }));
  };

  const handleReset = () => {
    const resetState: FilterState = {
      scope: "all",
      time: {
        this_week: false,
        next_week: false,
        this_month: false,
        past: false,
        all: true,
      },
      status: {
        completed: true,
        incomplete: true,
      },
      priorities: ["urgent", "high", "normal", "low"],
    };
    setLocalFilters(resetState);
  };

  const handleSave = () => {
    onApply(localFilters);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-800">Filtreleme</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 1. Kapsam (Scope Tabs) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Kapsam
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "all", label: "Tümü" },
                { id: "assigned_to_me", label: "Bana Atanan" },
                { id: "created_by_me", label: "Oluşturduğum" },
              ].map((tab) => {
                const isActive = localFilters.scope === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setLocalFilters((prev) => ({
                        ...prev,
                        scope: tab.id as FilterState["scope"],
                      }))
                    }
                    className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all ${
                      isActive
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Zaman Filtresi */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Zaman Filtresi
            </label>
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              {[
                { key: "this_week", label: "Bu Hafta" },
                { key: "next_week", label: "Önümüzdeki Hafta" },
                { key: "this_month", label: "Bu Ay" },
                { key: "past", label: "Geçmiş" },
                { key: "all", label: "Hepsi" },
              ].map((item) => {
                const isChecked = localFilters.time[item.key as keyof FilterState["time"]];
                return (
                  <label
                    key={item.key}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white cursor-pointer select-none text-xs font-medium text-slate-700"
                  >
                    <span>{item.label}</span>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        setLocalFilters((prev) => ({
                          ...prev,
                          time: {
                            ...prev.time,
                            [item.key]: !isChecked,
                          },
                        }));
                      }}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Durum (Tamamlananlar / Tamamlanmayanlar) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Durum
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer">
                <span>Tamamlananlar</span>
                <input
                  type="checkbox"
                  checked={localFilters.status.completed}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      status: { ...prev.status, completed: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer">
                <span>Tamamlanmayanlar</span>
                <input
                  type="checkbox"
                  checked={localFilters.status.incomplete}
                  onChange={(e) =>
                    setLocalFilters((prev) => ({
                      ...prev,
                      status: { ...prev.status, incomplete: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                />
              </label>
            </div>
          </div>

          {/* 4. Öncelik */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">
              Öncelik
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "urgent", label: "! İvedi", color: "rose" },
                { id: "high", label: "↑ Yüksek", color: "amber" },
                { id: "normal", label: "• Orta", color: "orange" },
                { id: "low", label: "↓ Düşük", color: "sky" },
              ].map((p) => {
                const isSelected = localFilters.priorities.includes(p.id as TaskPriority);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePriority(p.id as TaskPriority)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    <span>{p.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex-1 py-2.5 bg-white border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Sıfırla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 py-2.5 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}

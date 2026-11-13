"use client";

import React, { useState } from "react";
import { X, Check, Shield, Lock } from "lucide-react";
import type { Profile, UserRole, ListModulePermission } from "@/types/database";

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Profile | null;
  onUpdateRole: (memberId: string, role: UserRole) => Promise<void>;
  onUpdateModulePermissions?: (
    memberId: string,
    permissions: Partial<ListModulePermission>
  ) => Promise<void>;
}

export default function PermissionModal({
  isOpen,
  onClose,
  member,
  onUpdateRole,
  onUpdateModulePermissions,
}: PermissionModalProps) {
  const [role, setRole] = useState<UserRole>(member?.role || "member");
  const [canDocs, setCanDocs] = useState(false);
  const [canFiles, setCanFiles] = useState(false);
  const [canKanbanGantt, setCanKanbanGantt] = useState(true);
  const [canCalendar, setCanCalendar] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !member) return null;

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await onUpdateRole(member.id, role);
      if (onUpdateModulePermissions) {
        await onUpdateModulePermissions(member.id, {
          can_docs: canDocs,
          can_files: canFiles,
          can_kanban: canKanbanGantt,
          can_gantt: canKanbanGantt,
        });
      }
      onClose();
    } catch (err) {
      console.error("Yetki güncellenemedi:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-semibold text-slate-800">
              Yetkilendirme ({member.full_name.split(" ")[0]})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* 3 Ana Yetki Seviyesi */}
          <div className="space-y-2.5">
            {[
              {
                id: "admin" as UserRole,
                number: "1",
                title: "Genel Yönetici",
                desc: "Herkesin işlerini görebilir, liste oluşturabilir ve yönetebilir.",
                color: "emerald",
              },
              {
                id: "manager" as UserRole,
                number: "2",
                title: "Liste Yönetimi",
                desc: "Sadece kendisine atanan listeleri yönetebilir ve görev atayabilir.",
                color: "indigo",
              },
              {
                id: "member" as UserRole,
                number: "3",
                title: "Sadece Atananlar",
                desc: "Sadece kendisine atanan listeleri ve işleri görebilir, başkasına atayamaz.",
                color: "amber",
              },
            ].map((lvl) => {
              const isSelected = role === lvl.id;
              return (
                <div
                  key={lvl.id}
                  onClick={() => setRole(lvl.id)}
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 ${
                      lvl.id === "admin"
                        ? "bg-emerald-500"
                        : lvl.id === "manager"
                        ? "bg-indigo-500"
                        : "bg-amber-500"
                    }`}
                  >
                    {lvl.number}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800">{lvl.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {lvl.desc}
                    </p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ek Modül Yetkileri (Özellikle 3. Seviye veya Dış Şirketler İçin) */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-2">
              Ek Yetkiler (Modül Bazlı)
            </h4>
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
              {[
                { label: "Dokümantasyon", val: canDocs, set: setCanDocs },
                { label: "Dosyalar", val: canFiles, set: setCanFiles },
                { label: "Kanban & Gantt", val: canKanbanGantt, set: setCanKanbanGantt },
                { label: "Takvim Görünürlüğü", val: canCalendar, set: setCanCalendar },
              ].map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-center justify-between text-xs font-semibold text-slate-700 py-1 cursor-pointer"
                >
                  <span>{item.label}</span>
                  <input
                    type="checkbox"
                    checked={item.val}
                    onChange={(e) => item.set(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md disabled:opacity-50 transition-all"
          >
            {isSaving ? "Kaydediliyor..." : "Yetkileri Güncelle"}
          </button>
        </div>
      </div>
    </div>
  );
}

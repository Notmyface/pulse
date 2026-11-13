"use client";

import React from "react";
import { Home, CheckSquare, Calendar, MessageSquare, Users } from "lucide-react";

export type TabType = "personal" | "tasks" | "calendar" | "chat" | "team";

interface MobileBottomNavProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
  unreadChatCount?: number;
}

export default function MobileBottomNav({
  activeTab,
  onChangeTab,
  unreadChatCount = 0,
}: MobileBottomNavProps) {
  const tabs = [
    { id: "personal" as TabType, label: "Ana Sayfa", icon: Home },
    { id: "tasks" as TabType, label: "Görevler", icon: CheckSquare },
    { id: "calendar" as TabType, label: "Takvim", icon: Calendar },
    { id: "chat" as TabType, label: "Sohbet", icon: MessageSquare, badge: unreadChatCount },
    { id: "team" as TabType, label: "Ekip", icon: Users },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1 safe-area-pb shadow-lg max-w-md mx-auto">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1.5 px-1 relative transition-colors ${
                isActive
                  ? "text-indigo-600 font-semibold"
                  : "text-slate-400 hover:text-slate-600 font-medium"
              }`}
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "scale-110 stroke-[2.2]" : "stroke-[1.8]"
                  }`}
                />
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {tab.badge! > 9 ? "9+" : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

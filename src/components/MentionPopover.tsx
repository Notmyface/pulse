"use client";

import { User } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role: string;
}

interface MentionPopoverProps {
  isOpen: boolean;
  filterText: string;
  teamMembers: TeamMember[];
  onSelect: (member: TeamMember) => void;
}

export default function MentionPopover({
  isOpen,
  filterText,
  teamMembers,
  onSelect
}: MentionPopoverProps) {
  if (!isOpen) return null;

  const filteredMembers = teamMembers.filter(m => 
    m.name.toLowerCase().includes(filterText.toLowerCase())
  );

  if (filteredMembers.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden z-30 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="px-3 py-1.5 bg-slate-950/60 border-b border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
        Ekip Üyesini Etiketle (@)
      </div>
      <div className="p-1 space-y-0.5">
        {filteredMembers.map((member) => (
          <button
            key={member.id}
            onClick={() => onSelect(member)}
            className="w-full flex items-center justify-between p-2 rounded-xl text-left hover:bg-indigo-600/20 hover:text-indigo-300 transition text-xs group"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-bold text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition">
                {member.name.charAt(0)}
              </div>
              <span className="font-medium text-slate-200 group-hover:text-white">
                {member.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 group-hover:text-indigo-300">
              {member.role}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

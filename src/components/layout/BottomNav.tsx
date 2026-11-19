import React from 'react';
import { Camera, PlayCircle, Cpu, BookOpen, HelpCircle, MessageSquare, History } from 'lucide-react';

export type NavTab = 'scan' | 'visualiser' | 'circuit_lab' | 'notes' | 'quiz' | 'tutor' | 'history';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'scan', label: 'Quét sơ đồ', icon: Camera },
    { id: 'visualiser', label: 'Mô phỏng', icon: PlayCircle },
    { id: 'circuit_lab', label: 'Mạch điện', icon: Cpu },
    { id: 'notes', label: 'Ghi chú AI', icon: BookOpen },
    { id: 'quiz', label: 'Trắc nghiệm', icon: HelpCircle },
    { id: 'tutor', label: 'Gia sư AI', icon: MessageSquare },
    { id: 'history', label: 'Lịch sử', icon: History },
  ];

  return (
    <nav className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 fixed bottom-0 inset-x-0 z-40 sm:relative sm:border-t-0 sm:bg-transparent sm:dark:bg-transparent">
      <div className="max-w-3xl mx-auto px-1.5 sm:px-4 py-1.5 flex items-center justify-between sm:justify-center sm:gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 py-1.5 px-2 sm:px-3 rounded-xl transition-colors relative whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-semibold sm:bg-blue-50 dark:sm:bg-blue-500/10'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 font-medium sm:hover:bg-slate-100 dark:sm:hover:bg-slate-800/60'
              }`}
            >
              <div
                className={`p-1 sm:p-0 rounded-lg transition-transform ${
                  isActive ? 'bg-blue-50 dark:bg-blue-500/15 sm:bg-transparent scale-105 sm:scale-100' : ''
                }`}
              >
                <Icon className="w-4 h-4 sm:w-4 sm:h-4" />
              </div>
              <span className="text-[10px] sm:text-xs tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

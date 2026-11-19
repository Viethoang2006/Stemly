import React from 'react';
import { Atom, Smartphone, Monitor, Github, Sun, Moon } from 'lucide-react';
import { TemplateId } from '../../types/stemly';
import { DEFAULT_TEMPLATES } from '../../data/templates';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isMobileFrameMode: boolean;
  onToggleMobileFrame: () => void;
  currentTemplateId: TemplateId;
  onSelectTemplate: (templateId: TemplateId) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onSelectTab,
  isMobileFrameMode,
  onToggleMobileFrame,
  currentTemplateId,
  onSelectTemplate,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div
          onClick={() => onSelectTab('scan')}
          className="flex items-center gap-3 cursor-pointer group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Atom className="w-6 h-6 animate-spin-slow" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors whitespace-nowrap">
              STEMLY
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block whitespace-nowrap">
              Quét · Phân tích · Mô phỏng Mạch & STEM
            </p>
          </div>
        </div>

        {/* Topic Quick Switcher */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            Chọn mô phỏng:
          </span>
          <select
            value={currentTemplateId}
            onChange={(e) => onSelectTemplate(e.target.value as TemplateId)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer font-medium max-w-[260px]"
          >
            <optgroup label="Mạch điện & Điện tử" className="bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-300">
              {Object.values(DEFAULT_TEMPLATES)
                .filter((t) => t.category === 'electronics')
                .map((t) => (
                  <option key={t.templateId} value={t.templateId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {t.topic}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Vật lý & Toán học" className="bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300">
              {Object.values(DEFAULT_TEMPLATES)
                .filter((t) => t.category === 'physics')
                .map((t) => (
                  <option key={t.templateId} value={t.templateId} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                    {t.topic}
                  </option>
                ))}
            </optgroup>
          </select>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}
            title={theme === 'dark' ? 'Chuyển sang chế độ Sáng (Light Mode)' : 'Chuyển sang chế độ Tối (Dark Mode)'}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl border bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Sáng</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span className="hidden sm:inline">Tối</span>
              </>
            )}
          </button>

          {/* Frame Mode Toggle (Mobile / Desktop View) */}
          <button
            type="button"
            onClick={onToggleMobileFrame}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              isMobileFrameMode
                ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-600/20 dark:border-blue-500/50 dark:text-blue-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
            }`}
            title={isMobileFrameMode ? 'Chuyển sang giao diện màn hình rộng' : 'Chuyển sang khung xem mô phỏng điện thoại'}
          >
            {isMobileFrameMode ? <Smartphone className="w-3.5 h-3.5" /> : <Monitor className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">
              {isMobileFrameMode ? 'Khung điện thoại' : 'Màn hình rộng'}
            </span>
          </button>

          {/* GitHub Source Link */}
          <a
            href="https://github.com/SH-Nihil-Mukkesh-25/Stemly"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Github className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Mã nguồn GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
};

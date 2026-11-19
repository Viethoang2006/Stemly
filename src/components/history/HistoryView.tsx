import React from 'react';
import { HistoryItem } from '../../types/stemly';
import { History, Play, Trash2, Calendar, FileText } from 'lucide-react';

interface HistoryViewProps {
  historyItems: HistoryItem[];
  onSelectHistory: (item: HistoryItem) => void;
  onClearHistory: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  historyItems,
  onSelectHistory,
  onClearHistory,
}) => {
  if (historyItems.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <History className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Chưa có Lịch sử Quét</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Tất cả sơ đồ đã quét, bài tập vật lý và phiên mô phỏng của bạn sẽ được lưu tại đây để bạn có thể xem lại bất cứ lúc nào.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Lịch sử Quét & Mô phỏng đã lưu</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Xem lại các bài tập và tài liệu học tập trước đây</p>
        </div>
        <button
          onClick={onClearHistory}
          className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-900/40 dark:hover:bg-rose-950/50 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa lịch sử</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {historyItems.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-600/60 rounded-2xl p-4 transition-all group flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-900/50">
                  {item.topic}
                </span>
                <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>{item.timestamp}</span>
                </span>
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                {item.summary}
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(item.parameters).map(([key, val]) => (
                  <span
                    key={key}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800"
                  >
                    {key}: {val}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Đã lưu ghi chú & trắc nghiệm</span>
              </div>

              <button
                onClick={() => onSelectHistory(item)}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600/90 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors group-hover:bg-blue-600"
              >
                <span>Mở lại</span>
                <Play className="w-3 h-3 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

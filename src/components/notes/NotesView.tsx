import React, { useState } from 'react';
import { StudyNotes } from '../../types/stemly';
import { BookOpen, AlertTriangle, CheckCircle, Calculator, Sparkles, Send, Bot, FileText, ExternalLink, HelpCircle } from 'lucide-react';

interface NotesViewProps {
  notes: StudyNotes | null;
  isLoading: boolean;
  error?: string | null;
  onRefreshNotes: () => void;
}

export const NotesView: React.FC<NotesViewProps> = ({
  notes,
  isLoading,
  error,
  onRefreshNotes,
}) => {
  const [followUpQuestion, setFollowUpQuestion] = useState<string>('');
  const [isAnsweringFollowUp, setIsAnsweringFollowUp] = useState<boolean>(false);
  const [followUpAnswers, setFollowUpAnswers] = useState<{ q: string; a: string }[]>([]);

  const handleAskFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim() || isAnsweringFollowUp) return;

    const question = followUpQuestion.trim();
    setIsAnsweringFollowUp(true);

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Về chủ đề STEM "${notes?.topic || 'Vật lý'}" và phần ghi chú bài học: ${notes?.explanation || ''}\n\nHọc sinh đặt câu hỏi: ${question}`,
            },
          ],
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFollowUpAnswers((prev) => [
          ...prev,
          { q: question, a: data?.error || 'Không thể nhận phản hồi từ gia sư AI lúc này.' },
        ]);
        return;
      }
      setFollowUpAnswers((prev) => [...prev, { q: question, a: data.content }]);
      setFollowUpQuestion('');
    } catch (err) {
      console.error(err);
      setFollowUpAnswers((prev) => [
        ...prev,
        { q: question, a: 'Không thể kết nối đến gia sư AI vào thời điểm này. Vui lòng thử lại sau.' },
      ]);
    } finally {
      setIsAnsweringFollowUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Đang tạo tài liệu ghi chú học tập chi tiết...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Đang tổng hợp công thức, bài toán mẫu và lưu ý cốt lõi với Gemini AI</p>
        </div>
      </div>
    );
  }

  if (error && !notes) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/50 rounded-2xl p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto" />
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-amber-700 dark:text-amber-300">Chưa thể tạo Ghi chú AI</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">{error}</p>
        </div>
        <button
          onClick={onRefreshNotes}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
        >
          Thử tạo lại ghi chú
        </button>
      </div>
    );
  }

  if (!notes) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <FileText className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Chưa có Ghi chú bài học</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Quét một sơ đồ hoặc bấm nút bên dưới để tạo tài liệu học tập chi tiết theo chủ đề đang chọn.
          </p>
        </div>
        <button
          onClick={onRefreshNotes}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
        >
          Tạo ghi chú AI
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 text-[11px] font-semibold mb-2">
            <BookOpen className="w-3 h-3" />
            <span>Ghi chú học tập AI</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{notes.topic}</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Chứng minh công thức, giải thích biến số, bài tập số học mẫu và bẫy đề thi
          </p>
        </div>

        <button
          onClick={onRefreshNotes}
          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 text-xs font-medium transition-colors"
        >
          Tạo lại ghi chú
        </button>
      </div>

      {/* Main Conceptual Explanation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-md space-y-3">
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Bản chất trực quan & Lý thuyết cốt lõi</span>
        </h2>
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
          {notes.explanation}
        </p>
      </div>

      {/* Grid: Formulas & Variable Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Key Formulas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-md space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Hệ thống Công thức & Định luật chính</span>
          </h3>
          <div className="space-y-2">
            {notes.formulas.map((formula, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-sm text-blue-700 dark:text-blue-300 flex items-center gap-3 shadow-inner"
              >
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400 flex items-center justify-center text-xs shrink-0 font-sans font-bold">
                  {idx + 1}
                </span>
                <span className="font-semibold tracking-wide">{formula}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Variables Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-md space-y-3">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Giải thích Biến số & Ý nghĩa Vật lý</span>
          </h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {Object.entries(notes.variable_breakdown).map(([sym, def]) => (
              <div
                key={sym}
                className="bg-slate-50 dark:bg-slate-950/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs flex flex-col gap-0.5"
              >
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{sym}</span>
                <span className="text-slate-700 dark:text-slate-300 text-[11px] leading-snug">{def}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Worked Numerical Example */}
      {notes.example && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-md space-y-3">
          <h3 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Bài tập giải mẫu chi tiết từng bước</span>
          </h3>
          <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm font-sans text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {notes.example}
          </div>
        </div>
      )}

      {/* Common Mistakes & Pitfalls */}
      {notes.mistakes?.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 shadow-sm dark:shadow-md space-y-3">
          <h3 className="text-xs font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span>Những Sai lầm & Bẫy thi cử thường gặp</span>
          </h3>
          <ul className="space-y-2">
            {notes.mistakes.map((mistake, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-rose-900 dark:text-rose-200/90 leading-relaxed">
                <span className="text-rose-600 dark:text-rose-400 font-bold mt-0.5">•</span>
                <span>{mistake}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Summary Takeaways */}
      {notes.summary?.length > 0 && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl p-5 shadow-sm dark:shadow-md space-y-3">
          <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tóm tắt ghi nhớ cốt lõi để ôn tập nhanh</span>
          </h3>
          <ul className="space-y-2">
            {notes.summary.map((point, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-emerald-900 dark:text-emerald-200/90 leading-relaxed">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Curated External Resources */}
      {notes.resources?.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-md space-y-3">
          <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Tài nguyên học tập & Chuyên đề mở rộng đề xuất</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {notes.resources.map((res, idx) => (
              <div
                key={idx}
                className="bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2"
              >
                <span>{res}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up Notes Q&A */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Bạn có câu hỏi nào cần giải đáp thêm về phần này không?</h3>
        </div>

        {followUpAnswers.length > 0 && (
          <div className="space-y-3">
            {followUpAnswers.map((item, idx) => (
              <div key={idx} className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">Câu hỏi: {item.q}</div>
                <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line border-t border-slate-200 dark:border-slate-800/60 pt-2 flex items-start gap-2">
                  <Bot className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>{item.a}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleAskFollowUp} className="flex gap-2">
          <input
            type="text"
            value={followUpQuestion}
            onChange={(e) => setFollowUpQuestion(e.target.value)}
            placeholder="Hỏi bất cứ điều gì, ví dụ: 'Hãy chứng minh công thức tầm xa từng bước một?'"
            className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isAnsweringFollowUp || !followUpQuestion.trim()}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {isAnsweringFollowUp ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Hỏi Gia sư AI</span>
          </button>
        </form>
      </div>
    </div>
  );
};

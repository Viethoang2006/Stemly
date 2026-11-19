import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { QuizData, QuizQuestion } from '../../types/stemly';
import { HelpCircle, CheckCircle2, XCircle, Award, RotateCcw, ArrowRight, Lightbulb, Sparkles, AlertTriangle } from 'lucide-react';

interface QuizViewProps {
  quiz: QuizData | null;
  isLoading: boolean;
  error?: string | null;
  onGenerateQuiz: () => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  quiz,
  isLoading,
  error,
  onGenerateQuiz,
}) => {
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const questions = quiz?.questions || [];
  const currentQuestion: QuizQuestion | undefined = questions[currentIdx];

  const handleSelectOption = (optionIndex: number) => {
    if (selectedAnswers[currentIdx] !== undefined) return;

    const newAnswers = { ...selectedAnswers, [currentIdx]: optionIndex };
    setSelectedAnswers(newAnswers);

    if (Object.keys(newAnswers).length === questions.length) {
      setTimeout(() => {
        setIsCompleted(true);
        triggerConfetti();
      }, 1200);
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  const handleRestart = () => {
    setSelectedAnswers({});
    setCurrentIdx(0);
    setIsCompleted(false);
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct_index) score++;
    });
    return score;
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Đang tạo bài trắc nghiệm thông minh...</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Đang soạn 5 câu hỏi trọng tâm kèm phân tích bẫy thi và bài học cốt lõi</p>
        </div>
      </div>
    );
  }

  if (error && (!quiz || questions.length === 0)) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800/50 rounded-2xl p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-amber-500 dark:text-amber-400 mx-auto" />
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-amber-700 dark:text-amber-300">Chưa thể tạo Bài trắc nghiệm AI</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto leading-relaxed">{error}</p>
        </div>
        <button
          onClick={onGenerateQuiz}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
        >
          Thử tạo lại trắc nghiệm
        </button>
      </div>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-4">
        <HelpCircle className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Chưa có Bài trắc nghiệm sẵn sàng</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Kiểm tra mức độ hiểu bài của bạn bằng bộ câu hỏi trắc nghiệm khách quan được tạo tự động theo chủ đề đang chọn.
          </p>
        </div>
        <button
          onClick={onGenerateQuiz}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
        >
          Tạo bài kiểm tra trắc nghiệm
        </button>
      </div>
    );
  }

  // Quiz Completed Score Screen
  if (isCompleted) {
    const score = calculateScore();
    const percent = Math.round((score / questions.length) * 100);

    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-white dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 border border-blue-200 dark:border-slate-800 rounded-2xl p-8 text-center space-y-5 shadow-sm dark:shadow-xl">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 mx-auto flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
            <Award className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Hoàn thành bài kiểm tra!</h2>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {percent >= 80
                ? 'Thành tích xuất sắc! Bạn đã hoàn toàn làm chủ kiến thức chủ đề này.'
                : percent >= 60
                ? 'Làm khá tốt! Hãy xem lại các quy tắc cốt lõi bên dưới để hoàn thiện hơn.'
                : 'Cần cố gắng thêm! Hãy xem lại công thức và chạy lại mô phỏng để ghi nhớ sâu sắc hơn.'}
            </p>
          </div>

          <div className="inline-flex items-baseline gap-2 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 px-6 py-3 rounded-2xl font-mono">
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{score}</span>
            <span className="text-slate-400 dark:text-slate-500 text-xl font-bold">/</span>
            <span className="text-xl font-bold text-slate-600 dark:text-slate-400">{questions.length}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans ml-2">({percent}%)</span>
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <button
              onClick={handleRestart}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Làm lại bài này</span>
            </button>
            <button
              onClick={onGenerateQuiz}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tạo bộ câu hỏi mới</span>
            </button>
          </div>
        </div>

        {/* Answer Breakdown Review */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Xem lại Đáp án & Lời giải chi tiết
          </h3>
          {questions.map((q, idx) => {
            const userAnswer = selectedAnswers[idx];
            const isCorrect = userAnswer === q.correct_index;

            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-semibold text-sm text-slate-900 dark:text-slate-200 flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>
                  {isCorrect ? (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle2 className="w-4 h-4" /> Chính xác
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 dark:text-rose-400 shrink-0">
                      <XCircle className="w-4 h-4" /> Chưa đúng
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    const isRight = optIdx === q.correct_index;

                    let style = 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950/60 dark:border-slate-800/80 dark:text-slate-400';
                    if (isRight) {
                      style = 'bg-emerald-50 border-emerald-400 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300 font-medium';
                    } else if (isSelected && !isRight) {
                      style = 'bg-rose-50 border-rose-400 text-rose-700 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-300 line-through';
                    }

                    return (
                      <div key={optIdx} className={`p-2.5 rounded-lg border ${style} flex items-center justify-between`}>
                        <span>{opt}</span>
                        {isRight && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </div>
                    );
                  })}
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800/80 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <div className="font-semibold text-blue-600 dark:text-blue-400">Lời giải chi tiết:</div>
                  <div className="leading-relaxed">{q.explanation}</div>
                  {q.takeaway && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-300/90 font-mono mt-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                      ★ Quy tắc cốt lõi: {q.takeaway}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Active Quiz Question
  const hasAnswered = selectedAnswers[currentIdx] !== undefined;
  const userAnswer = selectedAnswers[currentIdx];

  return (
    <div className="space-y-6">
      {/* Quiz Progress Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
              Đánh giá kiến thức thông minh
            </span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{quiz.topic}</h2>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
            Câu hỏi {currentIdx + 1} / {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-300"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl space-y-5">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
            {currentQuestion.question}
          </h3>

          {/* Options */}
          <div className="space-y-2.5">
            {currentQuestion.options.map((option, optIdx) => {
              const isSelected = userAnswer === optIdx;
              const isCorrect = optIdx === currentQuestion.correct_index;

              let cardStyle =
                'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-950/80 dark:hover:bg-slate-800/80 dark:border-slate-800 dark:text-slate-200 cursor-pointer';

              if (hasAnswered) {
                if (isCorrect) {
                  cardStyle = 'bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-600 dark:text-emerald-200 font-semibold shadow-md';
                } else if (isSelected && !isCorrect) {
                  cardStyle = 'bg-rose-50 border-rose-500 text-rose-800 dark:bg-rose-950/50 dark:border-rose-600 dark:text-rose-200 line-through';
                } else {
                  cardStyle = 'bg-slate-50/50 border-slate-200 text-slate-400 dark:bg-slate-950/40 dark:border-slate-800/60 dark:text-slate-500 cursor-default';
                }
              }

              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(optIdx)}
                  className={`p-4 rounded-xl border text-sm flex items-center justify-between transition-all ${cardStyle}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-white border border-slate-200 dark:border-transparent dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-xs flex items-center justify-center font-bold shrink-0">
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span>{option}</span>
                  </div>

                  {hasAnswered && isCorrect && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                  {hasAnswered && isSelected && !isCorrect && (
                    <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Feedback & Explanation Card after answering */}
          {hasAnswered && (
            <div className="space-y-3 pt-2">
              <div
                className={`p-4 rounded-xl border text-xs sm:text-sm leading-relaxed space-y-2 ${
                  userAnswer === currentQuestion.correct_index
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/30 dark:border-emerald-800/60 dark:text-emerald-200'
                    : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/30 dark:border-rose-800/60 dark:text-rose-200'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5">
                  {userAnswer === currentQuestion.correct_index ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Chính xác! Lập luận khoa học:</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                      <span>Chưa chính xác. Lập luận khoa học:</span>
                    </>
                  )}
                </div>
                <p className="text-slate-700 dark:text-slate-300">{currentQuestion.explanation}</p>

                {currentQuestion.takeaway && (
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300 font-mono">
                    <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                    <span>Quy tắc: {currentQuestion.takeaway}</span>
                  </div>
                )}
              </div>

              {/* Next Question / Finish Button */}
              <div className="flex justify-end pt-2">
                {currentIdx < questions.length - 1 ? (
                  <button
                    onClick={() => setCurrentIdx((prev) => prev + 1)}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
                  >
                    <span>Câu hỏi tiếp theo</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsCompleted(true);
                      triggerConfetti();
                    }}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-colors"
                  >
                    <span>Xem Báo cáo Điểm số</span>
                    <Award className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

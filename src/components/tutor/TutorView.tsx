import React, { useState } from 'react';
import { Send, Bot, User, Cpu } from 'lucide-react';

interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface TutorViewProps {
  currentTopic?: string;
  parameters?: Record<string, number>;
  simulationStats?: Record<string, string>;
}

export const TutorView: React.FC<TutorViewProps> = ({
  currentTopic = 'Vật lý & Điện tử',
  parameters = {},
  simulationStats = {},
}) => {
  const [provider, setProvider] = useState<string>('gemini');
  const [inputMessage, setInputMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Xin chào! Tôi là Gia sư AI của Stemly. Tôi đã đồng bộ trực tiếp với thông số trên bảng mô phỏng "${currentTopic}" của bạn.\n\nTôi có thể giải thích nguyên lý mạch, kiểm tra an toàn công suất linh kiện, gợi ý trị số chuẩn E12 ngoài thực tế hoặc cùng bạn bắt bệnh mạch hỏng. Bạn muốn hỏi gì hôm nay?`,
      timestamp: 'Vừa xong',
    },
  ]);

  const isElectronics =
    currentTopic.includes('Mạch') ||
    currentTopic.includes('Linh kiện') ||
    currentTopic.includes('Điện') ||
    currentTopic.includes('Op-Amp') ||
    currentTopic.includes('Diode');

  const quickPrompts = isElectronics
    ? [
        {
          label: 'Kiểm tra an toàn & chọn E12',
          text: `Với các thông số hiện tại của "${currentTopic}", linh kiện có bị quá tải công suất hay xén ngọn không? Nên mua linh kiện trị số chuẩn E12 nào ngoài thực tế?`,
        },
        {
          label: 'Phân tích mạch đang chạy',
          text: `Hãy giải thích chi tiết từng bước tính toán từ các thông số và kết quả đo hiện có của "${currentTopic}".`,
        },
        {
          label: 'Thử thách bắt bệnh mạch hỏng',
          text: `Hãy đưa ra một tình huống hỏng hóc thực tế trên mạch "${currentTopic}" (ví dụ đứt trở, chập tụ, ngược cực Diode) kèm số đo VOM để tôi tập chẩn đoán lỗi.`,
        },
        {
          label: 'Lỗi lắp mạch hay gặp',
          text: `Khi lắp mạch "${currentTopic}" trên breadboard ngoài đời thực, sinh viên hay mắc sai lầm nào dẫn đến cháy linh kiện hoặc sai số?`,
        },
      ]
    : [
        {
          label: 'Chứng minh công thức',
          text: `Bạn có thể chứng minh công thức toán học của ${currentTopic} từng bước một kèm giải thích bản chất vật lý không?`,
        },
        {
          label: 'Ví dụ đời thực',
          text: `Có ví dụ hay phép so sánh nào trong đời sống giúp dễ hình dung về ${currentTopic} không?`,
        },
        {
          label: 'Bẫy đề thi hay gặp',
          text: `Học sinh hay mắc những sai lầm hoặc bẫy nào nhất khi làm bài thi về ${currentTopic}?`,
        },
        {
          label: 'Bài tập mẫu có lời giải',
          text: `Hãy cho tôi một bài tập số học thực tế về ${currentTopic} kèm hướng dẫn giải chi tiết từng bước.`,
        },
      ];

  const handleSendMessage = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMsg: TutorMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/tutor/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          topic: currentTopic,
          parameters,
          simulationStats,
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await res.json();
      const assistantMsg: TutorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: !res.ok
          ? data?.error || 'Không thể nhận phản hồi từ gia sư AI vào lúc này.'
          : data.content || 'Gia sư STEM luôn sẵn sàng cho câu hỏi tiếp theo của bạn.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Không thể kết nối với dịch vụ gia sư lúc này. Vui lòng kiểm tra đường truyền và thử lại.',
          timestamp: 'Vừa xong',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const statEntries = Object.entries(simulationStats).slice(0, 3);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl flex flex-col h-[650px] overflow-hidden">
      {/* Header with Provider Selector */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-600/20 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Gia sư AI Kỹ thuật & STEM</h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Đang theo dõi: <span className="text-slate-800 dark:text-slate-200 font-medium">{currentTopic}</span>
              {statEntries.length > 0 && (
                <span className="hidden sm:inline font-mono tabular-nums text-blue-600 dark:text-blue-400">
                  {' '}
                  · {statEntries.map(([k, v]) => `${k}: ${v}`).join(' · ')}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Model Provider Switcher */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-300 dark:border-slate-800 text-xs">
          <Cpu className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-1.5" />
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 text-xs font-medium focus:outline-none cursor-pointer pr-1"
          >
            <option value="gemini" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Gemini 4 (Mặc định)</option>
            <option value="gpt-4o" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Chế độ Lý thuyết chuyên sâu</option>
            <option value="grok" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">Chế độ Thực hành Lab</option>
          </select>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex items-start gap-3 ${
              m.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 border border-slate-200 text-blue-600 dark:bg-slate-800 dark:border-slate-700 dark:text-blue-400'
              }`}
            >
              {m.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>

            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                m.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-slate-50 border border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 rounded-tl-none font-sans'
              }`}
            >
              {m.content}
              <div
                className={`text-[10px] mt-2 font-mono ${
                  m.role === 'user' ? 'text-blue-200 text-right' : 'text-slate-500'
                }`}
              >
                {m.timestamp}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-blue-600 dark:bg-slate-800 dark:border-slate-700 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-2xl rounded-tl-none p-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
              <span>Gia sư đang phân tích thông số mạch và lập luận...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Bar */}
      <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {quickPrompts.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(chip.text)}
            className="text-[11px] whitespace-nowrap shrink-0 px-3 py-1 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 dark:bg-slate-900 dark:hover:bg-blue-950/80 dark:border-slate-800 dark:hover:border-blue-700/60 dark:text-slate-300 dark:hover:text-blue-300 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputMessage);
        }}
        className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Hỏi về ${currentTopic}, cách chọn linh kiện hoặc bắt lỗi mạch...`}
          className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !inputMessage.trim()}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md whitespace-nowrap"
        >
          {isLoading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          <span>Gửi</span>
        </button>
      </form>
    </div>
  );
};

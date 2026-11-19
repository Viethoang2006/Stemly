import React, { useState } from 'react';
import { VisualTemplate } from '../../types/stemly';
import { Sliders, Sparkles, Send, Bot, RefreshCw, CheckCircle2 } from 'lucide-react';

interface VisualiserControllerPanelProps {
  template: VisualTemplate;
  parameters: Record<string, number>;
  onParameterChange: (name: string, value: number) => void;
  onParametersBatchChange: (updates: Record<string, number>) => void;
  onResetDefaults: () => void;
  simulationStats?: Record<string, string>;
  onSelectSandboxPreset?: (presetKey: string, presetParams: Record<string, number>) => void;
}

export const VisualiserControllerPanel: React.FC<VisualiserControllerPanelProps> = ({
  template,
  parameters,
  onParameterChange,
  onParametersBatchChange,
  onResetDefaults,
  simulationStats = {},
  onSelectSandboxPreset,
}) => {
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiMessage, setAiMessage] = useState<{ type: 'update' | 'chat'; text: string } | null>(null);

  const quickPrompts: Record<string, { label: string; prompt: string }[]> = {
    projectile_motion: [
      { label: 'Tầm xa cực đại (45°) 🎯', prompt: 'Chỉnh góc phóng thành 45 độ' },
      { label: 'Không trọng lực 🌌', prompt: 'Nếu trọng lực bằng 0 hoặc 1.6 m/s2 như trên Mặt Trăng thì sao?' },
      { label: 'Tăng tốc độ ⚡', prompt: 'Tăng vận tốc phóng ban đầu lên 45 m/s' },
      { label: 'Tại sao là parabol? 💡', prompt: 'Vì sao quỹ đạo của vật ném lại tạo thành đường cong parabol?' },
    ],
    free_fall: [
      { label: 'Thả từ 80m 🏢', prompt: 'Đặt độ cao thả rơi thành 80 mét' },
      { label: 'Trọng lực Sao Mộc 🪐', prompt: 'Chỉnh gia tốc trọng trường thành 24.8 m/s2 như trên Sao Mộc' },
      { label: 'Rơi trên Mặt Trăng 🌙', prompt: 'Chỉnh trọng lực thành 1.6 m/s2' },
      { label: 'Khối lượng có ảnh hưởng? 💨', prompt: 'Trong chân không thì vật nặng và vật nhẹ rơi có cùng tốc độ không?' },
    ],
    shm: [
      { label: 'Lò xo cứng (120 N/m) ⛓️', prompt: 'Đặt độ cứng lò xo k thành 120 N/m' },
      { label: 'Tăng khối lượng vật 🪨', prompt: 'Tăng khối lượng m lên 6 kg' },
      { label: 'Biên độ lớn (7m) 🌊', prompt: 'Đặt biên độ A thành 7 mét' },
      { label: 'Bảo toàn cơ năng ⚡', prompt: 'Giải thích sự chuyển hóa giữa động năng và thế năng trong dao động điều hòa' },
    ],
    optics: [
      { label: 'Vật tại 2F 📍', prompt: 'Đặt khoảng cách vật u bằng 2 lần tiêu cự' },
      { label: 'Kính lúp (u < f) 🔍', prompt: 'Đặt vật gần hơn tiêu cự để xem ảnh ảo phóng đại' },
      { label: 'Vật tại tiêu điểm F 🔭', prompt: 'Đặt vật chính xác tại tiêu cự f' },
      { label: 'Ba tia sáng đặc biệt 💡', prompt: 'Giải thích đường truyền của 3 tia sáng đặc biệt qua thấu kính hội tụ' },
    ],
    kinematics: [
      { label: 'Hãm phanh (-3 m/s²) 🛑', prompt: 'Đặt vận tốc đầu 25 và gia tốc -3 m/s2' },
      { label: 'Tăng tốc nhanh 🏎️', prompt: 'Đặt vận tốc đầu 5 và gia tốc 6 m/s2' },
      { label: 'Chuyển động đều ➡️', prompt: 'Đặt gia tốc a bằng 0 m/s2' },
      { label: 'Ý nghĩa diện tích đồ thị 📐', prompt: 'Diện tích bên dưới đồ thị vận tốc - thời gian có ý nghĩa gì?' },
    ],
    atom: [
      { label: 'Nguyên tử Cacbon (Z=6) 🌿', prompt: 'Chỉnh proton thành 6 và neutron thành 6' },
      { label: 'Nguyên tử Oxi (Z=8) 💨', prompt: 'Chỉnh proton thành 8 và neutron thành 8' },
      { label: 'Nguyên tử Hiđrô (Z=1) ☀️', prompt: 'Chỉnh proton thành 1 và neutron thành 0' },
      { label: 'Quy tắc điền electron ⚛️', prompt: 'Giải thích cách các lớp vỏ electron K, L, M được lấp đầy' },
    ],
    circuits: [
      { label: 'Cầu phân áp 12V -> 8.2V', prompt: 'Chỉnh sang mạch phân áp với V = 12V, R1 = 100 ohm, R2 = 220 ohm' },
      { label: 'Mạch song song (KCL)', prompt: 'Chuyển sang mạch song song hai nhánh R1 = 100 ohm và R2 = 100 ohm' },
      { label: 'Thử quá tải công suất', prompt: 'Chỉnh V = 24V và R1 = 20 ohm để kiểm tra cảnh báo quá công suất 0.25W' },
      { label: 'Tư vấn chọn trở chuẩn E12', prompt: 'Giải thích cách chọn giá trị điện trở chuẩn E12 và công suất chịu tải an toàn' },
    ],
    rlc_ac: [
      { label: 'Đặt cộng hưởng ZL = ZC', prompt: 'Tìm và đặt tần số cộng hưởng cho mạch RLC hiện tại' },
      { label: 'Mạch mang tính cảm', prompt: 'Tăng tần số f lên 300 Hz để mạch mang tính cảm kháng' },
      { label: 'Mạch mang tính dung', prompt: 'Giảm tần số f xuống 50 Hz để mạch mang tính dung kháng' },
      { label: 'Ý nghĩa cosφ và cộng hưởng', prompt: 'Giải thích ý nghĩa hệ số công suất cosφ và hiện tượng cộng hưởng trong mạch RLC' },
    ],
    components_lab: [
      { label: 'Khảo sát Diode Zener 5.1V', prompt: 'Chuyển sang Diode Zener với Vcc = 10V và RL = 220 ohm' },
      { label: 'BJT khuếch đại tuyến tính', prompt: 'Chuyển sang BJT NPN với Vcc = 12V, RL = 500 ohm, IB = 40 uA' },
      { label: 'Đẩy BJT vào bão hòa', prompt: 'Chuyển sang BJT với Vcc = 9V, RL = 1000 ohm và IB = 80 uA để xem điểm Q bão hòa' },
      { label: 'Cách xác định điểm Q', prompt: 'Đường tải một chiều DC Load Line và điểm làm việc Q có ý nghĩa gì?' },
    ],
    rectifier_diode: [
      { label: 'Tắt tụ lọc để xem gợn', prompt: 'Đặt tụ lọc C = 0 uF để quan sát sóng chỉnh lưu chưa lọc' },
      { label: 'Lọc phẳng với tụ 470μF', prompt: 'Bật tụ lọc nguồn C = 470 uF trên mạch chỉnh lưu cầu' },
      { label: 'So sánh Nửa kỳ vs Cầu', prompt: 'Chuyển sang chỉnh lưu nửa chu kỳ để so sánh điện áp DC và độ gợn sóng' },
      { label: 'Sụt áp 1.4V trên cầu Diode', prompt: 'Tại sao mạch chỉnh lưu cầu 4 Diode lại bị sụt áp khoảng 1.4V so với đỉnh AC?' },
    ],
    analog_opamp_555: [
      { label: 'Gây xén ngọn (Clipping)', prompt: 'Chỉnh Op-Amp đảo với Rin = 10k, Rf = 68k, Vin = 3V, Vcc = 12V để thấy xén ngọn' },
      { label: 'Khuếch đại không đảo', prompt: 'Chuyển sang Op-Amp không đảo với Rin = 10k, Rf = 30k, Vin = 2V' },
      { label: 'Mạch tạo xung NE555', prompt: 'Chuyển sang chế độ tạo xung NE555 Astable với R1 = 10k, R2 = 47k, C = 10 uF' },
      { label: 'Tại sao bị xén ngọn?', prompt: 'Giải thích nguyên nhân gây ra hiện tượng bão hòa xén ngọn trên Op-Amp' },
    ],
    circuit_sandbox: [
      { label: 'Nạp tụ chậm (0.4×)', prompt: 'Giảm tốc độ mô phỏng xuống 0.4 lần và tăng điện trở R lên 1000 ohm để quan sát rõ quá trình tụ nạp' },
      { label: 'Tăng nguồn 24V', prompt: 'Chỉnh điện áp nguồn thành 24V' },
      { label: 'Tụ dung lượng lớn 1000μF', prompt: 'Đặt điện dung tụ thành 1000 uF' },
      { label: 'Hằng số thời gian RC là gì?', prompt: 'Giải thích ý nghĩa hằng số thời gian τ = R × C trong mạch nạp xả tụ điện' },
    ],
    equation_plotter: [
      { label: 'Parabol úp ngược', prompt: 'Đặt a = -1 và c = 6' },
      { label: 'Nghiệm kép (tiếp xúc)', prompt: 'Đặt a = 1, b = -4, và c = 4' },
      { label: 'Độ cong dốc', prompt: 'Đặt hệ số a = 3' },
      { label: 'Công thức đỉnh parabol', prompt: 'Tọa độ đỉnh (-b / 2a) được suy ra như thế nào?' },
    ],
  };

  const currentPrompts = quickPrompts[template.templateId] || [
    { label: 'Tối ưu thông số ⚙️', prompt: 'Hãy tối ưu các thông số để quan sát hiện tượng thú vị nhất' },
    { label: 'Giải thích lý thuyết 💡', prompt: 'Giải thích định luật vật lý cơ bản đằng sau mô phỏng này' },
  ];

  const handleSendAiCommand = async (commandText: string) => {
    const text = commandText.trim();
    if (!text || isAiLoading) return;

    setIsAiLoading(true);
    setAiMessage(null);

    try {
      const res = await fetch('/api/visualiser/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: template.topic,
          templateId: template.templateId,
          parameters,
          userMessage: text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAiMessage({
          type: 'chat',
          text: data?.error || 'Không thể xử lý lệnh AI lúc này. Bạn có thể chỉnh trực tiếp bằng các thanh trượt bên dưới.',
        });
        return;
      }
      if (data.changes && Object.keys(data.changes).length > 0) {
        onParametersBatchChange(data.changes);
        setAiMessage({
          type: 'update',
          text: data.message || `Đã cập nhật thông số mô phỏng: ${JSON.stringify(data.changes)}`,
        });
      } else {
        setAiMessage({
          type: 'chat',
          text: data.message || 'Mô phỏng đã được phân tích.',
        });
      }
      setAiPrompt('');
    } catch (err) {
      console.error(err);
      setAiMessage({
        type: 'chat',
        text: 'Không thể kết nối đến bộ điều khiển AI. Bạn có thể chỉnh trực tiếp bằng các thanh trượt bên dưới.',
      });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm dark:shadow-lg space-y-4">
      {/* Title & Stats */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Bảng điều khiển tương tác</h3>
        </div>
        <button
          onClick={onResetDefaults}
          className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-800"
        >
          <RefreshCw className="w-3 h-3" /> Mặc định
        </button>
      </div>

      {/* Natural Language AI Controller Bar */}
      <div className="bg-blue-50/60 dark:bg-slate-950/70 rounded-xl p-3 border border-blue-200 dark:border-blue-900/40 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Bộ điều khiển AI bằng ngôn ngữ tự nhiên</span>
          </div>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">Trí tuệ nhân tạo Gemini</span>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendAiCommand(aiPrompt);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder={`Ví dụ: "Nếu không có trọng lực thì sao?" hoặc "Chỉnh góc 45 độ"`}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            type="submit"
            disabled={isAiLoading || !aiPrompt.trim()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1 transition-colors shadow-sm"
          >
            {isAiLoading ? (
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            <span>Áp dụng</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {currentPrompts.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendAiCommand(chip.prompt)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white hover:bg-blue-50 dark:bg-slate-900/90 dark:hover:bg-blue-950/70 border border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700/60 text-slate-700 dark:text-slate-300 hover:text-blue-700 dark:hover:text-blue-300 transition-all text-left"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* AI Response Bubble */}
        {aiMessage && (
          <div
            className={`p-2.5 rounded-lg text-xs leading-relaxed flex items-start gap-2 border ${
              aiMessage.type === 'update'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300'
                : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-300'
            }`}
          >
            {aiMessage.type === 'update' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{aiMessage.text}</div>
          </div>
        )}
      </div>

      {/* Optional Sandbox Circuit Presets */}
      {template.presets && template.presets.length > 0 && onSelectSandboxPreset && (
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide">
            Mẫu mạch chuẩn theo nguyên lý vật lý
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {template.presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectSandboxPreset(preset.presetKey, preset.parameters)}
                className="text-left p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 dark:bg-slate-950/60 dark:hover:bg-blue-950/30 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600/70 transition-all space-y-1 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                    {preset.title}
                  </span>
                  {preset.formula && (
                    <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/70 dark:border-blue-800/50 shrink-0">
                      {preset.formula}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Manual Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {Object.entries(template.parameters).map(([key, config]) => {
          const val = parameters[key] ?? config.value;
          return (
            <div key={key} className="space-y-1.5 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300 font-medium">{config.label}</span>
                <span className="font-mono tabular-nums text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/40">
                  {val} {config.unit}
                </span>
              </div>
              <input
                type="range"
                min={config.min}
                max={config.max}
                step={config.step}
                value={val}
                onChange={(e) => onParameterChange(key, parseFloat(e.target.value))}
                className="w-full accent-blue-600 dark:accent-blue-500 cursor-pointer h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono tabular-nums">
                <span>{config.min} {config.unit}</span>
                {config.description && <span className="text-slate-500 dark:text-slate-400 truncate max-w-[160px]">{config.description}</span>}
                <span>{config.max} {config.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Calculated Stats Strip */}
      {Object.keys(simulationStats).length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80">
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tracking-wide mb-1.5">
            Thông số đo & phân tích thời gian thực
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(simulationStats).map(([label, val]) => (
              <div key={label} className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{label}</div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-200 font-mono tabular-nums mt-0.5">{val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

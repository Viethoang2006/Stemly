import React, { useState, useRef } from 'react';
import { Camera, Upload, Sparkles, BookOpen, ArrowRight, AlertTriangle } from 'lucide-react';
import { SAMPLE_PROBLEMS, SampleProblem } from '../../data/templates';
import { ScanResult, TemplateId } from '../../types/stemly';

interface DiagramScannerProps {
  onScanComplete: (result: ScanResult) => void;
  isProcessing: boolean;
  setIsProcessing: (loading: boolean) => void;
}

type CategoryFilter = 'all' | 'electronics' | 'physics';

export const DiagramScanner: React.FC<DiagramScannerProps> = ({
  onScanComplete,
  isProcessing,
  setIsProcessing,
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [typedPrompt, setTypedPrompt] = useState<string>('');
  const [scannerStage, setScannerStage] = useState<string>('Sẵn sàng quét sơ đồ');
  const [scanError, setScanError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSelectedImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const executeAnalysis = async (imageBase64?: string | null, textPrompt?: string) => {
    setIsProcessing(true);
    setScanError(null);
    setScannerStage('Đang nhận dạng sơ đồ mạch, linh kiện & chữ viết OCR...');

    try {
      setTimeout(() => setScannerStage('Đang phân loại bài toán với Gemini Vision AI...'), 800);
      setTimeout(() => setScannerStage('Đang trích xuất thông số R, L, C, V & khởi tạo mô phỏng...'), 1600);

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64 || selectedImage || null,
          promptText: textPrompt || typedPrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setScanError(data?.error || 'Không thể phân tích sơ đồ với Gemini AI lúc này.');
        return;
      }

      onScanComplete({
        topic: data.topic || 'Điện học & Mạch điện',
        templateId: (data.templateId as TemplateId) || 'circuits',
        variables: data.variables || Object.keys(data.parameters || { V: 12, R: 100 }),
        parameters: data.parameters || { topology: 1, V: 12, R: 100, R2: 220 },
        summary: data.summary || 'Đã phân tích đề bài và kết nối vào mô phỏng tương tác.',
        originalImage: imageBase64 || selectedImage || undefined,
        ocrText: textPrompt || typedPrompt,
      });
    } catch (err) {
      console.error(err);
      setScanError('Không thể kết nối đến máy chủ phân tích sơ đồ. Vui lòng thử lại.');
    } finally {
      setIsProcessing(false);
      setScannerStage('Sẵn sàng quét sơ đồ');
    }
  };

  // Sample cards already include validated topic, templateId & parameters — launch directly without burning AI quota
  const handleSelectSample = (sample: SampleProblem) => {
    setScanError(null);
    setSelectedImage(null);
    setTypedPrompt(sample.problemText);
    onScanComplete({
      topic: sample.topic,
      templateId: sample.templateId,
      variables: Object.keys(sample.parameters),
      parameters: sample.parameters,
      summary: sample.previewDescription,
      ocrText: sample.problemText,
      sandboxPresetKey: sample.sandboxPresetKey,
    });
  };

  const filteredSamples =
    categoryFilter === 'all'
      ? SAMPLE_PROBLEMS
      : SAMPLE_PROBLEMS.filter((p) => p.category === categoryFilter);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-6 sm:p-8 text-white border border-blue-500/20 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-2.5">
          <div className="text-xs font-medium text-blue-200 flex items-center gap-2">
            <span>Nhận diện Sơ đồ Mạch điện</span>
            <span aria-hidden="true">·</span>
            <span>Linh kiện Điện tử</span>
            <span aria-hidden="true">·</span>
            <span>Bài tập STEM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-balance">
            Quét. Phân tích. Mô phỏng Mạch & Vật lý.
          </h1>
          <p className="text-sm sm:text-base text-blue-100/90 max-w-xl leading-relaxed">
            Chụp ảnh sơ đồ mạch vẽ tay, bài tập RLC, mạch khuếch đại Op-Amp hoặc linh kiện thực tế (điện trở vạch màu, tụ điện) để chạy ngay mô phỏng 60 FPS, đo VOM ảo và nhận hướng dẫn sửa lỗi từ AI.
          </p>
        </div>

        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Scanner Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm dark:shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Left: Viewfinder / Camera Upload */}
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 bg-slate-50 dark:bg-slate-950/60 relative overflow-hidden transition-all group min-h-[260px]">
            {isProcessing && (
              <div className="absolute inset-0 bg-white/95 dark:bg-slate-950/90 z-20 flex flex-col items-center justify-center p-6 text-center space-y-4">
                <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{scannerStage}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">Gemini Vision AI đang đọc thông số linh kiện & sơ đồ</div>
                </div>
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scan" />
              </div>
            )}

            {selectedImage ? (
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img
                  src={selectedImage}
                  alt="Sơ đồ mạch hoặc linh kiện đã chọn"
                  className="max-h-[200px] w-auto object-contain rounded-lg shadow-md border border-slate-200 dark:border-slate-800"
                />
                <button
                  onClick={() => setSelectedImage(null)}
                  className="mt-3 text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium"
                >
                  Xóa & Chọn ảnh khác
                </button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Chụp ảnh Sơ đồ mạch hoặc Linh kiện thật
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                    Hỗ trợ ảnh vẽ tay mạch KCL/KVL, RLC, chỉnh lưu, Op-Amp, vạch màu điện trở hoặc bài tập sách giáo khoa
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Máy ảnh</span>
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold dark:border-slate-700 transition-colors whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh lên</span>
                  </button>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={cameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
              }}
            />
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) handleImageFile(e.target.files[0]);
              }}
            />
          </div>

          {/* Right: Text Problem Description */}
          <div className="flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                <span>Đề bài mạch điện / linh kiện hoặc mô tả hiện tượng</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">Bối cảnh bổ sung</span>
              </label>
              <textarea
                value={typedPrompt}
                onChange={(e) => setTypedPrompt(e.target.value)}
                placeholder="Ví dụ: Cho mạch cầu phân áp Vin = 12V, R1 = 100Ω, R2 = 220Ω... Hoặc mạch RLC nối tiếp R = 40Ω, L = 100mH, C = 15μF ở tần số 120Hz..."
                rows={5}
                className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none font-sans leading-relaxed"
              />
            </div>

            <button
              onClick={() => executeAnalysis(selectedImage, typedPrompt)}
              disabled={isProcessing || (!selectedImage && !typedPrompt.trim())}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý với Gemini Vision AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Quét & Khởi chạy mô phỏng tương tác</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </div>
        </div>

        {scanError && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200 text-xs flex items-start gap-2 leading-relaxed">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>{scanError}</span>
          </div>
        )}
      </div>

      {/* Instant 1-Click Sample Problems with Interactive Filter */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Bài toán & Sơ đồ mẫu thực hành nhanh
            </h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'electronics', label: 'Mạch điện & Linh kiện' },
              { id: 'physics', label: 'Vật lý & Toán' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id as CategoryFilter)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  categoryFilter === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredSamples.map((problem) => (
            <div
              key={problem.id}
              onClick={() => handleSelectSample(problem)}
              className="bg-white hover:bg-slate-50 dark:bg-slate-900/90 dark:hover:bg-slate-800/90 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-600/60 rounded-xl p-3.5 cursor-pointer transition-all group flex flex-col justify-between shadow-sm hover:shadow-md"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-600 dark:text-blue-400 font-medium truncate max-w-[180px]">
                    {problem.topic}
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1 font-medium transition-colors whitespace-nowrap shrink-0">
                    <span>Mô phỏng</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>

                <div className="h-24 w-full bg-slate-950 rounded-lg p-2 flex items-center justify-center border border-slate-200 dark:border-slate-800/60 overflow-hidden">
                  <div
                    className="w-full h-full flex items-center justify-center"
                    dangerouslySetInnerHTML={{ __html: problem.diagramSvg }}
                  />
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                    {problem.title}
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5">
                    {problem.previewDescription}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

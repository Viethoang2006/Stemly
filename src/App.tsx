import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/layout/Header';
import { BottomNav, NavTab } from './components/layout/BottomNav';
import { DiagramScanner } from './components/scanner/DiagramScanner';
import { VisualiserFactory } from './components/visualiser/VisualiserFactory';
import { VisualiserControllerPanel } from './components/visualiser/VisualiserControllerPanel';
import { NotesView } from './components/notes/NotesView';
import { QuizView } from './components/quiz/QuizView';
import { TutorView } from './components/tutor/TutorView';
import { HistoryView } from './components/history/HistoryView';
import { DEFAULT_TEMPLATES } from './data/templates';
import {
  TemplateId,
  VisualTemplate,
  StudyNotes,
  QuizData,
  ScanResult,
  HistoryItem,
} from './types/stemly';
import { Eye, BookOpen, HelpCircle, Sparkles, MessageSquare, Glasses } from 'lucide-react';
import { PhysicsVRModal } from './components/visualiser/PhysicsVRModal';
import { GyroPermissionState, requestGyroPermission } from './components/visualiser/vrGyroControls';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('visualiser');
  const [isMobileFrameMode, setIsMobileFrameMode] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('stemly_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try {
      localStorage.setItem('stemly_theme', theme);
    } catch {}
  }, [theme]);

  // Simulation State
  const [currentTemplateId, setCurrentTemplateId] = useState<TemplateId>('projectile_motion');
  const [parameters, setParameters] = useState<Record<string, number>>({
    U: 25,
    theta: 45,
    g: 9.8,
  });
  const [simulationStats, setSimulationStats] = useState<Record<string, string>>({});

  // Dedicated Circuit Lab Tab State
  const [circuitLabParams, setCircuitLabParams] = useState<Record<string, number>>({
    V_src: 12,
    R_val: 220,
    C_val: 470,
    L_val: 150,
    simSpeed: 1,
  });
  const [circuitLabStats, setCircuitLabStats] = useState<Record<string, string>>({});
  const [sandboxPresetRequest, setSandboxPresetRequest] = useState<
    { key: string; nonce: number; parameters?: Record<string, number> } | undefined
  >(undefined);

  // Study Notes & Quiz State (Lazy + Cached by topic to protect API quota)
  const [studyTopic, setStudyTopic] = useState<string>('Chuyển động ném xiên');
  const [notesCache, setNotesCache] = useState<Record<string, StudyNotes>>({});
  const [quizCache, setQuizCache] = useState<Record<string, QuizData>>({});
  const [notesError, setNotesError] = useState<string | null>(null);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isNotesLoading, setIsNotesLoading] = useState<boolean>(false);
  const [isQuizLoading, setIsQuizLoading] = useState<boolean>(false);
  const [isScanProcessing, setIsScanProcessing] = useState<boolean>(false);
  const [isPhysicsVRViewOpen, setIsPhysicsVRViewOpen] = useState<boolean>(false);
  const [physicsGyroPerm, setPhysicsGyroPerm] = useState<GyroPermissionState>('idle');

  // History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('stemly_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'hist-init-1',
        timestamp: 'Gần đây',
        topic: 'Chuyển động ném xiên',
        templateId: 'projectile_motion',
        summary: 'Bắn đại bác ở góc 45° với U = 25 m/s dưới trọng lực chuẩn.',
        parameters: { U: 25, theta: 45, g: 9.8 },
      },
    ];
  });

  const currentTemplate: VisualTemplate =
    DEFAULT_TEMPLATES[currentTemplateId] || DEFAULT_TEMPLATES.projectile_motion;

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('stemly_history', JSON.stringify(historyItems));
    } catch (e) {
      console.error(e);
    }
  }, [historyItems]);

  // Fetch Study Notes (only when explicitly requested or tab opened & uncached)
  const fetchNotes = useCallback(
    async (topic: string, vars: Record<string, number>, promptText = '', forceRefresh = false) => {
      if (!forceRefresh && notesCache[topic]) {
        setNotesError(null);
        return;
      }
      setIsNotesLoading(true);
      setNotesError(null);
      try {
        const res = await fetch('/api/notes/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic,
            variables: Object.keys(vars),
            parameters: vars,
            promptText,
            forceRefresh,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setNotesError(data?.error || 'Không thể tạo ghi chú AI vào lúc này.');
          return;
        }
        setNotesCache((prev) => ({ ...prev, [topic]: data }));
      } catch (err) {
        console.error('Failed to fetch notes:', err);
        setNotesError('Không thể kết nối đến máy chủ tạo ghi chú AI.');
      } finally {
        setIsNotesLoading(false);
      }
    },
    [notesCache]
  );

  // Fetch Quiz (only when explicitly requested or tab opened & uncached)
  const fetchQuiz = useCallback(
    async (topic: string, forceRefresh = false) => {
      if (!forceRefresh && quizCache[topic]) {
        setQuizError(null);
        return;
      }
      setIsQuizLoading(true);
      setQuizError(null);
      try {
        const res = await fetch('/api/quiz/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, count: 5, forceRefresh }),
        });
        const data = await res.json();
        if (!res.ok) {
          setQuizError(data?.error || 'Không thể tạo bài trắc nghiệm AI vào lúc này.');
          return;
        }
        setQuizCache((prev) => ({ ...prev, [topic]: data }));
      } catch (err) {
        console.error('Failed to fetch quiz:', err);
        setQuizError('Không thể kết nối đến máy chủ tạo trắc nghiệm AI.');
      } finally {
        setIsQuizLoading(false);
      }
    },
    [quizCache]
  );

  const activeNotesTopic = activeTab === 'circuit_lab' ? DEFAULT_TEMPLATES.circuit_sandbox.topic : studyTopic;
  const activeNotes = notesCache[activeNotesTopic] || null;
  const activeQuiz = quizCache[activeNotesTopic] || null;

  // Handle tab navigation with lazy load only when opening Notes/Quiz for an uncached topic
  const handleSelectTab = (tab: NavTab) => {
    const targetTopic = tab === 'circuit_lab' ? DEFAULT_TEMPLATES.circuit_sandbox.topic : studyTopic;
    if (tab === 'notes' && !notesCache[targetTopic] && !isNotesLoading) {
      fetchNotes(targetTopic, targetTopic === DEFAULT_TEMPLATES.circuit_sandbox.topic ? circuitLabParams : parameters);
    }
    if (tab === 'quiz' && !quizCache[targetTopic] && !isQuizLoading) {
      fetchQuiz(targetTopic);
    }
    setActiveTab(tab);
  };

  // Handle template selection (0 background Gemini calls)
  const handleSelectTemplate = (templateId: TemplateId) => {
    const t = DEFAULT_TEMPLATES[templateId];
    if (!t) return;

    const initialParams: Record<string, number> = {};
    Object.entries(t.parameters).forEach(([k, config]) => {
      initialParams[k] = config.value;
    });

    setCurrentTemplateId(templateId);
    setStudyTopic(t.topic);
    setParameters(initialParams);
    setNotesError(null);
    setQuizError(null);
  };

  // Handle Scan Complete (0 eager background notes/quiz calls)
  const handleScanComplete = (result: ScanResult) => {
    setCurrentTemplateId(result.templateId);
    setStudyTopic(result.topic);
    setParameters(result.parameters);
    setNotesError(null);
    setQuizError(null);

    // Save to history
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      topic: result.topic,
      templateId: result.templateId,
      summary: result.summary,
      parameters: result.parameters,
      imageThumbnail: result.originalImage,
    };
    setHistoryItems((prev) => [newItem, ...prev.slice(0, 19)]);

    if (result.templateId === 'circuit_sandbox') {
      setCircuitLabParams((prev) => ({ ...prev, ...result.parameters }));
      if (result.sandboxPresetKey) {
        setSandboxPresetRequest({
          key: result.sandboxPresetKey,
          nonce: Date.now(),
          parameters: result.parameters,
        });
      }
    }

    // Navigate directly to Circuit Lab if sandbox template, else Visualiser
    setActiveTab(result.templateId === 'circuit_sandbox' ? 'circuit_lab' : 'visualiser');
  };

  // Handle Parameter Adjustment
  const handleParameterChange = (name: string, value: number) => {
    setParameters((prev) => ({ ...prev, [name]: value }));
  };

  const handleParametersBatchChange = (updates: Record<string, number>) => {
    setParameters((prev) => ({ ...prev, ...updates }));
  };

  const handleResetDefaults = () => {
    const initialParams: Record<string, number> = {};
    Object.entries(currentTemplate.parameters).forEach(([k, config]) => {
      initialParams[k] = config.value;
    });
    setParameters(initialParams);
  };

  const handleSelectHistoryItem = (item: HistoryItem) => {
    setCurrentTemplateId(item.templateId);
    setStudyTopic(item.topic);
    setParameters(item.parameters);
    setNotesError(null);
    setQuizError(null);
    setActiveTab(item.templateId === 'circuit_sandbox' ? 'circuit_lab' : 'visualiser');
  };

  const handleClearHistory = () => {
    setHistoryItems([]);
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'scan':
        return (
          <DiagramScanner
            onScanComplete={handleScanComplete}
            isProcessing={isScanProcessing}
            setIsProcessing={setIsScanProcessing}
          />
        );
      case 'visualiser':
        return (
          <div className="space-y-6">
            {/* Simulation Header with Quick Links */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentTemplate.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span>Mô phỏng tương tác 60 FPS</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{currentTemplate.title}</h2>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {currentTemplateId !== 'circuit_sandbox' && (
                  <button
                    type="button"
                    onClick={async () => {
                      const perm = await requestGyroPermission();
                      setPhysicsGyroPerm(perm);
                      setIsPhysicsVRViewOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-500/15 dark:hover:bg-sky-500/25 dark:text-sky-200 dark:border-sky-500/40 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    title="Chuyển sang chế độ VR View toàn màn hình 3D với con quay hồi chuyển"
                  >
                    <Glasses className="w-3.5 h-3.5" />
                    <span>VR View</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setStudyTopic(currentTemplate.topic);
                    fetchNotes(currentTemplate.topic, parameters);
                    setActiveTab('notes');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold dark:border-slate-700 transition-colors whitespace-nowrap"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Ghi chú học tập</span>
                </button>
                <button
                  onClick={() => {
                    setStudyTopic(currentTemplate.topic);
                    fetchQuiz(currentTemplate.topic);
                    setActiveTab('quiz');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Làm trắc nghiệm</span>
                </button>
              </div>
            </div>

            {/* Simulation Engine Screen */}
            <div className={currentTemplateId === 'circuit_sandbox' ? 'w-full' : 'h-[460px] sm:h-[530px] w-full'}>
              <VisualiserFactory
                templateId={currentTemplateId}
                parameters={parameters}
                onSimulationStats={setSimulationStats}
                onParametersBatchChange={handleParametersBatchChange}
                sandboxPresetRequest={sandboxPresetRequest}
              />
            </div>

            {/* Controller Panel with Sliders & AI Natural Language Prompt Controller */}
            <VisualiserControllerPanel
              template={currentTemplate}
              parameters={parameters}
              onParameterChange={handleParameterChange}
              onParametersBatchChange={handleParametersBatchChange}
              onResetDefaults={handleResetDefaults}
              simulationStats={simulationStats}
              onSelectSandboxPreset={(presetKey, presetParams) => {
                setParameters((prev) => ({ ...prev, ...presetParams }));
                setSandboxPresetRequest({
                  key: presetKey,
                  nonce: Date.now(),
                  parameters: presetParams,
                });
              }}
            />
          </div>
        );
      case 'circuit_lab':
        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">Phòng thí nghiệm Mạch điện</span>
                  <span aria-hidden="true">·</span>
                  <span>Kéo thả linh kiện & Đo dòng áp thực tế</span>
                </div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {DEFAULT_TEMPLATES.circuit_sandbox.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const rcTopic = DEFAULT_TEMPLATES.circuit_sandbox.topic;
                    setStudyTopic(rcTopic);
                    fetchNotes(rcTopic, circuitLabParams);
                    setActiveTab('notes');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 text-xs font-semibold dark:border-slate-700 transition-colors whitespace-nowrap"
                >
                  <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Ghi chú mạch RC</span>
                </button>
                <button
                  onClick={() => {
                    const rcTopic = DEFAULT_TEMPLATES.circuit_sandbox.topic;
                    setStudyTopic(rcTopic);
                    fetchQuiz(rcTopic);
                    setActiveTab('quiz');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md transition-colors whitespace-nowrap"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Trắc nghiệm mạch</span>
                </button>
              </div>
            </div>

            <div className="w-full">
              <VisualiserFactory
                templateId="circuit_sandbox"
                parameters={circuitLabParams}
                onSimulationStats={setCircuitLabStats}
                onParametersBatchChange={(updates) =>
                  setCircuitLabParams((prev) => ({ ...prev, ...updates }))
                }
                sandboxPresetRequest={sandboxPresetRequest}
              />
            </div>

            <VisualiserControllerPanel
              template={DEFAULT_TEMPLATES.circuit_sandbox}
              parameters={circuitLabParams}
              onParameterChange={(name, value) =>
                setCircuitLabParams((prev) => ({ ...prev, [name]: value }))
              }
              onParametersBatchChange={(updates) =>
                setCircuitLabParams((prev) => ({ ...prev, ...updates }))
              }
              onResetDefaults={() =>
                setCircuitLabParams({ V_src: 12, R_val: 220, C_val: 470, L_val: 150, simSpeed: 1 })
              }
              simulationStats={circuitLabStats}
              onSelectSandboxPreset={(presetKey, presetParams) => {
                setCircuitLabParams((prev) => ({ ...prev, ...presetParams }));
                setSandboxPresetRequest({
                  key: presetKey,
                  nonce: Date.now(),
                  parameters: presetParams,
                });
              }}
            />
          </div>
        );
      case 'notes':
        return (
          <NotesView
            notes={activeNotes}
            isLoading={isNotesLoading}
            error={notesError}
            onRefreshNotes={() =>
              fetchNotes(
                studyTopic,
                studyTopic === DEFAULT_TEMPLATES.circuit_sandbox.topic ? circuitLabParams : parameters,
                '',
                true
              )
            }
          />
        );
      case 'quiz':
        return (
          <QuizView
            quiz={activeQuiz}
            isLoading={isQuizLoading}
            error={quizError}
            onGenerateQuiz={() => fetchQuiz(studyTopic, true)}
          />
        );
      case 'tutor':
        return (
          <TutorView
            currentTopic={studyTopic}
            parameters={studyTopic === DEFAULT_TEMPLATES.circuit_sandbox.topic ? circuitLabParams : parameters}
            simulationStats={studyTopic === DEFAULT_TEMPLATES.circuit_sandbox.topic ? circuitLabStats : simulationStats}
          />
        );
      case 'history':
        return (
          <HistoryView
            historyItems={historyItems}
            onSelectHistory={handleSelectHistoryItem}
            onClearHistory={handleClearHistory}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white transition-colors">
      {/* Top Application Header */}
      <Header
        currentTab={activeTab}
        onSelectTab={(t) => handleSelectTab(t as NavTab)}
        isMobileFrameMode={isMobileFrameMode}
        onToggleMobileFrame={() => setIsMobileFrameMode(!isMobileFrameMode)}
        currentTemplateId={currentTemplateId}
        onSelectTemplate={(tid) => {
          handleSelectTemplate(tid);
          if (tid === 'circuit_sandbox') {
            setActiveTab('circuit_lab');
          } else if (activeTab !== 'visualiser') {
            setActiveTab('visualiser');
          }
        }}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      {/* Desktop Navigation Tab Strip */}
      {!isMobileFrameMode && (
        <div className="hidden sm:block border-b border-slate-200 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/50 transition-colors">
          <BottomNav currentTab={activeTab} onSelectTab={handleSelectTab} />
        </div>
      )}

      {/* Main Content Area: Responsive Mobile Frame vs Full Desktop Canvas */}
      <main className={`flex-1 w-full mx-auto p-4 sm:p-6 pb-24 sm:pb-8 flex flex-col items-center ${activeTab === 'circuit_lab' || (activeTab === 'visualiser' && currentTemplateId === 'circuit_sandbox') ? 'max-w-[1440px]' : 'max-w-7xl'}`}>
        {isMobileFrameMode ? (
          // Mobile Simulator Phone Mockup
          <div className="w-full max-w-[420px] rounded-[38px] border-8 border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col h-[780px] relative">
            {/* Phone Speaker & Camera Notch */}
            <div className="h-6 bg-slate-200 dark:bg-slate-900 flex items-center justify-center shrink-0">
              <div className="w-20 h-3.5 bg-slate-400 dark:bg-slate-950 rounded-full flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-800" />
              </div>
            </div>

            {/* Scrollable View inside phone */}
            <div className="flex-1 overflow-y-auto p-4 pb-20">{renderTabContent()}</div>

            {/* Mobile Bottom Navigation pinned inside phone */}
            <div className="absolute bottom-0 inset-x-0">
              <BottomNav currentTab={activeTab} onSelectTab={handleSelectTab} />
            </div>
          </div>
        ) : (
          // Fullscreen Desktop Canvas
          <div className={`w-full ${activeTab === 'circuit_lab' || (activeTab === 'visualiser' && currentTemplateId === 'circuit_sandbox') ? 'max-w-[1400px]' : 'max-w-5xl'}`}>
            {renderTabContent()}
          </div>
        )}
      </main>

      {/* Persistent Bottom Navigation for mobile viewports */}
      <div className="sm:hidden">
        <BottomNav currentTab={activeTab} onSelectTab={handleSelectTab} />
      </div>

      {/* Isolated Fullscreen 3D Physics VR View */}
      <PhysicsVRModal
        isOpen={isPhysicsVRViewOpen}
        onClose={() => setIsPhysicsVRViewOpen(false)}
        templateId={currentTemplateId}
        topic={currentTemplate.topic}
        title={currentTemplate.title}
        parameters={parameters}
        initialGyroPermission={physicsGyroPerm}
      />
    </div>
  );
}

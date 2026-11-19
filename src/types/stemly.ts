export type TopicType =
  | 'Chuyển động ném xiên'
  | 'Sự rơi tự do'
  | 'Dao động điều hòa'
  | 'Quang hình học'
  | 'Động học chất điểm'
  | 'Cấu trúc nguyên tử'
  | 'Điện học & Mạch điện'
  | 'Mạch RLC xoay chiều & Máy hiện sóng'
  | 'Linh kiện điện tử & Đặc tuyến I-V'
  | 'Mạch chỉnh lưu Diode & Lọc nguồn'
  | 'Khuếch đại Op-Amp & Xung NE555'
  | 'Thiết kế & Mô phỏng Mạch kéo thả'
  | 'Khảo sát đồ thị hàm số'
  | string;

export type TemplateId =
  | 'projectile_motion'
  | 'free_fall'
  | 'shm'
  | 'optics'
  | 'kinematics'
  | 'atom'
  | 'circuits'
  | 'rlc_ac'
  | 'components_lab'
  | 'rectifier_diode'
  | 'analog_opamp_555'
  | 'circuit_sandbox'
  | 'equation_plotter';

export type TemplateCategory = 'electronics' | 'physics';

export interface ParameterConfig {
  name: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  description?: string;
}

export interface SandboxCircuitPreset {
  id: string;
  presetKey: string;
  title: string;
  description: string;
  formula?: string;
  parameters: Record<string, number>;
}

export interface VisualTemplate {
  templateId: TemplateId;
  topic: TopicType;
  category: TemplateCategory;
  title: string;
  description: string;
  parameters: Record<string, ParameterConfig>;
  presets?: SandboxCircuitPreset[];
}

export interface StudyNotes {
  topic: string;
  explanation: string;
  variable_breakdown: Record<string, string>;
  formulas: string[];
  example: string;
  mistakes: string[];
  practice_questions: string[];
  summary: string[];
  resources: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  takeaway?: string;
}

export interface QuizData {
  topic: string;
  questions: QuizQuestion[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  changes?: Record<string, number>;
}

export interface ScanResult {
  topic: TopicType;
  templateId: TemplateId;
  variables: string[];
  parameters: Record<string, number>;
  summary: string;
  originalImage?: string;
  ocrText?: string;
  sandboxPresetKey?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  topic: TopicType;
  templateId: TemplateId;
  summary: string;
  parameters: Record<string, number>;
  notes?: StudyNotes;
  imageThumbnail?: string;
}

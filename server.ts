import express from 'express';
import type { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize GoogleGenAI client (Server-side only)
const rawKey = process.env.GEMINI_API_KEY || '';
const apiKey = rawKey && rawKey !== 'MY_GEMINI_API_KEY' ? rawKey : '';

const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';
const CANDIDATE_MODELS = [PRIMARY_MODEL, FALLBACK_MODEL];

// Highest supported reasoning config per model:
// ThinkingLevel.XHIGH is exclusively supported on gemini-4-hydrogen; Gemini 3 models use ThinkingLevel.HIGH.
function getThinkingConfig(model: string, deep = true) {
  if (model === PRIMARY_MODEL) {
    return { thinkingLevel: deep ? ThinkingLevel.XHIGH : ThinkingLevel.HIGH };
  }
  return { thinkingLevel: ThinkingLevel.HIGH };
}

// Track per-model cooldown timestamps after 429 RESOURCE_EXHAUSTED
const modelCooldownUntil: Record<string, number> = {};
const notesCache = new Map<string, any>();
const quizCache = new Map<string, any>();

class GeminiServiceError extends Error {
  status: number;
  code: string;
  retryAfterSeconds?: number;

  constructor(code: string, status: number, message: string, retryAfterSeconds?: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function parseGeminiError(err: any): { status: number; code: string; message: string; retryAfterSeconds?: number } {
  const rawMsg = typeof err?.message === 'string' ? err.message : String(err || '');
  const status = typeof err?.status === 'number' ? err.status : 0;

  const isQuota =
    status === 429 ||
    rawMsg.includes('"code":429') ||
    rawMsg.includes('RESOURCE_EXHAUSTED') ||
    rawMsg.toLowerCase().includes('quota');

  if (isQuota) {
    const retryMatch = rawMsg.match(/"retryDelay"\s*:\s*"(\d+)s"/);
    const retryAfterSeconds = retryMatch ? parseInt(retryMatch[1], 10) : 60;
    return {
      status: 429,
      code: 'RESOURCE_EXHAUSTED',
      retryAfterSeconds,
      message:
        'Hạn mức miễn phí của Gemini API (Free Tier) tạm thời đã hết. Hãy thử lại sau hoặc vào Settings > Secrets để chọn API key có bật thanh toán (Billing) nhằm tăng hạn mức.',
    };
  }

  const isAuth =
    status === 401 ||
    status === 403 ||
    rawMsg.includes('PERMISSION_DENIED') ||
    rawMsg.includes('API_KEY_INVALID') ||
    rawMsg.toLowerCase().includes('api key');

  if (isAuth) {
    return {
      status: status === 403 ? 403 : 400,
      code: 'API_KEY_INVALID',
      message: 'API key Gemini không hợp lệ hoặc thiếu quyền truy cập. Vui lòng kiểm tra mục Settings > Secrets.',
    };
  }

  return {
    status: 502,
    code: 'GEMINI_UPSTREAM_ERROR',
    message: 'Không thể nhận phản hồi từ Gemini AI lúc này. Vui lòng thử lại sau giây lát.',
  };
}

async function generateWithGemini(
  buildRequest: (model: string) => any,
  timeoutMs = 9500
): Promise<any> {
  if (!ai) {
    throw new GeminiServiceError(
      'MISSING_API_KEY',
      503,
      'Chưa cấu hình GEMINI_API_KEY. Vui lòng thiết lập API key trong mục Settings > Secrets.'
    );
  }

  const now = Date.now();
  let lastQuotaError: { retryAfterSeconds?: number; message: string } | null = null;

  for (const model of CANDIDATE_MODELS) {
    const cooldownEnd = modelCooldownUntil[model] || 0;
    if (cooldownEnd > now) {
      lastQuotaError = {
        retryAfterSeconds: Math.max(1, Math.ceil((cooldownEnd - now) / 1000)),
        message:
          'Hạn mức miễn phí của Gemini API (Free Tier) tạm thời đã hết. Hãy thử lại sau hoặc vào Settings > Secrets để chọn API key có bật thanh toán (Billing) nhằm tăng hạn mức.',
      };
      continue;
    }

    let timer: NodeJS.Timeout | undefined;
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new GeminiServiceError('TIMEOUT', 504, 'Kết nối tới Gemini AI quá thời gian chờ.'));
        }, timeoutMs);
      });

      const response = await Promise.race([ai.models.generateContent(buildRequest(model)), timeoutPromise]);
      if (timer) clearTimeout(timer);
      return response;
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      if (err instanceof GeminiServiceError) {
        throw err;
      }

      const parsed = parseGeminiError(err);
      if (parsed.code === 'RESOURCE_EXHAUSTED') {
        const cooldownMs = Math.min(Math.max((parsed.retryAfterSeconds || 60) * 1000, 60_000), 15 * 60_000);
        modelCooldownUntil[model] = Date.now() + cooldownMs;
        console.warn(`[Gemini] ${model} quota exhausted (429). Entering ${Math.round(cooldownMs / 1000)}s cooldown.`);
        lastQuotaError = {
          retryAfterSeconds: parsed.retryAfterSeconds,
          message: parsed.message,
        };
        continue;
      }

      if (parsed.code === 'API_KEY_INVALID') {
        console.warn(`[Gemini] Auth/Key error on ${model}: ${parsed.code}`);
        throw new GeminiServiceError(parsed.code, parsed.status, parsed.message);
      }

      console.warn(`[Gemini] Upstream error on ${model}:`, err?.message || err);
      throw new GeminiServiceError(parsed.code, parsed.status, parsed.message);
    }
  }

  throw new GeminiServiceError(
    'RESOURCE_EXHAUSTED',
    429,
    lastQuotaError?.message ||
      'Hạn mức miễn phí của Gemini API (Free Tier) tạm thời đã hết. Hãy thử lại sau hoặc chọn API key có bật thanh toán trong Settings > Secrets.',
    lastQuotaError?.retryAfterSeconds
  );
}

function sendGeminiErrorResponse(res: Response, error: any) {
  if (error instanceof GeminiServiceError) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
  return res.status(500).json({
    error: 'Đã xảy ra lỗi máy chủ khi xử lý yêu cầu AI.',
    code: 'INTERNAL_ERROR',
  });
}

// Topic Keywords for fast classification / fallback
const TOPIC_KEYWORDS: Record<string, string[]> = {
  'Mạch RLC xoay chiều & Máy hiện sóng': ['rlc', 'cộng hưởng', 'cảm kháng', 'dung kháng', 'lệch pha', 'phasor', 'xoay chiều', 'cuộn cảm', 'máy hiện sóng', 'oscilloscope', 'cos phi', 'tổng trở'],
  'Linh kiện điện tử & Đặc tuyến I-V': ['vạch màu', 'zener', 'bjt', 'transistor', 'mosfet', 'đặc tuyến', 'điểm làm việc', 'load line', 'đường tải', 'pinout', 'sơ đồ chân', 'led', 'tụ gốm', '104'],
  'Mạch chỉnh lưu Diode & Lọc nguồn': ['chỉnh lưu', 'cầu diode', 'nửa chu kỳ', 'toàn kỳ', 'tụ lọc', 'gợn sóng', 'ripple', 'rectifier', 'bridge', 'biến áp'],
  'Khuếch đại Op-Amp & Xung NE555': ['op-amp', 'opamp', 'khuếch đại đảo', 'không đảo', 'xén ngọn', 'clipping', 'bão hòa', '555', 'ne555', 'xung vuông', 'duty cycle', 'astable'],
  'Thiết kế & Mô phỏng Mạch kéo thả': ['kéo thả', 'sandbox', 'bảng mạch', 'nạp xả tụ', 'mạch rc', 'tự thiết kế', 'nối dây'],
  'Điện học & Mạch điện': ['mạch điện', 'phân áp', 'kirchhoff', 'kcl', 'kvl', 'song song', 'nối tiếp', 'điện trở', 'hiệu điện thế', 'dòng điện', 'ohm', 'vom', 'circuit', 'resistor', 'voltage'],
  'Chuyển động ném xiên': ['ném xiên', 'bắn đại bác', 'ném ngang', 'projectile', 'cannon', 'parabola', 'launch angle', 'trajectory', 'quỹ đạo ném'],
  'Quang hình học': ['thấu kính', 'tiêu cự', 'khúc xạ', 'phản xạ', 'tia sáng', 'lens', 'convex', 'focal', 'magnification'],
  'Động học chất điểm': ['vận tốc', 'gia tốc', 'chuyển động thẳng', 'quãng đường', 'hãm phanh', 'kinematics', 'velocity'],
  'Sự rơi tự do': ['rơi tự do', 'thả rơi', 'đỉnh tháp', 'free fall', 'falling ball'],
  'Dao động điều hòa': ['dao động điều hòa', 'con lắc lò xo', 'lò xo', 'chu kỳ', 'tần số', 'biên độ', 'shm', 'harmonic'],
  'Cấu trúc nguyên tử': ['nguyên tử', 'electron', 'proton', 'neutron', 'bohr', 'lớp vỏ electron', 'atom', 'hạt nhân'],
  'Khảo sát đồ thị hàm số': ['đồ thị', 'parabol', 'bậc hai', 'hàm số', 'toạ độ đỉnh', 'nghiệm', 'equation', 'graph', 'quadratic'],
};

function detectFallbackTopic(text: string): { topic: string; templateId: string; parameters: Record<string, number> } {
  const lower = (text || '').toLowerCase();
  for (const [topic, words] of Object.entries(TOPIC_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) {
      return getTopicDefaultConfig(topic);
    }
  }
  return getTopicDefaultConfig('Điện học & Mạch điện');
}

function getTopicDefaultConfig(topic: string): { topic: string; templateId: string; parameters: Record<string, number> } {
  const norm = topic.toLowerCase();
  if (norm.includes('rlc') || norm.includes('xoay chiều') || norm.includes('cộng hưởng')) {
    return {
      topic: 'Mạch RLC xoay chiều & Máy hiện sóng',
      templateId: 'rlc_ac',
      parameters: { U0: 12, f: 120, R: 40, L_mH: 100, C_uF: 15 },
    };
  }
  if (norm.includes('linh kiện') || norm.includes('đặc tuyến') || norm.includes('zener') || norm.includes('bjt') || norm.includes('vạch màu')) {
    return {
      topic: 'Linh kiện điện tử & Đặc tuyến I-V',
      templateId: 'components_lab',
      parameters: { device: 1, Vcc: 9, Rl: 330, Ib_uA: 30 },
    };
  }
  if (norm.includes('chỉnh lưu') || norm.includes('lọc nguồn') || norm.includes('rectifier')) {
    return {
      topic: 'Mạch chỉnh lưu Diode & Lọc nguồn',
      templateId: 'rectifier_diode',
      parameters: { mode: 2, Vrms: 12, C_uF: 220, Rl: 220 },
    };
  }
  if (norm.includes('op-amp') || norm.includes('555') || norm.includes('khuếch đại') || norm.includes('xén ngọn')) {
    return {
      topic: 'Khuếch đại Op-Amp & Xung NE555',
      templateId: 'analog_opamp_555',
      parameters: { circuitMode: 0, Vin: 2.0, R1_k: 10, R2_k: 47, Vcc: 12, C_uF: 10 },
    };
  }
  if (norm.includes('kéo thả') || norm.includes('sandbox') || norm.includes('nạp xả') || norm.includes('mạch rc')) {
    return {
      topic: 'Thiết kế & Mô phỏng Mạch kéo thả',
      templateId: 'circuit_sandbox',
      parameters: { V_src: 12, R_val: 220, C_val: 470, simSpeed: 1 },
    };
  }
  if (norm.includes('mạch') || norm.includes('điện') || norm.includes('circuit') || norm.includes('phân áp')) {
    return {
      topic: 'Điện học & Mạch điện',
      templateId: 'circuits',
      parameters: { topology: 1, V: 12, R: 100, R2: 220 },
    };
  }
  if (norm.includes('ném') || norm.includes('projectile')) {
    return {
      topic: 'Chuyển động ném xiên',
      templateId: 'projectile_motion',
      parameters: { U: 25, theta: 45, g: 9.8 },
    };
  }
  if (norm.includes('rơi') || norm.includes('fall')) {
    return {
      topic: 'Sự rơi tự do',
      templateId: 'free_fall',
      parameters: { h: 45, g: 9.8 },
    };
  }
  if (norm.includes('dao động') || norm.includes('harmonic') || norm.includes('shm') || norm.includes('lò xo')) {
    return {
      topic: 'Dao động điều hòa',
      templateId: 'shm',
      parameters: { A: 4, m: 2, k: 50 },
    };
  }
  if (norm.includes('quang') || norm.includes('thấu kính') || norm.includes('optic') || norm.includes('lens')) {
    return {
      topic: 'Quang hình học',
      templateId: 'optics',
      parameters: { f: 15, u: 30, h_o: 5 },
    };
  }
  if (norm.includes('động học') || norm.includes('kinematic') || norm.includes('vận tốc')) {
    return {
      topic: 'Động học chất điểm',
      templateId: 'kinematics',
      parameters: { u: 10, a: 3, t_max: 10 },
    };
  }
  if (norm.includes('nguyên tử') || norm.includes('atom')) {
    return {
      topic: 'Cấu trúc nguyên tử',
      templateId: 'atom',
      parameters: { protons: 6, neutrons: 6 },
    };
  }
  return {
    topic: 'Khảo sát đồ thị hàm số',
    templateId: 'equation_plotter',
    parameters: { a: 1, b: 0, c: -4 },
  };
}

// -------------------------------------------------------------
// API ROUTE: /api/scan
// Phân tích sơ đồ mạch điện, ảnh linh kiện thật hoặc đề bài STEM
// -------------------------------------------------------------
app.post('/api/scan', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', promptText = '' } = req.body;

    if (!imageBase64 && !promptText) {
      return res.status(400).json({ error: 'Vui lòng cung cấp hình ảnh hoặc văn bản đề bài để phân tích.' });
    }

    const systemPrompt = `Bạn là chuyên gia AI phân tích Sơ đồ Mạch điện, Linh kiện Điện tử & Bài tập STEM của Stemly.
Nhiệm vụ của bạn là phân tích hình ảnh (sơ đồ mạch vẽ tay, ảnh sách giáo khoa, ảnh linh kiện thật như điện trở vạch màu/tụ/IC/transistor) hoặc đề bài văn bản bằng tiếng Việt.
Phân loại chính xác vào một trong 13 chủ đề sau:
- "Điện học & Mạch điện" (templateId: "circuits", params: topology [0:đơn, 1:phân áp nối tiếp, 2:song song], V, R, R2)
- "Mạch RLC xoay chiều & Máy hiện sóng" (templateId: "rlc_ac", params: U0, f, R, L_mH, C_uF)
- "Linh kiện điện tử & Đặc tuyến I-V" (templateId: "components_lab", params: device [0:Diode, 1:Zener, 2:LED, 3:BJT], Vcc, Rl, Ib_uA)
- "Mạch chỉnh lưu Diode & Lọc nguồn" (templateId: "rectifier_diode", params: mode [0:nửa kỳ, 1:toàn kỳ, 2:cầu 4D], Vrms, C_uF, Rl)
- "Khuếch đại Op-Amp & Xung NE555" (templateId: "analog_opamp_555", params: circuitMode [0:Đảo, 1:Không đảo, 2:NE555], Vin, R1_k, R2_k, Vcc, C_uF)
- "Thiết kế & Mô phỏng Mạch kéo thả" (templateId: "circuit_sandbox", params: V_src, R_val, C_val, simSpeed)
- "Chuyển động ném xiên" (templateId: "projectile_motion", params: U, theta, g)
- "Sự rơi tự do" (templateId: "free_fall", params: h, g)
- "Dao động điều hòa" (templateId: "shm", params: A, m, k)
- "Quang hình học" (templateId: "optics", params: f, u, h_o)
- "Động học chất điểm" (templateId: "kinematics", params: u, a, t_max)
- "Cấu trúc nguyên tử" (templateId: "atom", params: protons, neutrons)
- "Khảo sát đồ thị hàm số" (templateId: "equation_plotter", params: a, b, c)

Nếu ảnh là linh kiện thật (ví dụ điện trở vạch màu, tụ 104, transistor), hãy nhận diện mã/trị số của nó trong phần "summary" và chọn "components_lab" hoặc "circuits" với thông số phù hợp.

Trả về JSON thuần túy bằng tiếng Việt:
{
  "topic": "Tên chủ đề khớp danh sách trên",
  "templateId": "circuits" | "rlc_ac" | "components_lab" | "rectifier_diode" | "analog_opamp_555" | "circuit_sandbox" | "projectile_motion" | "free_fall" | "shm" | "optics" | "kinematics" | "atom" | "equation_plotter",
  "variables": ["V", "R", "R2"],
  "parameters": { "topology": 1, "V": 12, "R": 100, "R2": 220 },
  "summary": "Tóm tắt 1-2 câu kết quả đọc ảnh/đề bài (giá trị linh kiện, kiểu mạch) bằng tiếng Việt."
}`;

    const parts: any[] = [];
    if (imageBase64) {
      const cleanData = imageBase64.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: mimeType || 'image/jpeg',
          data: cleanData,
        },
      });
    }
    parts.push({
      text: `${systemPrompt}\n\nĐề bài / Bối cảnh người dùng cung cấp: ${promptText || 'Phân tích hình ảnh sơ đồ mạch điện hoặc linh kiện điện tử này bằng tiếng Việt.'}`,
    });

    const response = await generateWithGemini(
      (model) => ({
        model,
        contents: { parts },
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: getThinkingConfig(model, true),
        },
      }),
      20000
    );

    const text = response?.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    if (parsed && parsed.topic && parsed.templateId) {
      return res.json(parsed);
    }

    const fallback = detectFallbackTopic(promptText || 'mạch điện');
    return res.json({
      topic: fallback.topic,
      templateId: fallback.templateId,
      variables: Object.keys(fallback.parameters),
      parameters: fallback.parameters,
      summary: `Đã phân tích chủ đề ${fallback.topic}. Mô phỏng tương tác đã sẵn sàng khởi chạy.`,
    });
  } catch (error: any) {
    return sendGeminiErrorResponse(res, error);
  }
});

// -------------------------------------------------------------
// API ROUTE: /api/visualiser/chat
// Điều khiển mô phỏng bằng ngôn ngữ tự nhiên tiếng Việt
// -------------------------------------------------------------
app.post('/api/visualiser/chat', async (req: Request, res: Response) => {
  try {
    const { topic, templateId, parameters, userMessage, chatHistory = [] } = req.body;

    if (!userMessage?.trim()) {
      return res.status(400).json({ error: 'Tin nhắn không được để trống.' });
    }

    const lowerMsg = userMessage.toLowerCase();

    // Fast deterministic handlers for common circuit & physics commands
    if (templateId === 'rlc_ac' && lowerMsg.includes('cộng hưởng')) {
      const L = (parameters?.L_mH ?? 100) * 1e-3;
      const C = (parameters?.C_uF ?? 15) * 1e-6;
      const f0 = Math.min(500, Math.max(20, Math.round(1 / (2 * Math.PI * Math.sqrt(L * C)))));
      return res.json({
        type: 'update',
        changes: { f: f0 },
        message: `Đã đặt tần số f = ${f0} Hz trùng với tần số cộng hưởng f₀ = 1/(2π√LC). Lúc này ZL = ZC, tổng trở đạt cực tiểu Z = R và u(t) cùng pha với i(t) (cosφ = 1).`,
      });
    }

    if (templateId === 'analog_opamp_555' && lowerMsg.includes('xén ngọn')) {
      return res.json({
        type: 'update',
        changes: { circuitMode: 0, Vin: 3.0, R1_k: 10, R2_k: 68, Vcc: 12 },
        message: 'Đã đặt Av = -6.8× và Vin = 3V trên nguồn ±12V. Biên độ lý thuyết |Vout| = 20.4V vượt ngưỡng bão hòa ±10.8V nên ngõ ra bị xén phẳng hai đầu (Clipping)!',
      });
    }

    if (templateId === 'rectifier_diode' && (lowerMsg.includes('tắt tụ') || lowerMsg.includes('c = 0'))) {
      return res.json({
        type: 'update',
        changes: { C_uF: 0 },
        message: 'Đã ngắt tụ lọc nguồn (C = 0 μF). Quan sát trên máy hiện sóng thấy điện áp ngõ ra đập mạch mạnh theo chu kỳ, độ gợn sóng rất lớn.',
      });
    }

    if (lowerMsg.includes('không trọng lực') || (lowerMsg.includes('trọng lực') && (lowerMsg.includes('0') || lowerMsg.includes('không')))) {
      return res.json({
        type: 'update',
        changes: { g: 0.1 },
        message: 'Đã thiết lập gia tốc trọng lực gần bằng 0 (0.1 m/s²). Vật thể sẽ bay thẳng gần như vô tận!',
      });
    }

    const systemPrompt = `Bạn là Trợ lý AI Điều khiển Mô phỏng Điện tử & Vật lý của Stemly.
Bạn có hai nhiệm vụ:
1. Điều khiển mô phỏng ("type": "update"): Nếu người dùng yêu cầu thay đổi cấu hình mạch, điện áp, điện trở, tụ, cuộn cảm, tần số, chế độ... hãy trả về "changes" chỉ chứa các khóa hợp lệ có trong "parameters" hiện tại cùng giá trị số mới, và "message" giải thích ngắn gọn bằng tiếng Việt.
2. Giải đáp lý thuyết & thực hành ("type": "chat"): Giải thích bản chất mạch điện, linh kiện hoặc cách tính toán bằng tiếng Việt.

Chủ đề hiện tại: ${topic || 'Mô phỏng STEM'} (templateId: ${templateId || ''})
Các thông số hiện tại và tên khóa hợp lệ: ${JSON.stringify(parameters || {})}

Trả về JSON thuần túy:
{
  "type": "update" | "chat",
  "changes": { "tên_khóa_hợp_lệ": 100 },
  "message": "Giải thích súc tích bằng tiếng Việt"
}`;

    const contents = [
      ...chatHistory.slice(-4).map((m: any) => ({
        role: m.isUser ? 'user' : 'model',
        parts: [{ text: m.text }],
      })),
      {
        role: 'user',
        parts: [{ text: `${systemPrompt}\n\nNgười dùng yêu cầu: "${userMessage}"` }],
      },
    ];

    const response = await generateWithGemini(
      (model) => ({
        model,
        contents: contents as any,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: getThinkingConfig(model, false),
        },
      }),
      12000
    );

    const text = response?.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    if (parsed) return res.json(parsed);

    return res.json({
      type: 'chat',
      message: text || 'Mô phỏng đã được phân tích.',
    });
  } catch (error: any) {
    return sendGeminiErrorResponse(res, error);
  }
});

// -------------------------------------------------------------
// API ROUTE: /api/notes/generate
// Tạo ghi chú học tập thông minh tiếng Việt
// -------------------------------------------------------------
app.post('/api/notes/generate', async (req: Request, res: Response) => {
  try {
    const { topic = 'Điện học & Mạch điện', parameters = {}, promptText = '', forceRefresh = false } = req.body;
    const cacheKey = `${topic}::${JSON.stringify(parameters)}`;

    if (!forceRefresh && notesCache.has(cacheKey)) {
      return res.json(notesCache.get(cacheKey));
    }

    const systemPrompt = `Bạn là giảng viên chuyên ngành Điện – Điện tử & STEM của Stemly.
Nhiệm vụ: Tạo tài liệu ghi chú học tập CHI TIẾT, CHÍNH XÁC KỸ THUẬT bằng TIẾNG VIỆT cho chủ đề: "${topic}".
Nếu là chủ đề mạch điện / linh kiện, hãy đưa thêm lưu ý thực tế (chọn dãy E12, giới hạn công suất 0.25W, cực tính linh kiện hoặc hiện tượng bão hòa/cộng hưởng).
Cấu trúc JSON yêu cầu:
{
  "topic": "${topic}",
  "explanation": "Định nghĩa trực quan 3-4 câu kèm bản chất vật lý/điện tử.",
  "variable_breakdown": { "Ký hiệu": "Tên đại lượng (Đơn vị) — Ý nghĩa" },
  "formulas": ["Công thức 1", "Công thức 2"],
  "example": "Ví dụ giải chi tiết từng bước bằng số liệu thực tế sát với thông số ${JSON.stringify(parameters)}...",
  "mistakes": ["Sai lầm thực hành hoặc bẫy thi cử 1", "Sai lầm 2"],
  "practice_questions": ["Câu hỏi tự luyện 1", "Câu hỏi 2"],
  "summary": ["Ý cốt lõi 1", "Ý 2"],
  "resources": ["Tài liệu / Datasheet tham khảo 1", "Tài liệu 2"]
}`;

    const response = await generateWithGemini(
      (model) => ({
        model,
        contents: `${systemPrompt}\n\nThông số đang chạy: ${JSON.stringify(parameters)}\nBối cảnh: ${promptText}`,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: getThinkingConfig(model, true),
        },
      }),
      22000
    );

    const text = response?.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    if (parsed && parsed.explanation) {
      if (notesCache.size > 50) notesCache.clear();
      notesCache.set(cacheKey, parsed);
      return res.json(parsed);
    }

    return res.status(502).json({
      error: 'Phản hồi ghi chú từ AI chưa đúng định dạng mong muốn. Vui lòng thử lại.',
      code: 'INVALID_AI_RESPONSE',
    });
  } catch (error: any) {
    return sendGeminiErrorResponse(res, error);
  }
});

// -------------------------------------------------------------
// API ROUTE: /api/quiz/generate
// Tạo bài trắc nghiệm thông minh & bắt lỗi mạch tiếng Việt
// -------------------------------------------------------------
app.post('/api/quiz/generate', async (req: Request, res: Response) => {
  try {
    const { topic = 'Điện học & Mạch điện', count = 5, forceRefresh = false } = req.body;
    const cacheKey = `${topic}::${count}`;

    if (!forceRefresh && quizCache.has(cacheKey)) {
      return res.json(quizCache.get(cacheKey));
    }

    const systemPrompt = `Bạn là giảng viên thiết kế đề kiểm tra Kỹ thuật Điện - Điện tử & STEM của Stemly.
Nhiệm vụ: Tạo ${count} câu hỏi trắc nghiệm bằng TIẾNG VIỆT cho chủ đề "${topic}".
Nếu là chủ đề mạch điện / linh kiện điện tử, hãy lồng ghép ít nhất 1-2 câu hỏi tình huống thực tế (như chẩn đoán lỗi mạch qua số đo VOM, chọn công suất/trị số điện trở chuẩn, hoặc nhận biết hiện tượng xén ngọn/cộng hưởng).
Định dạng JSON:
{
  "topic": "${topic}",
  "questions": [
    {
      "question": "Câu hỏi?",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "explanation": "Giải thích chi tiết bằng tiếng Việt",
      "takeaway": "Quy tắc cốt lõi"
    }
  ]
}`;

    const response = await generateWithGemini(
      (model) => ({
        model,
        contents: systemPrompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: getThinkingConfig(model, true),
        },
      }),
      22000
    );

    const text = response?.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    if (parsed && parsed.questions && parsed.questions.length > 0) {
      if (quizCache.size > 50) quizCache.clear();
      quizCache.set(cacheKey, parsed);
      return res.json(parsed);
    }

    return res.status(502).json({
      error: 'Phản hồi câu hỏi trắc nghiệm từ AI chưa đúng định dạng. Vui lòng thử lại.',
      code: 'INVALID_AI_RESPONSE',
    });
  } catch (error: any) {
    return sendGeminiErrorResponse(res, error);
  }
});

// -------------------------------------------------------------
// API ROUTE: /api/tutor/chat
// Gia sư AI Kỹ thuật Điện - Điện tử & STEM theo ngữ cảnh thực tế
// -------------------------------------------------------------
app.post('/api/tutor/chat', async (req: Request, res: Response) => {
  try {
    const { messages = [], topic = 'Mạch điện', parameters = {}, simulationStats = {} } = req.body;

    if (!messages.length) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung câu hỏi.' });
    }

    const systemInstruction = `Bạn là Gia sư AI Kỹ thuật Điện – Điện tử & STEM của Stemly.
Ngữ cảnh mô phỏng hiện tại người học đang mở:
- Chủ đề: ${topic}
- Thông số điều chỉnh: ${JSON.stringify(parameters)}
- Kết quả đo thực tế trên mạch: ${JSON.stringify(simulationStats)}

Yêu cầu trả lời bằng TIẾNG VIỆT rõ ràng, súc tích, có cấu trúc:
1. Giải thích bản chất & tính toán dựa trực tiếp trên thông số hiện tại của người học (nếu liên quan).
2. Tư vấn thực tế ngoài phòng Lab (nếu là mạch điện/điện tử): kiểm tra ngưỡng quá tải 0.25W, xén ngọn ±Vcc, cực tính Diode/tụ hóa, và gợi ý trị số dãy chuẩn E12 (10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82).
3. Nếu người học yêu cầu "bắt bệnh mạch hỏng", hãy đưa ra 1 tình huống lỗi cụ thể kèm số đo VOM giả định tại các điểm để họ suy luận.
4. Kết thúc bằng 1 câu hỏi gợi mở ngắn.`;

    const contents = messages.slice(-6).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await generateWithGemini(
      (model) => ({
        model,
        contents,
        config: {
          systemInstruction,
          thinkingConfig: getThinkingConfig(model, true),
        },
      }),
      22000
    );

    if (response?.text) {
      return res.json({
        role: 'assistant',
        content: response.text,
      });
    }

    return res.status(502).json({
      error: 'Gia sư AI chưa trả về nội dung. Vui lòng thử lại.',
      code: 'INVALID_AI_RESPONSE',
    });
  } catch (error: any) {
    return sendGeminiErrorResponse(res, error);
  }
});

// -------------------------------------------------------------
// API ROUTE: /api/circuit/analyze
// AI Kiểm tra cấu hình mạch điện, phát hiện đoản mạch & gợi ý sửa chữa
// -------------------------------------------------------------
app.post('/api/circuit/analyze', async (req: Request, res: Response) => {
  try {
    const { components = [], wires = [], flags = {}, activePreset = '' } = req.body;

    if (!Array.isArray(components) || components.length === 0) {
      return res.status(400).json({
        error: 'Bảng mạch đang trống. Hãy thêm linh kiện hoặc chọn mạch từ Thư viện mẫu trước khi kiểm tra.',
      });
    }

    const systemPrompt = `Bạn là Kỹ sư Thiết kế & Chẩn đoán Mạch Điện tử của Stemly.
Nhiệm vụ: Phân tích cấu hình mạch điện (netlist, thông số linh kiện và số đo mô phỏng MNA theo thời gian thực) do người dùng cung cấp bằng TIẾNG VIỆT.

Hãy kiểm tra toàn diện 4 nhóm vấn đề:
1. Đoản mạch / Quá dòng / Quá nhiệt: nguồn DC/AC nối thẳng không qua tải, dòng nguồn quá lớn, điện trở tỏa nhiệt > 0.25W (250mW) hoặc > 1W, LED vượt quá 25–30 mA.
2. Lỗi kết nối & Topology: thiếu điểm tham chiếu GND, dây/chân linh kiện bị hở không tạo mạch kín, công tắc đang mở ngắt dòng, hoặc cực tính linh kiện bị đảo; với mạch số/vi điều khiển kiểm tra chân VCC (+5V), GND, chân kéo lên INT1 (P3.3), chân Enable G1 của 74LS138, chân COM của LED 7 đoạn và ngõ ra CLK.
3. Giá trị linh kiện chưa hợp lý: điện trở hạn dòng quá nhỏ hoặc quá lớn, tụ/cuộn cảm làm tần số cắt chưa tối ưu, khuếch đại Op-Amp bị xén ngọn (bão hòa ±Vrail), Zener chưa đạt ngưỡng ổn áp.
4. Linh kiện đang có cờ trạng thái hỏng (burned/open/short/leaky/reversed nếu có trong dữ liệu).

Quy tắc đánh giá:
- "overallStatus":
  - "critical": Có đoản mạch, linh kiện hỏng/đứt/ngược cực, quá tải nghiêm trọng có thể cháy linh kiện, hoặc mạch không thể hoạt động (thiếu nối đất/hở mạch chính).
  - "warning": Mạch chạy được nhưng có thông số chưa tối ưu (LED hơi quá dòng, công suất R > 250mW, bão hòa/xén ngọn Op-Amp, thiếu tụ lọc, v.v.).
  - "ok": Cấu hình mạch an toàn, hợp lý và hoạt động đúng nguyên lý.
- Đưa ra lời khuyên sửa chữa CỤ THỂ, có số liệu tính toán thực tế (ví dụ: gợi ý đổi điện trở theo chuẩn E12 như 220Ω, 330Ω, 470Ω, 1kΩ, 2.2kΩ...).

Trả về JSON thuần túy đúng cấu trúc sau:
{
  "overallStatus": "ok" | "warning" | "critical",
  "summary": "Nhận xét tổng quan 1-3 câu về trạng thái và nguyên lý mạch hiện tại.",
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "componentLabel": "Nhãn linh kiện liên quan (ví dụ R1, LED1, U1) hoặc chuỗi rỗng",
      "title": "Tên ngắn gọn của lỗi hoặc vấn đề tiềm ẩn",
      "detail": "Giải thích nguyên nhân dựa trên số đo áp/dòng/công suất thực tế",
      "recommendation": "Hướng dẫn sửa chữa hoặc giá trị linh kiện đề xuất cụ thể"
    }
  ],
  "recommendations": ["Lời khuyên cải thiện hoặc thực hành thêm 1", "Lời khuyên 2"]
}`;

    const promptBody = `Mẫu mạch đang tham chiếu: ${activePreset || 'Mạch tự lắp'}
Cờ cảnh báo từ bộ giải mạch: ${JSON.stringify(flags)}
Danh sách linh kiện & số đo tức thời:
${JSON.stringify(components, null, 2)}

Kết nối dây (Netlist):
${JSON.stringify(wires, null, 2)}`;

    const response = await generateWithGemini(
      (model) => ({
        model,
        contents: `${systemPrompt}\n\n${promptBody}`,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: getThinkingConfig(model, false),
        },
      }),
      25000
    );

    const text = response?.text || '';
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }

    if (parsed && parsed.summary && Array.isArray(parsed.issues)) {
      return res.json(parsed);
    }

    return res.status(502).json({
      error: 'Phản hồi phân tích mạch từ AI chưa đúng định dạng. Vui lòng thử lại.',
      code: 'INVALID_AI_RESPONSE',
    });
  } catch (error: any) {
    return sendGeminiErrorResponse(res, error);
  }
});

// -------------------------------------------------------------
// Vite middleware cho Môi trường Phát triển và Tĩnh cho Sản xuất
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Stemly server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

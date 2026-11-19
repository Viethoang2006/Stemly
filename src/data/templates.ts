import { VisualTemplate, TemplateId, TemplateCategory } from '../types/stemly';

export const DEFAULT_TEMPLATES: Record<TemplateId, VisualTemplate> = {
  circuits: {
    templateId: 'circuits',
    topic: 'Điện học & Mạch điện',
    category: 'electronics',
    title: 'Mạch DC, Công tắc K, Biến trở & Que đo VOM ảo',
    description: 'Mô phỏng mạch đơn, phân áp nối tiếp, song song (KCL) và chiết áp biến trở kèm công tắc đóng ngắt K, que đo VOM ảo và cảnh báo quá công suất.',
    parameters: {
      topology: { name: 'topology', label: 'Kiểu mạch (0:Đơn, 1:Phân áp, 2:Song song, 3:Biến trở)', value: 1, min: 0, max: 3, step: 1, unit: '', description: '0: Ohm | 1: Nối tiếp | 2: Song song | 3: Biến trở RV' },
      V: { name: 'V', label: 'Điện áp nguồn (V)', value: 12, min: 1, max: 36, step: 0.5, unit: 'V', description: 'Nguồn điện một chiều DC' },
      R: { name: 'R', label: 'Điện trở R1 / RV', value: 100, min: 5, max: 1000, step: 5, unit: 'Ω', description: 'Điện trở nhánh chính / phần trên' },
      R2: { name: 'R2', label: 'Điện trở R2', value: 220, min: 5, max: 1000, step: 5, unit: 'Ω', description: 'Điện trở tải / nhánh dưới' },
    },
  },
  rlc_ac: {
    templateId: 'rlc_ac',
    topic: 'Mạch RLC xoay chiều & Máy hiện sóng',
    category: 'electronics',
    title: 'Mạch RLC nối tiếp, Giản đồ Phasor & Máy hiện sóng 2 kênh',
    description: 'Quan sát lệch pha giữa điện áp u(t) và dòng điện i(t), giản đồ vector quay và tìm tần số cộng hưởng f₀ khi ZL = ZC.',
    parameters: {
      U0: { name: 'U0', label: 'Biên độ nguồn AC (U₀)', value: 12, min: 5, max: 30, step: 1, unit: 'V', description: 'Điện áp cực đại xoay chiều' },
      f: { name: 'f', label: 'Tần số nguồn (f)', value: 120, min: 20, max: 500, step: 5, unit: 'Hz', description: 'Tần số dòng xoay chiều' },
      R: { name: 'R', label: 'Điện trở (R)', value: 40, min: 5, max: 200, step: 5, unit: 'Ω', description: 'Thành phần thuần trở' },
      L_mH: { name: 'L_mH', label: 'Cuộn cảm (L)', value: 100, min: 10, max: 300, step: 5, unit: 'mH', description: 'Độ tự cảm (milihenry)' },
      C_uF: { name: 'C_uF', label: 'Tụ điện (C)', value: 15, min: 1, max: 100, step: 1, unit: 'μF', description: 'Điện dung tụ (microfarad)' },
    },
  },
  components_lab: {
    templateId: 'components_lab',
    topic: 'Linh kiện điện tử & Đặc tuyến I-V',
    category: 'electronics',
    title: 'Phòng Lab Linh kiện: I-V, Vạch màu, Pinout & Trở chuẩn E12',
    description: 'Khảo sát đặc tuyến Vôn-Ampe cùng điểm làm việc Q, giải mã vạch màu/pinout, tính điện trở chuẩn E12 (ghép nối tiếp/song song) và chọn công suất chịu tải an toàn.',
    parameters: {
      device: { name: 'device', label: 'Linh kiện (0:Diode, 1:Zener, 2:LED, 3:BJT)', value: 0, min: 0, max: 3, step: 1, unit: '', description: 'Chọn linh kiện khảo sát I-V' },
      Vcc: { name: 'Vcc', label: 'Điện áp nguồn thử (Vcc)', value: 9, min: 0, max: 15, step: 0.2, unit: 'V', description: 'Nguồn phân cực thử nghiệm' },
      Rl: { name: 'Rl', label: 'Điện trở tải / hạn dòng (RL)', value: 330, min: 50, max: 2000, step: 10, unit: 'Ω', description: 'Xác định độ dốc đường tải DC' },
      Ib_uA: { name: 'Ib_uA', label: 'Dòng cực gốc BJT (IB)', value: 30, min: 0, max: 80, step: 5, unit: 'μA', description: 'Dòng điều khiển cho BJT (device=3)' },
    },
  },
  rectifier_diode: {
    templateId: 'rectifier_diode',
    topic: 'Mạch chỉnh lưu Diode & Lọc nguồn',
    category: 'electronics',
    title: 'Mạch Chỉnh lưu Diode & Tụ lọc nguồn phẳng DC',
    description: 'Mô phỏng biến đổi AC sang DC qua mạch nửa chu kỳ, toàn kỳ và cầu 4 Diode; quan sát tác dụng san phẳng gợn sóng của tụ lọc C.',
    parameters: {
      mode: { name: 'mode', label: 'Kiểu chỉnh lưu (0:Nửa kỳ, 1:Toàn kỳ, 2:Cầu)', value: 2, min: 0, max: 2, step: 1, unit: '', description: '0: 1 Diode | 1: 2 Diode | 2: Cầu 4 Diode' },
      Vrms: { name: 'Vrms', label: 'Điện áp thứ cấp AC (Vrms)', value: 12, min: 5, max: 24, step: 1, unit: 'V', description: 'Điện áp hiệu dụng biến áp' },
      C_uF: { name: 'C_uF', label: 'Tụ lọc nguồn (C)', value: 220, min: 0, max: 1000, step: 20, unit: 'μF', description: 'Đặt 0 μF để tắt tụ lọc' },
      Rl: { name: 'Rl', label: 'Điện trở tải (RL)', value: 220, min: 50, max: 1000, step: 10, unit: 'Ω', description: 'Tải tiêu thụ ngõ ra DC' },
    },
  },
  analog_opamp_555: {
    templateId: 'analog_opamp_555',
    topic: 'Khuếch đại Op-Amp & Xung NE555',
    category: 'electronics',
    title: 'Mạch Khuếch đại Op-Amp (Xén ngọn) & Tạo xung NE555',
    description: 'Khảo sát hệ số khuếch đại và hiện tượng méo xén ngọn (Clipping) trên Op-Amp, hoặc mạch dao động xung vuông NE555 Astable.',
    parameters: {
      circuitMode: { name: 'circuitMode', label: 'Chế độ (0:Đảo, 1:Không đảo, 2:NE555)', value: 0, min: 0, max: 2, step: 1, unit: '', description: '0: Op-Amp Đảo | 1: Không đảo | 2: 555' },
      Vin: { name: 'Vin', label: 'Biên độ vào Vin (Op-Amp)', value: 2.0, min: 0.5, max: 6.0, step: 0.2, unit: 'V', description: 'Biên độ sóng sin đầu vào' },
      R1_k: { name: 'R1_k', label: 'Điện trở Rin / R1 (kΩ)', value: 10, min: 1, max: 100, step: 1, unit: 'kΩ', description: 'Rin (Op-Amp) hoặc R1 (NE555)' },
      R2_k: { name: 'R2_k', label: 'Điện trở Rf / R2 (kΩ)', value: 47, min: 1, max: 200, step: 1, unit: 'kΩ', description: 'Rf hồi tiếp (Op-Amp) hoặc R2 (555)' },
      Vcc: { name: 'Vcc', label: 'Nguồn nuôi ±Vcc / Vcc', value: 12, min: 5, max: 15, step: 1, unit: 'V', description: 'Điện áp giới hạn bão hòa đầu ra' },
      C_uF: { name: 'C_uF', label: 'Tụ định thời C (NE555)', value: 10, min: 1, max: 100, step: 1, unit: 'μF', description: 'Tụ nạp xả cho mạch NE555' },
    },
  },
  circuit_sandbox: {
    templateId: 'circuit_sandbox',
    topic: 'Thiết kế & Mô phỏng Mạch kéo thả',
    category: 'electronics',
    title: 'Phòng Lab Mạch điện 3D Tương tác (Tinkercad Studio)',
    description: 'Thiết kế & mô phỏng mạch điện 3D trực quan bằng Three.js (Pin DC, Điện trở 4 vòng màu, Đèn LED phát sáng, Công tắc gạt 3D, Dây nối cong 3D, Cảnh báo ngắn mạch/quá dòng) kèm bảng mạch Breadboard 2D & Oscilloscope.',
    parameters: {
      V_src: { name: 'V_src', label: 'Điện áp nguồn chọn (V)', value: 12, min: 1, max: 36, step: 0.5, unit: 'V', description: 'Áp dụng cho nguồn đang chọn / mới' },
      R_val: { name: 'R_val', label: 'Giá trị điện trở chọn (Ω)', value: 220, min: 10, max: 5000, step: 10, unit: 'Ω', description: 'Áp dụng cho điện trở đang chọn' },
      C_val: { name: 'C_val', label: 'Điện dung tụ chọn (μF)', value: 470, min: 10, max: 2200, step: 10, unit: 'μF', description: 'Áp dụng cho tụ điện đang chọn' },
      L_val: { name: 'L_val', label: 'Độ tự cảm cuộn cảm (mH)', value: 150, min: 10, max: 1000, step: 10, unit: 'mH', description: 'Áp dụng cho cuộn cảm đang chọn' },
      simSpeed: { name: 'simSpeed', label: 'Tốc độ mô phỏng (×)', value: 1, min: 0.2, max: 2.5, step: 0.2, unit: '×', description: 'Tốc độ nạp/xả tụ thời gian thực' },
    },
    presets: [
      {
        id: 'sandbox-lowpass-rc',
        presetKey: 'lowpass',
        title: 'Mạch lọc thông thấp RC (Low-Pass Filter)',
        formula: 'f_c = 1 / (2π·R·C) ≈ 1.59 Hz',
        description: 'Nguyên lý: Dung kháng tụ điện Z_C = 1/(2πfC) giảm theo tần số, nên tín hiệu tần số thấp đi qua ngõ ra trên tụ còn tần số cao (f > f_c) bị thoát xuống mass.',
        parameters: { V_src: 10, R_val: 1000, C_val: 100, L_val: 150, simSpeed: 1 },
      },
      {
        id: 'sandbox-lc-oscillator',
        presetKey: 'lc_oscillator',
        title: 'Mạch dao động LC (Cộng hưởng điện từ)',
        formula: 'f₀ = 1 / (2π·√(L·C)) ≈ 19 Hz',
        description: 'Nguyên lý: Năng lượng trao đổi tuần hoàn giữa điện trường trong tụ điện (½CU²) và từ trường trong cuộn cảm (½LI²), tạo dao động điện từ riêng tại tần số f₀.',
        parameters: { V_src: 12, R_val: 10, C_val: 470, L_val: 150, simSpeed: 0.6 },
      },
      {
        id: 'sandbox-wheatstone-bridge',
        presetKey: 'wheatstone',
        title: 'Mạch cầu Wheatstone (Cầu đo cân bằng)',
        formula: 'ΔV_AB = 0 V khi R₁/R₂ = R₃/Rₓ',
        description: 'Nguyên lý: So sánh điện thế giữa hai nhánh phân áp song song; khi tỉ số điện trở hai nhánh bằng nhau thì cầu cân bằng (ΔV_AB = 0V), giúp đo chính xác điện trở ẩn hoặc cảm biến.',
        parameters: { V_src: 9, R_val: 220, C_val: 470, L_val: 150, simSpeed: 1 },
      },
      {
        id: 'sandbox-rlc-series',
        presetKey: 'rlc',
        title: 'Mạch cộng hưởng RLC nối tiếp',
        formula: 'f₀ = 1 / (2π·√(L·C)) · ζ = (R/2)√(C/L)',
        description: 'Nguyên lý: Tụ điện C và cuộn cảm L trao đổi năng lượng qua điện trở tiêu tán R, tạo dao động quá độ tắt dần hoặc cộng hưởng cực đại khi Z_L = Z_C.',
        parameters: { V_src: 12, R_val: 47, C_val: 100, L_val: 150, simSpeed: 0.8 },
      },
    ],
  },
  projectile_motion: {
    templateId: 'projectile_motion',
    topic: 'Chuyển động ném xiên',
    category: 'physics',
    title: 'Mô phỏng Quỹ đạo Chuyển động ném xiên 2D',
    description: 'Chuyển động ném xiên thời gian thực với vẽ đường cong parabol, vector vận tốc tức thời, độ cao cực đại và tầm xa.',
    parameters: {
      U: { name: 'U', label: 'Vận tốc ban đầu (U)', value: 25, min: 5, max: 60, step: 1, unit: 'm/s', description: 'Độ lớn vận tốc tại thời điểm phóng' },
      theta: { name: 'theta', label: 'Góc phóng (θ)', value: 45, min: 5, max: 85, step: 1, unit: '°', description: 'Góc nghiêng so với mặt phẳng ngang' },
      g: { name: 'g', label: 'Gia tốc trọng trường (g)', value: 9.8, min: 1.6, max: 25, step: 0.1, unit: 'm/s²', description: 'Gia tốc trọng trường hướng xuống' },
    },
  },
  free_fall: {
    templateId: 'free_fall',
    topic: 'Sự rơi tự do',
    category: 'physics',
    title: 'Mô phỏng Rơi tự do & Gia tốc Trọng trường',
    description: 'Chuyển động thẳng biến đổi đều 1D thẳng đứng dưới tác dụng của trọng lực với thước đo mét và đồng hồ đo vận tốc chạm đất.',
    parameters: {
      h: { name: 'h', label: 'Độ cao thả rơi (h)', value: 45, min: 5, max: 100, step: 1, unit: 'm', description: 'Độ cao ban đầu so với mặt đất' },
      g: { name: 'g', label: 'Gia tốc trọng trường (g)', value: 9.8, min: 1.6, max: 25, step: 0.1, unit: 'm/s²', description: 'Gia tốc trọng trường' },
    },
  },
  shm: {
    templateId: 'shm',
    topic: 'Dao động điều hòa',
    category: 'physics',
    title: 'Con lắc lò xo dao động điều hòa (SHM)',
    description: 'Dao động tuần hoàn hình sin của vật nặng gắn vào lò xo lý tưởng theo định luật Hooke và sự chuyển hóa qua lại giữa động năng và thế năng.',
    parameters: {
      A: { name: 'A', label: 'Biên độ dao động (A)', value: 4, min: 1, max: 8, step: 0.5, unit: 'm', description: 'Độ lệch cực đại khỏi vị trí cân bằng' },
      m: { name: 'm', label: 'Khối lượng vật (m)', value: 2, min: 0.5, max: 10, step: 0.5, unit: 'kg', description: 'Khối lượng của vật dao động' },
      k: { name: 'k', label: 'Độ cứng lò xo (k)', value: 50, min: 10, max: 150, step: 5, unit: 'N/m', description: 'Hệ số đàn hồi của lò xo' },
    },
  },
  optics: {
    templateId: 'optics',
    topic: 'Quang hình học',
    category: 'physics',
    title: 'Khúc xạ qua Thấu kính mỏng & Tạo ảnh',
    description: 'Vẽ đường truyền tia sáng hình học qua thấu kính mỏng theo công thức thấu kính Gauss 1/f = 1/v - 1/u.',
    parameters: {
      f: { name: 'f', label: 'Tiêu cự thấu kính (f)', value: 15, min: 5, max: 35, step: 1, unit: 'cm', description: 'Tiêu cự của thấu kính hội tụ' },
      u: { name: 'u', label: 'Khoảng cách vật (u)', value: 30, min: 5, max: 60, step: 1, unit: 'cm', description: 'Khoảng cách từ vật đến quang tâm O' },
      h_o: { name: 'h_o', label: 'Chiều cao vật (h_o)', value: 6, min: 1, max: 15, step: 0.5, unit: 'cm', description: 'Chiều cao thực tế của vật sáng' },
    },
  },
  kinematics: {
    templateId: 'kinematics',
    topic: 'Động học chất điểm',
    category: 'physics',
    title: 'Chuyển động thẳng biến đổi đều 1D',
    description: 'Mô phỏng chuyển động của xe với vận tốc tức thời v = u + at, quãng đường s = ut + 0.5at² và đồ thị vận tốc - thời gian (v-t).',
    parameters: {
      u: { name: 'u', label: 'Vận tốc ban đầu (u)', value: 10, min: 0, max: 40, step: 1, unit: 'm/s', description: 'Vận tốc tại thời điểm t = 0' },
      a: { name: 'a', label: 'Gia tốc (a)', value: 3, min: -8, max: 10, step: 0.5, unit: 'm/s²', description: 'Gia tốc của chuyển động' },
      t_max: { name: 't_max', label: 'Thời gian quan sát', value: 10, min: 3, max: 20, step: 1, unit: 's', description: 'Tổng thời gian theo dõi' },
    },
  },
  atom: {
    templateId: 'atom',
    topic: 'Cấu trúc nguyên tử',
    category: 'physics',
    title: 'Mô hình nguyên tử Bohr & Các lớp electron',
    description: 'Mô phỏng các lớp vỏ electron (K, L, M) quay xung quanh hạt nhân gồm các hạt proton và neutron dao động.',
    parameters: {
      protons: { name: 'protons', label: 'Số hạt Proton (Z)', value: 6, min: 1, max: 18, step: 1, unit: '', description: 'Số hiệu nguyên tử xác định nguyên tố hóa học' },
      neutrons: { name: 'neutrons', label: 'Số hạt Neutron (N)', value: 6, min: 0, max: 22, step: 1, unit: '', description: 'Hạt neutron trong nhân duy trì độ bền' },
    },
  },
  equation_plotter: {
    templateId: 'equation_plotter',
    topic: 'Khảo sát đồ thị hàm số',
    category: 'physics',
    title: 'Vẽ đồ thị Parabol bậc hai y = ax² + bx + c',
    description: 'Hệ trục tọa độ Descartes vẽ đường cong bậc hai parabol, tự động xác định tọa độ đỉnh và nghiệm cắt trục hoành.',
    parameters: {
      a: { name: 'a', label: 'Hệ số bậc hai (a)', value: 1, min: -5, max: 5, step: 0.2, unit: '', description: 'Độ cong và hướng bề lõm parabol' },
      b: { name: 'b', label: 'Hệ số bậc một (b)', value: 0, min: -10, max: 10, step: 0.5, unit: '', description: 'Hệ số tuyến tính dịch chuyển trục' },
      c: { name: 'c', label: 'Hằng số tự do (c)', value: -4, min: -15, max: 15, step: 1, unit: '', description: 'Giao điểm với trục tung y' },
    },
  },
};

export interface SampleProblem {
  id: string;
  title: string;
  topic: string;
  category: TemplateCategory;
  templateId: TemplateId;
  sandboxPresetKey?: string;
  previewDescription: string;
  parameters: Record<string, number>;
  problemText: string;
  diagramSvg: string;
}

export const SAMPLE_PROBLEMS: SampleProblem[] = [
  {
    id: 'sample-rc-sandbox',
    title: 'Thiết kế mạch kéo thả: Nạp & Xả tụ RC',
    topic: 'Thiết kế & Mô phỏng Mạch kéo thả',
    category: 'electronics',
    templateId: 'circuit_sandbox',
    sandboxPresetKey: 'rc',
    previewDescription: 'Kéo thả Nguồn DC 12V, Điện trở 220Ω và Tụ 470μF lên canvas để đo dòng nạp và điện áp tụ theo thời gian thực.',
    problemText: 'Thiết kế mạch kéo thả gồm Nguồn 12V nối với Điện trở 220Ω và Tụ điện 470μF. Quan sát đồ thị điện áp tụ Vc(t) và dòng điện nạp Ic(t) biến thiên theo thời gian thực.',
    parameters: { V_src: 12, R_val: 220, C_val: 470, simSpeed: 1 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-cyan-400 fill-none stroke-current" stroke-width="1.8">
      <rect x="20" y="20" width="160" height="80" rx="6" stroke="#334155" stroke-dasharray="3,2" fill="#070b14" />
      <circle cx="48" cy="60" r="14" stroke="#ef4444" fill="#0f172a" />
      <text x="41" y="63" font-size="9" fill="#fca5a5" stroke="none">12V</text>
      <line x1="48" y1="32" x2="48" y2="46" stroke="#94a3b8" />
      <line x1="48" y1="32" x2="84" y2="32" stroke="#94a3b8" />
      <rect x="84" y="24" width="36" height="16" rx="2" stroke="#818cf8" fill="#0f172a" />
      <text x="89" y="35" font-size="7.5" fill="#c7d2fe" stroke="none">220Ω</text>
      <line x1="120" y1="32" x2="152" y2="32" stroke="#94a3b8" />
      <line x1="152" y1="32" x2="152" y2="54" stroke="#94a3b8" />
      <line x1="140" y1="54" x2="164" y2="54" stroke="#38bdf8" stroke-width="2.5" />
      <line x1="140" y1="64" x2="164" y2="64" stroke="#38bdf8" stroke-width="2.5" />
      <line x1="152" y1="64" x2="152" y2="86" stroke="#94a3b8" />
      <line x1="48" y1="74" x2="48" y2="86" stroke="#94a3b8" />
      <line x1="48" y1="86" x2="152" y2="86" stroke="#94a3b8" />
      <text x="122" y="75" font-size="7.5" fill="#38bdf8" stroke="none">470μF</text>
    </svg>`,
  },
  {
    id: 'sample-rc-lowpass-sandbox',
    title: 'Mạch lọc thông thấp RC (Low-Pass Filter)',
    topic: 'Thiết kế & Mô phỏng Mạch kéo thả',
    category: 'electronics',
    templateId: 'circuit_sandbox',
    sandboxPresetKey: 'lowpass',
    previewDescription: 'Tụ điện có dung kháng giảm khi tần số tăng, cho tín hiệu tần số thấp truyền qua và suy giảm nhiễu cao tần trên ngõ ra.',
    problemText: 'Thiết kế mạch lọc thông thấp RC gồm nguồn xoay chiều AC 10Vp nối tiếp điện trở R1 = 1kΩ và tụ C1 = 100μF (tần số cắt fc ≈ 1.59 Hz). Quan sát biên độ sóng ngõ ra trên tụ C1 qua máy hiện sóng.',
    parameters: { V_src: 10, R_val: 1000, C_val: 100, simSpeed: 1 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-sky-400 fill-none stroke-current" stroke-width="1.8">
      <rect x="18" y="18" width="164" height="84" rx="6" stroke="#334155" stroke-dasharray="3,2" fill="#070b14" />
      <circle cx="46" cy="60" r="13" stroke="#f59e0b" fill="#0f172a" />
      <path d="M 39 60 Q 42.5 53, 46 60 T 53 60" stroke="#fbbf24" stroke-width="1.6" />
      <line x1="46" y1="34" x2="46" y2="47" stroke="#94a3b8" />
      <line x1="46" y1="34" x2="78" y2="34" stroke="#94a3b8" />
      <rect x="78" y="27" width="36" height="14" rx="2" stroke="#818cf8" fill="#0f172a" />
      <text x="85" y="37" font-size="7.5" fill="#c7d2fe" stroke="none">1kΩ</text>
      <line x1="114" y1="34" x2="146" y2="34" stroke="#94a3b8" />
      <line x1="146" y1="34" x2="146" y2="54" stroke="#94a3b8" />
      <line x1="134" y1="54" x2="158" y2="54" stroke="#38bdf8" stroke-width="2.5" />
      <line x1="134" y1="64" x2="158" y2="64" stroke="#38bdf8" stroke-width="2.5" />
      <line x1="146" y1="64" x2="146" y2="86" stroke="#94a3b8" />
      <line x1="46" y1="73" x2="46" y2="86" stroke="#94a3b8" />
      <line x1="46" y1="86" x2="146" y2="86" stroke="#94a3b8" />
      <circle cx="146" cy="34" r="3" fill="#22c55e" stroke="none" />
      <text x="152" y="38" font-size="7.5" fill="#4ade80" stroke="none">Vout</text>
      <text x="112" y="77" font-size="7.5" fill="#38bdf8" stroke="none">100μF</text>
    </svg>`,
  },
  {
    id: 'sample-lc-oscillator-sandbox',
    title: 'Mạch dao động LC (Cộng hưởng điện từ)',
    topic: 'Thiết kế & Mô phỏng Mạch kéo thả',
    category: 'electronics',
    templateId: 'circuit_sandbox',
    sandboxPresetKey: 'lc_oscillator',
    previewDescription: 'Năng lượng luân chuyển qua lại giữa điện trường trong tụ C1 và từ trường trong cuộn cảm L1 tạo dao động điện từ ở tần số f₀ = 1/(2π√LC).',
    problemText: 'Xây dựng mạch dao động LC gồm nguồn 12V, cuộn cảm L1 = 150mH, tụ điện C1 = 470μF và điện trở tổn hao nhỏ 10Ω. Quan sát dao động cộng hưởng điện áp trên tụ C1 bằng Máy hiện sóng 3D.',
    parameters: { V_src: 12, R_val: 10, C_val: 470, L_val: 150, simSpeed: 0.6 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-emerald-400 fill-none stroke-current" stroke-width="1.8">
      <rect x="18" y="18" width="164" height="84" rx="6" stroke="#334155" stroke-dasharray="3,2" fill="#070b14" />
      <circle cx="44" cy="60" r="12" stroke="#ef4444" fill="#0f172a" />
      <text x="37" y="63" font-size="8" fill="#fca5a5" stroke="none">12V</text>
      <line x1="44" y1="34" x2="44" y2="48" stroke="#94a3b8" />
      <line x1="44" y1="34" x2="72" y2="34" stroke="#94a3b8" />
      <path d="M 72 34 C 76 22, 82 22, 86 34 C 90 22, 96 22, 100 34 C 104 22, 110 22, 114 34" stroke="#eab308" stroke-width="2" />
      <text x="80" y="25" font-size="7.5" fill="#fde047" stroke="none">150mH</text>
      <line x1="114" y1="34" x2="148" y2="34" stroke="#94a3b8" />
      <line x1="148" y1="34" x2="148" y2="54" stroke="#94a3b8" />
      <line x1="136" y1="54" x2="160" y2="54" stroke="#38bdf8" stroke-width="2.5" />
      <line x1="136" y1="64" x2="160" y2="64" stroke="#38bdf8" stroke-width="2.5" />
      <line x1="148" y1="64" x2="148" y2="86" stroke="#94a3b8" />
      <line x1="44" y1="72" x2="44" y2="86" stroke="#94a3b8" />
      <line x1="44" y1="86" x2="148" y2="86" stroke="#94a3b8" />
      <text x="115" y="76" font-size="7.5" fill="#38bdf8" stroke="none">470μF</text>
    </svg>`,
  },
  {
    id: 'sample-wheatstone-sandbox',
    title: 'Mạch cầu Wheatstone (Cầu đo điện trở cân bằng)',
    topic: 'Thiết kế & Mô phỏng Mạch kéo thả',
    category: 'electronics',
    templateId: 'circuit_sandbox',
    sandboxPresetKey: 'wheatstone',
    previewDescription: 'Hai nhánh cầu phân áp song song cân bằng khi R1/R2 = R3/Rx, làm hiệu điện thế giữa hai đỉnh cầu ΔV_AB triệt tiêu về 0V.',
    problemText: 'Thiết kế mạch cầu Wheatstone nguồn 9V với R1 = R2 = R3 = 220Ω và biến trở đo Rx điều chỉnh quanh 220Ω. Dùng VOM 3D đo chênh áp ΔV_AB giữa hai nhánh cầu để xác định điểm cân bằng.',
    parameters: { V_src: 9, R_val: 220, simSpeed: 1 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-violet-400 fill-none stroke-current" stroke-width="1.8">
      <rect x="18" y="16" width="164" height="88" rx="6" stroke="#334155" stroke-dasharray="3,2" fill="#070b14" />
      <line x1="100" y1="24" x2="62" y2="60" stroke="#818cf8" stroke-width="2" />
      <line x1="100" y1="24" x2="138" y2="60" stroke="#818cf8" stroke-width="2" />
      <line x1="62" y1="60" x2="100" y2="96" stroke="#34d399" stroke-width="2" />
      <line x1="138" y1="60" x2="100" y2="96" stroke="#f59e0b" stroke-width="2" />
      <line x1="62" y1="60" x2="138" y2="60" stroke="#c084fc" stroke-dasharray="3,2" />
      <circle cx="62" cy="60" r="3.5" fill="#60a5fa" stroke="none" />
      <circle cx="138" cy="60" r="3.5" fill="#4ade80" stroke="none" />
      <text x="48" y="63" font-size="8" fill="#93c5fd" stroke="none">A</text>
      <text x="145" y="63" font-size="8" fill="#86efac" stroke="none">B</text>
      <text x="80" y="55" font-size="7.5" fill="#e9d5ff" stroke="none">ΔV=0V</text>
      <text x="108" y="34" font-size="7.5" fill="#fca5a5" stroke="none">+9V</text>
    </svg>`,
  },
  {
    id: 'sample-voltage-divider',
    title: 'Mạch cầu phân áp & Cảnh báo quá công suất',
    topic: 'Điện học & Mạch điện',
    category: 'electronics',
    templateId: 'circuits',
    previewDescription: 'Nguồn 12V qua cầu phân áp R1 = 100Ω, R2 = 220Ω. Đo sụt áp Vout và kiểm tra công suất trở.',
    problemText: 'Cho mạch cầu phân áp DC gồm nguồn Vin = 12V mắc nối tiếp với R1 = 100Ω và R2 = 220Ω. Tính dòng điện I, điện áp Vout trên R2 và kiểm tra xem điện trở 0.25W có bị quá tải nhiệt hay không.',
    parameters: { topology: 1, V: 12, R: 100, R2: 220 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-amber-400 fill-none stroke-current" stroke-width="1.8">
      <line x1="40" y1="20" x2="100" y2="20" stroke="#94a3b8" />
      <line x1="40" y1="20" x2="40" y2="100" stroke="#94a3b8" />
      <line x1="40" y1="100" x2="100" y2="100" stroke="#94a3b8" />
      <line x1="30" y1="54" x2="50" y2="54" stroke="#ef4444" stroke-width="2.5" />
      <line x1="34" y1="64" x2="46" y2="64" stroke="#38bdf8" stroke-width="2" />
      <text x="12" y="62" font-size="9" fill="#f8fafc" stroke="none">12V</text>
      <rect x="92" y="28" width="16" height="24" rx="2" stroke="#818cf8" fill="#0f172a" />
      <text x="115" y="43" font-size="8.5" fill="#c7d2fe" stroke="none">R1=100Ω</text>
      <line x1="100" y1="20" x2="100" y2="28" stroke="#94a3b8" />
      <line x1="100" y1="52" x2="100" y2="68" stroke="#94a3b8" />
      <rect x="92" y="68" width="16" height="24" rx="2" stroke="#34d399" fill="#0f172a" />
      <text x="115" y="83" font-size="8.5" fill="#6ee7b7" stroke="none">R2=220Ω</text>
      <line x1="100" y1="92" x2="100" y2="100" stroke="#94a3b8" />
      <circle cx="100" cy="60" r="3" fill="#f59e0b" stroke="none" />
      <line x1="100" y1="60" x2="160" y2="60" stroke="#f59e0b" stroke-dasharray="3,2" />
      <text x="148" y="54" font-size="8.5" fill="#fbbf24" stroke="none">Vout</text>
    </svg>`,
  },
  {
    id: 'sample-rlc-resonance',
    title: 'Mạch RLC nối tiếp & Cộng hưởng tần số',
    topic: 'Mạch RLC xoay chiều & Máy hiện sóng',
    category: 'electronics',
    templateId: 'rlc_ac',
    previewDescription: 'Khảo sát R = 40Ω, L = 100mH, C = 15μF ở f = 130Hz trên máy hiện sóng 2 kênh.',
    problemText: 'Mạch điện xoay chiều RLC nối tiếp có U0 = 12V, R = 40Ω, L = 100mH, C = 15μF ở tần số f = 130Hz. Tính cảm kháng ZL, dung kháng ZC, độ lệch pha φ và tìm tần số cộng hưởng f0 của mạch.',
    parameters: { U0: 12, f: 130, R: 40, L_mH: 100, C_uF: 15 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-cyan-400 fill-none stroke-current" stroke-width="1.8">
      <rect x="18" y="18" width="164" height="84" rx="6" stroke="#1e293b" fill="#070b14" />
      <line x1="18" y1="60" x2="182" y2="60" stroke="#1e293b" stroke-width="1" />
      <path d="M 22 60 Q 42 20, 62 60 T 102 60 T 142 60 T 178 60" stroke="#38bdf8" stroke-width="2" />
      <path d="M 32 60 Q 52 28, 72 60 T 112 60 T 152 60 T 178 44" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="4,2" />
      <text x="26" y="32" font-size="8" fill="#38bdf8" stroke="none">u(t)</text>
      <text x="50" y="32" font-size="8" fill="#fbbf24" stroke="none">i(t)</text>
      <text x="122" y="94" font-size="8" fill="#34d399" stroke="none">ZL ≈ ZC</text>
    </svg>`,
  },
  {
    id: 'sample-components-iv',
    title: 'Đọc vạch màu điện trở & Đặc tuyến Zener / BJT',
    topic: 'Linh kiện điện tử & Đặc tuyến I-V',
    category: 'electronics',
    templateId: 'components_lab',
    previewDescription: 'Khảo sát đường đặc tuyến Vôn-Ampe, điểm làm việc Q và tra mã linh kiện thực tế.',
    problemText: 'Khảo sát đặc tuyến Vôn-Ampe của Diode Zener 5.1V hoặc Transistor BJT mắc E chung với nguồn Vcc = 9V, tải RL = 330Ω. Xác định điểm làm việc tĩnh Q trên đường tải một chiều.',
    parameters: { device: 1, Vcc: 9, Rl: 330, Ib_uA: 30 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-emerald-400 fill-none stroke-current" stroke-width="1.8">
      <line x1="30" y1="95" x2="175" y2="95" stroke="#64748b" stroke-width="1.5" />
      <line x1="100" y1="15" x2="100" y2="105" stroke="#64748b" stroke-width="1.5" />
      <path d="M 45 102 L 50 95 L 100 95 L 122 93 Q 134 86 142 25" stroke="#10b981" stroke-width="2.2" />
      <line x1="100" y1="45" x2="160" y2="95" stroke="#f59e0b" stroke-dasharray="3,2" stroke-width="1.5" />
      <circle cx="136" cy="75" r="4" fill="#ef4444" stroke="#ffffff" stroke-width="1" />
      <text x="144" y="75" font-size="8.5" fill="#fca5a5" stroke="none">Q-point</text>
      <text x="36" y="88" font-size="7.5" fill="#94a3b8" stroke="none">-Vz</text>
      <text x="148" y="34" font-size="8" fill="#34d399" stroke="none">I-V</text>
    </svg>`,
  },
  {
    id: 'sample-rectifier-bridge',
    title: 'Chỉnh lưu cầu 4 Diode & Lọc tụ nguồn DC',
    topic: 'Mạch chỉnh lưu Diode & Lọc nguồn',
    category: 'electronics',
    templateId: 'rectifier_diode',
    previewDescription: 'Biến áp 12Vrms qua cầu 4 Diode và tụ lọc C = 220μF cấp tải 220Ω. Tính Vdc & độ gợn sóng.',
    problemText: 'Mạch chỉnh lưu cầu 4 Diode dùng biến áp thứ cấp Urms = 12V (50Hz), tụ lọc nguồn C = 220μF và tải RL = 220Ω. Quan sát dạng sóng ngõ ra DC và tính biên độ gợn sóng ΔV.',
    parameters: { mode: 2, Vrms: 12, C_uF: 220, Rl: 220 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-sky-400 fill-none stroke-current" stroke-width="1.8">
      <polygon points="65,30 90,55 65,80 40,55" stroke="#38bdf8" fill="rgba(56,189,248,0.08)" />
      <line x1="18" y1="55" x2="40" y2="55" stroke="#94a3b8" />
      <line x1="90" y1="55" x2="120" y2="55" stroke="#22c55e" />
      <line x1="120" y1="40" x2="120" y2="75" stroke="#22c55e" />
      <line x1="112" y1="52" x2="128" y2="52" stroke="#f59e0b" stroke-width="2.5" />
      <line x1="112" y1="58" x2="128" y2="58" stroke="#f59e0b" stroke-width="2.5" />
      <path d="M 140 50 Q 152 38 164 46 Q 176 38 188 46" stroke="#4ade80" stroke-width="2" />
      <text x="142" y="70" font-size="8" fill="#4ade80" stroke="none">Vdc + Ripple</text>
      <text x="53" y="58" font-size="7.5" fill="#bae6fd" stroke="none">4D</text>
    </svg>`,
  },
  {
    id: 'sample-opamp-clipping',
    title: 'Khuếch đại Op-Amp đảo & Hiện tượng xén ngọn',
    topic: 'Khuếch đại Op-Amp & Xung NE555',
    category: 'electronics',
    templateId: 'analog_opamp_555',
    previewDescription: 'Op-Amp khuếch đại đảo Rin = 10kΩ, Rf = 47kΩ, nguồn ±12V với sóng vào Vin = 3.2V.',
    problemText: 'Mạch khuếch đại đảo dùng Op-Amp có Rin = 10kΩ, Rf = 47kΩ, cấp nguồn ±12V. Khi đưa tín hiệu sin biên độ Vin = 3.2V vào ngõ vào, điều gì xảy ra với sóng ngõ ra Vout?',
    parameters: { circuitMode: 0, Vin: 3.2, R1_k: 10, R2_k: 47, Vcc: 12, C_uF: 10 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-rose-400 fill-none stroke-current" stroke-width="1.8">
      <polygon points="45,30 45,85 95,57" stroke="#818cf8" fill="rgba(129,140,248,0.1)" />
      <text x="52" y="50" font-size="9" fill="#c7d2fe" stroke="none">-</text>
      <text x="52" y="72" font-size="9" fill="#c7d2fe" stroke="none">+</text>
      <line x1="95" y1="57" x2="115" y2="57" stroke="#818cf8" />
      <line x1="120" y1="26" x2="185" y2="26" stroke="#ef4444" stroke-dasharray="3,2" stroke-width="1" />
      <line x1="120" y1="88" x2="185" y2="88" stroke="#ef4444" stroke-dasharray="3,2" stroke-width="1" />
      <path d="M 120 57 L 128 28 L 140 28 L 152 86 L 164 86 L 176 28 L 185 28" stroke="#fb7185" stroke-width="2" />
      <text x="132" y="102" font-size="8" fill="#fda4af" stroke="none">Clipping ±Vcc</text>
    </svg>`,
  },
  {
    id: 'sample-projectile',
    title: 'Bắn đại bác ở góc 45°',
    topic: 'Chuyển động ném xiên',
    category: 'physics',
    templateId: 'projectile_motion',
    previewDescription: 'Bài toán quỹ đạo ném xiên kinh điển với U = 28 m/s, θ = 45°, và g = 9.8 m/s².',
    problemText: 'Một khẩu đại bác đặt trên mặt đất bằng phẳng bắn một viên đạn với vận tốc đầu 28 m/s ở góc 45° so với phương ngang. Hãy tìm độ cao cực đại và tầm bay xa của viên đạn.',
    parameters: { U: 28, theta: 45, g: 9.8 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-blue-500 fill-none stroke-current" stroke-width="2">
      <path d="M 20 100 Q 100 15 180 100" stroke="currentColor" stroke-dasharray="4,3" />
      <line x1="15" y1="100" x2="185" y2="100" stroke="#94a3b8" />
      <circle cx="20" cy="100" r="4" fill="#3b82f6" />
      <circle cx="100" cy="57" r="4" fill="#ef4444" />
      <line x1="20" y1="100" x2="45" y2="75" stroke="#22c55e" stroke-width="2.5" />
      <text x="50" y="80" font-size="10" fill="#22c55e" stroke="none">U=28, θ=45°</text>
      <text x="105" y="55" font-size="9" fill="#ef4444" stroke="none">H_max</text>
    </svg>`,
  },
  {
    id: 'sample-optics',
    title: 'Sự tạo ảnh qua thấu kính hội tụ',
    topic: 'Quang hình học',
    category: 'physics',
    templateId: 'optics',
    previewDescription: 'Quang hình thấu kính mỏng với vật đặt cách thấu kính 35 cm và tiêu cự f = 15 cm.',
    problemText: 'Một vật sáng mũi tên có chiều cao 6 cm đặt vuông góc với trục chính của thấu kính hội tụ có tiêu cự 15 cm, cách thấu kính 35 cm. Xác định vị trí, kích thước và tính chất của ảnh tạo bởi thấu kính.',
    parameters: { f: 15, u: 35, h_o: 6 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-indigo-500 fill-none stroke-current" stroke-width="1.5">
      <line x1="10" y1="60" x2="190" y2="60" stroke="#94a3b8" />
      <ellipse cx="100" cy="60" rx="8" ry="45" fill="rgba(99, 102, 241, 0.15)" stroke="#6366f1" stroke-width="2" />
      <line x1="40" y1="60" x2="40" y2="30" stroke="#3b82f6" stroke-width="3" />
      <line x1="40" y1="30" x2="100" y2="30" stroke="#f59e0b" stroke-dasharray="2,2" />
      <line x1="100" y1="30" x2="160" y2="85" stroke="#f59e0b" />
      <line x1="40" y1="30" x2="160" y2="85" stroke="#f59e0b" />
      <line x1="160" y1="60" x2="160" y2="85" stroke="#ef4444" stroke-width="3" />
      <circle cx="70" cy="60" r="2.5" fill="#0f172a" />
      <circle cx="130" cy="60" r="2.5" fill="#0f172a" />
      <text x="66" y="73" font-size="8" fill="#64748b" stroke="none">F1</text>
      <text x="126" y="73" font-size="8" fill="#64748b" stroke="none">F2</text>
    </svg>`,
  },
  {
    id: 'sample-freefall',
    title: 'Thả rơi vật từ đỉnh tháp cao 60m',
    topic: 'Sự rơi tự do',
    category: 'physics',
    templateId: 'free_fall',
    previewDescription: 'Thả rơi tự do một quả cầu từ độ cao h = 60 m với gia tốc trọng trường tiêu chuẩn.',
    problemText: 'Một viên bi kim loại được thả rơi tự do không vận tốc đầu từ đỉnh một tháp quan sát cao 60 mét. Tính thời gian viên bi chạm đất và vận tốc ngay trước khi chạm đất (lấy g = 9.8 m/s²).',
    parameters: { h: 60, g: 9.8 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-amber-500 fill-none stroke-current" stroke-width="1.5">
      <rect x="25" y="20" width="30" height="85" fill="#e2e8f0" stroke="#64748b" />
      <line x1="15" y1="105" x2="185" y2="105" stroke="#16a34a" stroke-width="3" />
      <circle cx="40" cy="20" r="6" fill="#ec4899" stroke="#be185d" />
      <line x1="40" y1="26" x2="40" y2="102" stroke="#ec4899" stroke-dasharray="3,3" />
      <line x1="75" y1="20" x2="75" y2="105" stroke="#f59e0b" stroke-width="1.5" />
      <text x="85" y="65" font-size="10" fill="#d97706" stroke="none">h = 60 m</text>
    </svg>`,
  },
  {
    id: 'sample-shm',
    title: 'Hệ con lắc lò xo dao động điều hòa',
    topic: 'Dao động điều hòa',
    category: 'physics',
    templateId: 'shm',
    previewDescription: 'Con lắc lò xo m = 2.5 kg, độ cứng k = 65 N/m, biên độ dao động A = 5 m.',
    problemText: 'Một vật có khối lượng 2.5 kg gắn vào lò xo nằm ngang có độ cứng k = 65 N/m trên mặt phẳng không ma sát. Kéo vật lệch khỏi vị trí cân bằng 5 m rồi buông nhẹ. Tính tần số góc và chu kỳ dao động.',
    parameters: { A: 5, m: 2.5, k: 65 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-emerald-500 fill-none stroke-current" stroke-width="2">
      <line x1="20" y1="20" x2="20" y2="100" stroke="#334155" stroke-width="4" />
      <line x1="15" y1="100" x2="185" y2="100" stroke="#94a3b8" />
      <path d="M 20 60 L 35 60 L 40 45 L 50 75 L 60 45 L 70 75 L 80 45 L 90 75 L 100 60 L 110 60" stroke="#059669" fill="none" />
      <rect x="110" y="40" width="35" height="40" fill="#3b82f6" rx="4" stroke="#1d4ed8" />
      <text x="122" y="65" font-size="10" fill="#ffffff" stroke="none">m</text>
      <line x1="85" y1="100" x2="85" y2="115" stroke="#ef4444" stroke-dasharray="2,2" />
      <text x="75" y="118" font-size="8" fill="#ef4444" stroke="none">x=0</text>
    </svg>`,
  },
  {
    id: 'sample-kinematics',
    title: 'Xe tăng tốc và hãm phanh',
    topic: 'Động học chất điểm',
    category: 'physics',
    templateId: 'kinematics',
    previewDescription: 'Chuyển động thẳng với vận tốc đầu u = 15 m/s, gia tốc a = 2.5 m/s².',
    problemText: 'Một xe ô tô nhập làn đường cao tốc với vận tốc 15 m/s và tăng tốc đều với gia tốc 2.5 m/s² trong 8 giây. Xác định vận tốc cuối cùng và quãng đường xe đã đi được trong thời gian này.',
    parameters: { u: 15, a: 2.5, t_max: 8 },
    diagramSvg: `<svg viewBox="0 0 200 120" class="w-full h-full text-cyan-500 fill-none stroke-current" stroke-width="1.5">
      <line x1="10" y1="95" x2="190" y2="95" stroke="#475569" stroke-width="3" />
      <rect x="30" y="65" width="45" height="20" rx="3" fill="#0284c7" stroke="#0369a1" />
      <circle cx="42" cy="85" r="5" fill="#334155" />
      <circle cx="63" cy="85" r="5" fill="#334155" />
      <line x1="78" y1="75" x2="115" y2="75" stroke="#f59e0b" stroke-width="2.5" />
      <text x="85" y="68" font-size="9" fill="#d97706" stroke="none">a = 2.5 m/s²</text>
    </svg>`,
  },
];

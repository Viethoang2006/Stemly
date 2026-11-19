import React, { Component, Suspense, lazy } from 'react';
import { TemplateId } from '../../types/stemly';
import { CircuitSandboxSim } from './CircuitSandboxSim';
import { ComponentsLabSim } from './ComponentsLabSim';

function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await importer();
      } catch (err) {
        lastErr = err;
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
    throw lastErr;
  });
}

const ProjectileMotionSim = lazyWithRetry(() =>
  import('./ProjectileMotionSim').then((m) => ({ default: m.ProjectileMotionSim }))
);
const FreeFallSim = lazyWithRetry(() =>
  import('./FreeFallSim').then((m) => ({ default: m.FreeFallSim }))
);
const SHMSim = lazyWithRetry(() => import('./SHMSim').then((m) => ({ default: m.SHMSim })));
const OpticsSim = lazyWithRetry(() => import('./OpticsSim').then((m) => ({ default: m.OpticsSim })));
const KinematicsSim = lazyWithRetry(() =>
  import('./KinematicsSim').then((m) => ({ default: m.KinematicsSim }))
);
const AtomSim = lazyWithRetry(() => import('./AtomSim').then((m) => ({ default: m.AtomSim })));
const CircuitsSim = lazyWithRetry(() =>
  import('./CircuitsSim').then((m) => ({ default: m.CircuitsSim }))
);
const RlcAcSim = lazyWithRetry(() => import('./RlcAcSim').then((m) => ({ default: m.RlcAcSim })));
const RectifierSim = lazyWithRetry(() =>
  import('./RectifierSim').then((m) => ({ default: m.RectifierSim }))
);
const AnalogOpAmp555Sim = lazyWithRetry(() =>
  import('./AnalogOpAmp555Sim').then((m) => ({ default: m.AnalogOpAmp555Sim }))
);
const EquationPlotterSim = lazyWithRetry(() =>
  import('./EquationPlotterSim').then((m) => ({ default: m.EquationPlotterSim }))
);

interface VisualiserFactoryProps {
  templateId: TemplateId;
  parameters: Record<string, number>;
  onSimulationStats?: (stats: Record<string, string>) => void;
  onParametersBatchChange?: (updates: Record<string, number>) => void;
  sandboxPresetRequest?: { key: string; nonce: number; parameters?: Record<string, number> };
}

class SimErrorBoundary extends Component<
  { resetKey: string; children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-4">
          <div className="text-center space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
            <div className="font-semibold text-amber-600 dark:text-amber-300">Không thể tải mô-đun mô phỏng</div>
            <p className="text-slate-500 dark:text-slate-400">Kết nối tới máy chủ tạm gián đoạn. Vui lòng thử tải lại.</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              Tải lại trang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const SimLoadingFallback = () => (
  <div className="h-full w-full rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
    <div className="flex flex-col items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
      <span>Đang tải phòng mô phỏng...</span>
    </div>
  </div>
);

export const VisualiserFactory: React.FC<VisualiserFactoryProps> = ({
  templateId,
  parameters,
  onSimulationStats,
  onParametersBatchChange,
  sandboxPresetRequest,
}) => {
  const renderSim = () => {
    switch (templateId) {
      case 'circuits':
        return (
          <CircuitsSim
            parameters={parameters}
            onSimulationStats={onSimulationStats}
            onParametersBatchChange={onParametersBatchChange}
          />
        );
      case 'rlc_ac':
        return (
          <RlcAcSim
            parameters={parameters}
            onSimulationStats={onSimulationStats}
            onParametersBatchChange={onParametersBatchChange}
          />
        );
      case 'components_lab':
        return (
          <ComponentsLabSim
            parameters={parameters}
            onSimulationStats={onSimulationStats}
            onParametersBatchChange={onParametersBatchChange}
          />
        );
      case 'rectifier_diode':
        return (
          <RectifierSim
            parameters={parameters}
            onSimulationStats={onSimulationStats}
            onParametersBatchChange={onParametersBatchChange}
          />
        );
      case 'analog_opamp_555':
        return (
          <AnalogOpAmp555Sim
            parameters={parameters}
            onSimulationStats={onSimulationStats}
            onParametersBatchChange={onParametersBatchChange}
          />
        );
      case 'circuit_sandbox':
        return (
          <CircuitSandboxSim
            parameters={parameters}
            onSimulationStats={onSimulationStats}
            onParametersBatchChange={onParametersBatchChange}
            presetRequest={sandboxPresetRequest}
          />
        );
      case 'projectile_motion':
        return <ProjectileMotionSim parameters={parameters} onSimulationStats={onSimulationStats} />;
      case 'free_fall':
        return <FreeFallSim parameters={parameters} onSimulationStats={onSimulationStats} />;
      case 'shm':
        return <SHMSim parameters={parameters} onSimulationStats={onSimulationStats} />;
      case 'optics':
        return <OpticsSim parameters={parameters} onSimulationStats={onSimulationStats} />;
      case 'kinematics':
        return <KinematicsSim parameters={parameters} onSimulationStats={onSimulationStats} />;
      case 'atom':
        return <AtomSim parameters={parameters} onSimulationStats={onSimulationStats} />;
      case 'equation_plotter':
        return <EquationPlotterSim parameters={parameters} onSimulationStats={onSimulationStats} />;
      default:
        return <ProjectileMotionSim parameters={parameters} onSimulationStats={onSimulationStats} />;
    }
  };

  return (
    <SimErrorBoundary resetKey={templateId}>
      <Suspense fallback={<SimLoadingFallback />}>{renderSim()}</Suspense>
    </SimErrorBoundary>
  );
};

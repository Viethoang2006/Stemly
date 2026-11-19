import * as THREE from 'three';

export type GyroPermissionState = 'idle' | 'granted' | 'denied' | 'unsupported';

export interface GyroReading {
  alpha: number;
  beta: number;
  gamma: number;
  timestamp: number;
}

interface DeviceOrientationConstructorWithPermission {
  requestPermission?: () => Promise<'granted' | 'denied'>;
}

const _zee = new THREE.Vector3(0, 0, 1);
const _euler = new THREE.Euler();
const _q0 = new THREE.Quaternion();
const _q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -PI/2 around X

/**
 * Checks whether the current browser/device requires an explicit user-gesture permission prompt
 * (iOS 13+ Safari) before DeviceOrientationEvent fires.
 */
export function needsGyroPermissionPrompt(): boolean {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
    return false;
  }
  const ctor = DeviceOrientationEvent as unknown as DeviceOrientationConstructorWithPermission;
  return typeof ctor.requestPermission === 'function';
}

/**
 * Requests gyroscope / device orientation permission from a direct user click/tap gesture.
 */
export async function requestGyroPermission(): Promise<GyroPermissionState> {
  if (typeof window === 'undefined' || typeof DeviceOrientationEvent === 'undefined') {
    return 'unsupported';
  }
  const ctor = DeviceOrientationEvent as unknown as DeviceOrientationConstructorWithPermission;
  if (typeof ctor.requestPermission === 'function') {
    try {
      const res = await ctor.requestPermission();
      return res === 'granted' ? 'granted' : 'denied';
    } catch {
      return 'denied';
    }
  }
  return 'granted';
}

/**
 * Converts W3C DeviceOrientation alpha/beta/gamma (degrees) + screen orientation angle
 * into a Three.js world-space quaternion (reusing `out` to avoid GC allocations).
 */
export function deviceOrientationToQuaternion(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenOrientDeg: number,
  out: THREE.Quaternion
): THREE.Quaternion {
  const alpha = THREE.MathUtils.degToRad(alphaDeg);
  const beta = THREE.MathUtils.degToRad(betaDeg);
  const gamma = THREE.MathUtils.degToRad(gammaDeg);
  const orient = THREE.MathUtils.degToRad(screenOrientDeg);

  _euler.set(beta, alpha, -gamma, 'YXZ');
  out.setFromEuler(_euler);
  out.multiply(_q1);
  out.multiply(_q0.setFromAxisAngle(_zee, -orient));
  return out;
}

export function getScreenOrientationAngle(): number {
  if (typeof window === 'undefined') return 0;
  if (window.screen?.orientation && typeof window.screen.orientation.angle === 'number') {
    return window.screen.orientation.angle;
  }
  const legacyOrient = (window as unknown as { orientation?: number }).orientation;
  return typeof legacyOrient === 'number' ? legacyOrient : 0;
}

/**
 * Zero-allocation controller that converts mobile gyroscope events into smooth relative
 * quaternion orientation changes from a calibrated forward pose.
 */
export class VRGyroTracker {
  private listening = false;
  private hasReading = false;
  private calibrated = false;
  private latestAlpha = 0;
  private latestBeta = 0;
  private latestGamma = 0;
  private screenAngle = 0;

  private readonly rawQuat = new THREE.Quaternion();
  private readonly baseInvQuat = new THREE.Quaternion();
  private readonly targetDeltaQuat = new THREE.Quaternion();
  private readonly smoothDeltaQuat = new THREE.Quaternion();
  private onSignalCallback?: () => void;

  private readonly handleOrientation = (e: DeviceOrientationEvent) => {
    if (e.alpha === null && e.beta === null && e.gamma === null) return;
    this.latestAlpha = e.alpha ?? 0;
    this.latestBeta = e.beta ?? 0;
    this.latestGamma = e.gamma ?? 0;
    this.screenAngle = getScreenOrientationAngle();
    const wasActive = this.hasReading;
    this.hasReading = true;
    if (!wasActive && this.onSignalCallback) {
      this.onSignalCallback();
    }
  };

  private readonly handleScreenOrientChange = () => {
    this.screenAngle = getScreenOrientationAngle();
  };

  start(onFirstSignal?: () => void): void {
    if (this.listening || typeof window === 'undefined') return;
    this.onSignalCallback = onFirstSignal;
    this.listening = true;
    this.screenAngle = getScreenOrientationAngle();
    window.addEventListener('deviceorientation', this.handleOrientation, true);
    window.addEventListener('orientationchange', this.handleScreenOrientChange);
  }

  stop(): void {
    if (!this.listening || typeof window === 'undefined') return;
    window.removeEventListener('deviceorientation', this.handleOrientation, true);
    window.removeEventListener('orientationchange', this.handleScreenOrientChange);
    this.listening = false;
  }

  recenter(): void {
    this.calibrated = false;
  }

  hasSensorData(): boolean {
    return this.hasReading;
  }

  getAngles(): { alpha: number; beta: number; gamma: number } {
    return {
      alpha: this.latestAlpha,
      beta: this.latestBeta,
      gamma: this.latestGamma,
    };
  }

  /**
   * Computes smoothly damped relative orientation quaternion since calibration.
   * Returns true when live sensor data is available and applied to `outDelta`.
   */
  updateRelativeQuaternion(dt: number, outDelta: THREE.Quaternion): boolean {
    if (!this.hasReading) return false;
    deviceOrientationToQuaternion(
      this.latestAlpha,
      this.latestBeta,
      this.latestGamma,
      this.screenAngle,
      this.rawQuat
    );
    if (!this.calibrated) {
      this.baseInvQuat.copy(this.rawQuat).invert();
      this.smoothDeltaQuat.identity();
      this.calibrated = true;
    }
    // Relative rotation since calibrated device pose
    this.targetDeltaQuat.multiplyQuaternions(this.baseInvQuat, this.rawQuat);
    const alpha = 1 - Math.exp(-14 * Math.max(0.001, dt));
    this.smoothDeltaQuat.slerp(this.targetDeltaQuat, alpha);
    outDelta.copy(this.smoothDeltaQuat);
    return true;
  }
}

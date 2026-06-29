import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * Device store — manages anonymous device identification.
 *
 * Generates a random fingerprint on first visit and persists it
 * in localStorage so the device is remembered across refreshes.
 */
interface DeviceState {
  /** Unique device fingerprint (persisted in localStorage) */
  fingerprint: string | null;
  /** Human-readable device name */
  deviceName: string | null;
  /** Browser name detected from user agent */
  browser: string | null;
  /** Platform (e.g., Windows, macOS, Linux) */
  platform: string | null;
  /** OS name */
  os: string | null;

  /** Initialize device info from the browser environment */
  initialize: () => void;
  /** Get device info object for API calls */
  getDeviceInfo: () => {
    fingerprint: string;
    deviceName?: string;
    browser?: string;
    platform?: string;
    os?: string;
  };
}

/** Generate a random fingerprint (UUID v4-like) */
function generateFingerprint(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  // Format as hex string
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Detect browser info from user agent */
function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Unknown';
}

/** Detect OS from user agent */
function detectOS(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Unknown';
}

/** Detect platform */
function detectPlatform(): string {
  if (typeof navigator === 'undefined') return 'Unknown';
  const ua = navigator.userAgent;
  if (ua.includes('Mobile')) return 'Mobile';
  if (ua.includes('Tablet')) return 'Tablet';
  return 'Desktop';
}

export const useDeviceStore = create<DeviceState>()(
  devtools(
    persist(
      (set, get) => ({
        fingerprint: null,
        deviceName: null,
        browser: null,
        platform: null,
        os: null,

        initialize: () => {
          const state = get();
          const browser = detectBrowser();
          const os = detectOS();
          const platform = detectPlatform();
          const deviceName = `${browser} on ${os}`;

          set({
            fingerprint: state.fingerprint || generateFingerprint(),
            deviceName,
            browser,
            platform,
            os,
          });
        },

        getDeviceInfo: () => {
          const state = get();
          return {
            fingerprint: state.fingerprint || generateFingerprint(),
            deviceName: state.deviceName || undefined,
            browser: state.browser || undefined,
            platform: state.platform || undefined,
            os: state.os || undefined,
          };
        },
      }),
      {
        name: 'p2p-device-store',
        // Only persist the fingerprint — device info is re-detected on each visit
        partialState: (state: DeviceState) => ({
          fingerprint: state.fingerprint,
        }),
      } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    ),
    { name: 'device-store' },
  ),
);

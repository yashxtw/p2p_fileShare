'use client';

import { useEffect } from 'react';
import { useDeviceStore } from '@/stores/device.store';

/**
 * Hook to initialize and access device identification.
 * Call this in any component that needs device info.
 *
 * On first render, initializes the device store (generates fingerprint if needed,
 * detects browser/OS). The fingerprint is persisted in localStorage.
 */
export function useDevice() {
  const {
    fingerprint,
    deviceName,
    browser,
    platform,
    os,
    initialize,
    getDeviceInfo,
  } = useDeviceStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return {
    fingerprint,
    deviceName,
    browser,
    platform,
    os,
    /** Device info object ready for API calls */
    deviceInfo: getDeviceInfo(),
    /** Whether the device has been initialized */
    isReady: fingerprint !== null,
  };
}

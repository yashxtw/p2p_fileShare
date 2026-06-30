/**
 * Helper to compute SHA-256 hash using a Web Worker to avoid blocking the main UI thread.
 */
export function computeHash(buffer: ArrayBuffer): Promise<string> {
  return new Promise((resolve, reject) => {
    // 1. Create worker script as inline string
    const workerCode = `
      self.onmessage = async (e) => {
        const { buffer } = e.data;
        try {
          const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          self.postMessage({ success: true, hash: hashHex });
        } catch (err) {
          self.postMessage({ success: false, error: err.message || 'Hash failed' });
        }
      };
    `;

    try {
      // 2. Create blob URL and instantiate Worker
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);

      worker.onmessage = (e) => {
        const { success, hash, error } = e.data;
        // Cleanup URLs and terminate worker
        worker.terminate();
        URL.revokeObjectURL(workerUrl);

        if (success) {
          resolve(hash);
        } else {
          reject(new Error(error));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        URL.revokeObjectURL(workerUrl);
        reject(err);
      };

      // 3. Post raw buffer to background worker thread (zero-copy transfer)
      worker.postMessage({ buffer }, [buffer]);
    } catch (fallbackError) {
      // Fallback to main-thread async digest if Workers are disabled/blocked
      crypto.subtle.digest('SHA-256', buffer)
        .then((hashBuffer) => {
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          resolve(hashHex);
        })
        .catch(reject);
    }
  });
}

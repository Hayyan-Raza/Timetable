export { };

declare global {
    interface Window {
        electron: {
            startBackend: () => Promise<boolean>;
            stopBackend: () => Promise<boolean>;
            getBackendStatus: () => Promise<boolean>;
        };
    }
}

const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let backendProcess = null;
let mainWindow = null;

/**
 * Start the Flask backend process
 * @returns {Promise<boolean>} - Returns true if backend started successfully
 */
async function startBackend() {
    // Determine backend executable path
    const backendPath = app.isPackaged
        ? path.join(process.resourcesPath, 'backend', 'app.exe')
        : path.join(__dirname, '..', 'backend', 'dist', 'app.exe');

    console.log('Starting backend from:', backendPath);

    return new Promise((resolve, reject) => {
        try {
            backendProcess = spawn(backendPath, [], {
                cwd: path.dirname(backendPath),
                stdio: 'pipe',
                windowsHide: true // Hide the console window on Windows
            });

            backendProcess.stdout.on('data', (data) => {
                console.log(`Backend: ${data}`);
            });

            backendProcess.stderr.on('data', (data) => {
                console.error(`Backend Error: ${data}`);
            });

            backendProcess.on('error', (error) => {
                console.error('Failed to start backend process:', error);
                reject(error);
            });

            backendProcess.on('close', (code) => {
                console.log(`Backend exited with code ${code}`);
                backendProcess = null;
            });

            console.log('Backend process started, verifying health...');

            // Wait for backend to be ready by checking health endpoint
            waitForBackendHealth()
                .then(() => {
                    console.log('Backend is healthy and ready');
                    resolve(true);
                })
                .catch((error) => {
                    console.error('Backend health check failed:', error);
                    reject(error);
                });
        } catch (error) {
            console.error('Failed to spawn backend:', error);
            reject(error);
        }
    });
}

/**
 * Check if backend is ready by polling the health endpoint
 * @returns {Promise<void>}
 */
async function waitForBackendHealth() {
    const maxAttempts = 30; // 30 seconds max
    const delayMs = 1000; // Check every second

    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch('http://localhost:5000/health');
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'healthy') {
                    return;
                }
            }
        } catch (error) {
            // Backend not ready yet, continue waiting
        }

        await new Promise(resolve => setTimeout(resolve, delayMs));
    }

    throw new Error('Backend failed to start within 30 seconds');
}

/**
 * Stop the Flask backend process
 */
function stopBackend() {
    if (backendProcess && !backendProcess.killed) {
        console.log('Stopping backend...');

        try {
            // Try graceful shutdown first
            backendProcess.kill('SIGTERM');

            // Force kill after 5 seconds if still running
            setTimeout(() => {
                if (backendProcess && !backendProcess.killed) {
                    console.log('Force killing backend...');
                    backendProcess.kill('SIGKILL');
                }
            }, 5000);
        } catch (error) {
            console.error('Error stopping backend:', error);
        }

        backendProcess = null;
    }
}


function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    if (!app.isPackaged) {
        // Development mode: load from Vite dev server
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // Production mode: load from built files
        const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
        console.log('Loading from:', indexPath);
        mainWindow.loadFile(indexPath);
    }

    mainWindow.on('closed', () => {
        stopBackend();
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    try {
        if (app.isPackaged) {
            // Start backend and wait for it to be healthy
            console.log('Packaged mode: Starting backend...');
            await startBackend();
            console.log('Backend ready, creating window...');
            createWindow();
        } else {
            // In dev mode, assume backend is already running
            console.log('Development mode: Skipping backend startup');
            createWindow();
        }
    } catch (error) {
        console.error('Failed to start application:', error);
        // Show error dialog to user
        const { dialog } = require('electron');
        dialog.showErrorBox(
            'Startup Error',
            `Failed to start the backend server:\n\n${error.message}\n\nPlease try restarting the application.`
        );
        app.quit();
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    stopBackend();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    stopBackend();
});

// Handle cleanup when app is about to exit
app.on('will-quit', (event) => {
    if (backendProcess && !backendProcess.killed) {
        event.preventDefault();
        stopBackend();
        // Give backend time to shutdown gracefully
        setTimeout(() => {
            app.quit();
        }, 1000);
    }
});


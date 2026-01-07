const { app, BrowserWindow, ipcMain } = require('electron');
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
    // In onedir mode, the executable is inside a folder named 'app'
    const backendPath = app.isPackaged
        ? path.join(process.resourcesPath, 'backend', 'app', 'app.exe')
        : path.join(__dirname, '..', 'backend', 'dist', 'app', 'app.exe');

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
            if (process.platform === 'win32') {
                // Windows: Use taskkill to kill the process tree (including children like OR-Tools)
                spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']);
            } else {
                // Unix-like: Standard kill
                backendProcess.kill('SIGTERM');
                // Force kill after 5 seconds if still running
                setTimeout(() => {
                    if (backendProcess && !backendProcess.killed) {
                        backendProcess.kill('SIGKILL');
                    }
                }, 5000);
            }
        } catch (error) {
            console.error('Error stopping backend:', error);
        }

        backendProcess = null;
    }
}


// Basic MIME types for serving static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm'
};

let server = null;

function startStaticServer(directory, port) {
    const http = require('http');
    const fs = require('fs');

    return new Promise((resolve, reject) => {
        server = http.createServer((request, response) => {
            let filePath = path.join(directory, request.url === '/' ? 'index.html' : request.url);

            // Prevent directory traversal
            if (!filePath.startsWith(directory)) {
                response.writeHead(403);
                response.end('Forbidden');
                return;
            }

            const extname = path.extname(filePath);
            let contentType = MIME_TYPES[extname] || 'application/octet-stream';

            fs.readFile(filePath, (error, content) => {
                if (error) {
                    if (error.code == 'ENOENT') {
                        // Keep SPA routing working by serving index.html for unknown paths
                        fs.readFile(path.join(directory, 'index.html'), (error, content) => {
                            if (error) {
                                response.writeHead(500);
                                response.end('Error loading index.html');
                            } else {
                                response.writeHead(200, { 'Content-Type': 'text/html' });
                                response.end(content, 'utf-8');
                            }
                        });
                    } else {
                        response.writeHead(500);
                        response.end(`Server Error: ${error.code} ..\n`);
                    }
                } else {
                    response.writeHead(200, { 'Content-Type': contentType });
                    response.end(content, 'utf-8');
                }
            });
        });

        server.listen(port, () => {
            console.log(`Server running at http://localhost:${port}/`);
            resolve();
        }).on('error', (err) => {
            console.error('Failed to start server:', err);
            reject(err);
        });
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            zoomFactor: app.isPackaged ? 0.75 : 1.0,
        },
        icon: path.join(__dirname, '../assets/icon.png')
    });

    if (!app.isPackaged) {
        // Development mode: load from Vite dev server
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        // Production mode: Start local server to support OAuth origins
        // We use port 5173 to match the likely configured redirect URI in Google Console
        const distPath = path.join(app.getAppPath(), 'dist');
        const port = 5173;

        startStaticServer(distPath, port).then(() => {
            mainWindow.loadURL(`http://localhost:${port}`);
        }).catch(err => {
            console.error('Failed to start production server:', err);
            // Fallback to file protocol if server fails (Auth won't work, but app will load)
            const indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
            mainWindow.loadFile(indexPath);
        });
    }

    mainWindow.on('closed', () => {
        stopBackend();
        if (server) server.close();
        mainWindow = null;
    });
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    app.whenReady().then(async () => {
        // Create window immediately
        createWindow();

        // Register IPC Handlers for On-Demand Backend
        ipcMain.handle('start-backend', async () => {
            if (backendProcess) {
                console.log('Backend already running');
                return true;
            }
            console.log('Starting backend on-demand...');
            try {
                // If packaged, start the real executable.
                // If dev, assume python script is handled externally or not needed for UI dev
                if (app.isPackaged) {
                    await startBackend();
                } else {
                    console.log('Dev mode: skipping actual spawn, assuming external backend');
                    // Note: In dev, you might want to spawn python manually or just return true
                    // for now we'll pretend it started if not packaged.
                }
                return true;
            } catch (err) {
                console.error('Failed to start backend:', err);
                throw err;
            }
        });

        ipcMain.handle('stop-backend', async () => {
            stopBackend();
            return true;
        });

        ipcMain.handle('get-backend-status', () => {
            return !!backendProcess;
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createWindow();
            }
        });
    });
}

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


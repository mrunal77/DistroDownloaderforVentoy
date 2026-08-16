"use strict";
/* src/main/windowManager.ts
 * Electron BrowserWindow creation and lifecycle management.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWindow = createWindow;
exports.getMainWindow = getMainWindow;
exports.setupAppLifecycle = setupAppLifecycle;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
let mainWindow = null;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 960,
        minHeight: 600,
        frame: false,
        titleBarStyle: 'hidden',
        backgroundColor: '#0f172a',
        show: true,
        webPreferences: {
            preload: path_1.default.join(__dirname, '..', '..', 'preload.cjs'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });
    mainWindow.once('ready-to-show', () => {
        console.log('Window ready-to-show');
    });
    mainWindow.webContents.on('did-finish-load', () => {
        console.log('Page finished loading');
    });
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.log('Page failed to load:', errorCode, errorDescription);
    });
    mainWindow.webContents.on('console-message', (event, details) => {
        const prefix = details.level === 2 ? 'Renderer Error' : details.level === 3 ? 'Renderer Warning' : 'Renderer Log';
        console.log(prefix + ' [' + details.sourceId + ':' + details.lineNumber + ']:', details.message);
    });
    const devServerUrl = process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL || (typeof globalThis.MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? globalThis.MAIN_WINDOW_VITE_DEV_SERVER_URL : null);
    console.log('Dev server URL:', devServerUrl, 'MAIN_WINDOW_VITE_NAME:', typeof globalThis.MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' ? globalThis.MAIN_WINDOW_VITE_DEV_SERVER_URL : 'undefined');
    if (devServerUrl) {
        mainWindow.loadURL(devServerUrl);
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, `../renderer/${globalThis.MAIN_WINDOW_VITE_NAME}/index.html`));
    }
    return mainWindow;
}
function getMainWindow() {
    return mainWindow;
}
function setupAppLifecycle() {
    electron_1.app.on('window-all-closed', () => {
        if (process.platform !== 'darwin')
            electron_1.app.quit();
    });
    electron_1.app.on('gpu-info-update', () => {
        console.log('GPU feature status:', electron_1.app.getGPUFeatureStatus());
    });
}

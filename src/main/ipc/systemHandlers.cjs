"use strict";
/* src/main/ipc/systemHandlers.ts
 * Thin IPC wiring for settings, window controls, and catalog.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSystemHandlers = registerSystemHandlers;
const electron_1 = require("electron");
const electron_2 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const catalog_1 = require("../catalog.cjs");
const validators_1 = require("../validation/validators.cjs");
function registerSystemHandlers(mainWindow) {
    electron_1.ipcMain.handle('get-catalog', async () => {
        return (0, catalog_1.loadCatalog)();
    });
    electron_1.ipcMain.handle('get-settings', async () => {
        const settingsPath = path_1.default.join(electron_2.app.getPath('userData'), 'settings.json');
        try {
            const raw = fs_1.default.readFileSync(settingsPath, 'utf-8');
            return JSON.parse(raw);
        }
        catch {
            return null;
        }
    });
    electron_1.ipcMain.handle('set-settings', async (_event, settings) => {
        (0, validators_1.validateSettings)(settings);
        const settingsPath = path_1.default.join(electron_2.app.getPath('userData'), 'settings.json');
        fs_1.default.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf-8');
        return { success: true };
    });
    electron_1.ipcMain.handle('window-minimize', async () => {
        if (mainWindow)
            mainWindow.minimize();
    });
    electron_1.ipcMain.handle('window-maximize', async () => {
        if (mainWindow) {
            if (mainWindow.isMaximized()) {
                mainWindow.unmaximize();
            }
            else {
                mainWindow.maximize();
            }
        }
    });
    electron_1.ipcMain.handle('window-is-maximized', async () => {
        if (mainWindow)
            return mainWindow.isMaximized();
        return false;
    });
    electron_1.ipcMain.handle('window-close', async () => {
        if (mainWindow)
            mainWindow.close();
    });
}

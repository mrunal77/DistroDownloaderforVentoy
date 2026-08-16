"use strict";
/* src/main/usb/driveEnumerator.ts
 * USB drive enumeration - thin re-exports.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageInfo = exports.getVentoyDrive = exports.getDriveDetails = exports.detectAllDrives = void 0;
var usbDetectionService_1 = require("../usbDetectionService.cjs");
Object.defineProperty(exports, "detectAllDrives", { enumerable: true, get: function () { return usbDetectionService_1.detectAllDrives; } });
Object.defineProperty(exports, "getDriveDetails", { enumerable: true, get: function () { return usbDetectionService_1.getDriveDetails; } });
Object.defineProperty(exports, "getVentoyDrive", { enumerable: true, get: function () { return usbDetectionService_1.getVentoyDrive; } });
var storage_1 = require("../usb/storage.cjs");
Object.defineProperty(exports, "getStorageInfo", { enumerable: true, get: function () { return storage_1.getStorageInfo; } });

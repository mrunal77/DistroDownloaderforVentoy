"use strict";
/* src/main/usb/ventoyAnalyzer.ts
 * Ventoy-specific drive analysis.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyVentoyMetadataReadOnly = exports.detectVentoyOnDrive = void 0;
var usbDetectionService_1 = require("../usbDetectionService.cjs");
Object.defineProperty(exports, "detectVentoyOnDrive", { enumerable: true, get: function () { return usbDetectionService_1.detectVentoyOnDrive; } });
var ventoyMetadata_1 = require("../ventoyMetadata.cjs");
Object.defineProperty(exports, "verifyVentoyMetadataReadOnly", { enumerable: true, get: function () { return ventoyMetadata_1.verifyVentoyMetadataReadOnly; } });

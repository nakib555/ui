
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { executeGetCurrentLocation, executeRequestLocationPermission } from './location';
import { executeVideoGenerator } from './videoGenerator';
import { executeCaptureCodeOutputScreenshot } from './screenshot';

// Only tools that REQUIRE browser APIs (DOM, Geolocation, window object) remain here.
// All logic, calculation, search, and file IO is handled 100% by the backend.
export const toolImplementations: Record<string, (args: any) => string | Promise<string>> = {
  'getCurrentLocation': executeGetCurrentLocation,
  'requestLocationPermission': executeRequestLocationPermission,
  'generateVideo': executeVideoGenerator, // Frontend wrapper for API Key check
  'captureCodeOutputScreenshot': executeCaptureCodeOutputScreenshot,
  
  // 'approveExecution' and 'denyExecution' are handled specially in useChat/index.ts 
  // and do not need to be registered here.
};

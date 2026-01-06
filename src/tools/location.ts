/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionDeclaration, Type } from "@google/genai";
import { ToolError } from '../types';

export const getCurrentLocationDeclaration: FunctionDeclaration = {
  name: 'getCurrentLocation',
  description: "Gets the user's current geographical location (latitude and longitude).",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const executeGetCurrentLocation = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new ToolError("getCurrentLocation", "GEOLOCATION_UNSUPPORTED", "Geolocation is not supported by this browser.", undefined, "Your browser does not support geolocation, so I cannot determine your location."));
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          resolve(`Current location: Latitude ${latitude.toFixed(4)}, Longitude ${longitude.toFixed(4)}`);
        },
        (error) => {
          let code: string;
          let message: string;
          let suggestion: string;

          switch(error.code) {
            case error.PERMISSION_DENIED:
              code = 'GEOLOCATION_PERMISSION_DENIED';
              message = "User denied the request for Geolocation.";
              suggestion = "To use this feature, please allow location access in your browser settings and try your request again.";
              break;
            case error.POSITION_UNAVAILABLE:
              code = 'GEOLOCATION_UNAVAILABLE';
              message = "Location information is unavailable.";
              suggestion = "Your location could not be determined. Please ensure you have a stable network connection and that location services are enabled on your device.";
              break;
            case error.TIMEOUT:
              code = 'GEOLOCATION_TIMEOUT';
              message = "The request to get user location timed out.";
              suggestion = "The request for your location took too long. Please check your network connection and try again.";
              break;
            default:
              code = 'GEOLOCATION_UNKNOWN_ERROR';
              message = "An unknown error occurred while fetching location.";
              suggestion = "An unexpected error occurred while trying to get your location. Please try again.";
              break;
          }
          reject(new ToolError("getCurrentLocation", code, message, new Error(error.message), suggestion));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  });
};

export const requestLocationPermissionDeclaration: FunctionDeclaration = {
  name: 'requestLocationPermission',
  description: "Asks the user for location permission after it was previously denied. This will render a special UI prompt for the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

export const executeRequestLocationPermission = (): string => {
    const message = "To find places near you, I need access to your location. Could you please grant permission?";
    // This special string will be parsed by the UI to render a permission request component.
    return `[LOCATION_PERMISSION_REQUEST]${message}[/LOCATION_PERMISSION_REQUEST]`;
};
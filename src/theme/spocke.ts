
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const spockeTheme = {
  // --- Base Layers (True Void) ---
  "--bg-page": "#000000",        // True OLED Black
  "--bg-layer-1": "#050505",     // Almost Black (Cards)
  "--bg-layer-2": "#0a0a0a",     // Dark Gray (Inputs/Hover)
  "--bg-layer-3": "#171717",     // Lighter Gray (Active)
  "--bg-glass": "rgba(0, 0, 0, 0.7)", // Dark Translucent

  // --- Text Colors (High Contrast) ---
  "--text-primary": "#ededed",   // Near White
  "--text-secondary": "#a1a1aa", // Neutral Gray
  "--text-tertiary": "#52525b",  // Darker Gray
  "--text-inverted": "#000000",

  // --- Borders (Neon Glow) ---
  "--border-subtle": "rgba(34, 211, 238, 0.08)", // Cyan hint
  "--border-default": "rgba(34, 211, 238, 0.15)",
  "--border-strong": "rgba(34, 211, 238, 0.25)",
  "--border-focus": "#22d3ee",   // Electric Cyan

  // --- Brand Colors (Electric Cyan/Teal) ---
  "--primary-main": "#06b6d4",   // Cyan 500
  "--primary-hover": "#22d3ee",  // Cyan 400
  "--primary-subtle": "rgba(6, 182, 212, 0.15)", // Cyan tint
  "--primary-text": "#cffafe",   // Cyan 100

  // --- Status Indicators (Vibrant Neon) ---
  "--status-error-bg": "rgba(220, 38, 38, 0.2)",
  "--status-error-text": "#fca5a5",
  "--status-success-bg": "rgba(22, 163, 74, 0.2)",
  "--status-success-text": "#86efac",
  "--status-warning-bg": "rgba(202, 138, 4, 0.2)",
  "--status-warning-text": "#fde047",

  // --- Component Specifics ---
  "--bg-message-user": "#0a0a0a", 
  "--bg-message-ai": "transparent",
  "--bg-input": "#050505",
  "--bg-input-secondary": "#0a0a0a",
  "--bg-code": "#000000",
  "--text-code": "#22d3ee",      // Matrix style code text
  "--bg-sidebar": "#000000"
};

export default spockeTheme;

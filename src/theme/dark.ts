
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const darkTheme = {
  // --- Base Layers (Premium Dark) ---
  "--bg-page": "#050505",       // Deepest Black/Zinc (Rich background)
  "--bg-layer-1": "#121212",    // Zinc 900/950 (Surface for cards/sidebar)
  "--bg-layer-2": "#1e1e22",    // Zinc 800 (Hover states, inputs)
  "--bg-layer-3": "#2a2a30",    // Zinc 700 (Active states)
  "--bg-glass": "rgba(10, 10, 10, 0.8)", // Dark Translucent

  // --- Text Colors (Crisp & Readable) ---
  "--text-primary": "#f4f4f5",  // Zinc 50 (High emphasis)
  "--text-secondary": "#a1a1aa", // Zinc 400 (Medium emphasis)
  "--text-tertiary": "#52525b",  // Zinc 600 (Low emphasis)
  "--text-inverted": "#000000",  // Black text on white buttons

  // --- Borders (Subtle & Refined) ---
  "--border-subtle": "rgba(255, 255, 255, 0.03)",
  "--border-default": "rgba(255, 255, 255, 0.08)",
  "--border-strong": "rgba(255, 255, 255, 0.15)",
  "--border-focus": "#818cf8",   // Indigo 400

  // --- Brand Colors (Vibrant Indigo/Violet) ---
  "--primary-main": "#6366f1",   // Indigo 500
  "--primary-hover": "#818cf8",  // Indigo 400
  "--primary-subtle": "rgba(99, 102, 241, 0.15)", // Transparent Indigo
  "--primary-text": "#e0e7ff",   // Indigo 50

  // --- Status Indicators (Soft Neons) ---
  "--status-error-bg": "rgba(127, 29, 29, 0.2)",
  "--status-error-text": "#fca5a5", // Red 300
  "--status-success-bg": "rgba(20, 83, 45, 0.2)",
  "--status-success-text": "#86efac", // Green 300
  "--status-warning-bg": "rgba(113, 63, 18, 0.2)",
  "--status-warning-text": "#fde047", // Yellow 300

  // --- Component Specifics ---
  "--bg-message-user": "#1e1e22", // Distinct bubble
  "--bg-message-ai": "transparent", 
  "--bg-input": "#121212",        
  "--bg-input-secondary": "#1e1e22", 
  "--bg-code": "#0a0a0a",         // Pitch black for code contrast
  "--text-code": "#e4e4e7",       
  "--bg-sidebar": "#050505"       // Matches page background
};

export default darkTheme;

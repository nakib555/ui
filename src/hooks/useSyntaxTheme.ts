
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  vscDarkPlus, 
  oneLight, 
  dracula, 
  atomDark, 
  materialDark, 
  synthwave84, 
  ghcolors,
  solarizedlight,
  vs
} from 'react-syntax-highlighter/dist/esm/styles/prism';

// Map of available themes
export const SYNTAX_THEMES: Record<string, any> = {
  'auto': null, // Special case handled by logic
  'vsc-dark': vscDarkPlus,
  'one-light': oneLight,
  'dracula': dracula,
  'atom-dark': atomDark,
  'material': materialDark,
  'synthwave': synthwave84,
  'github': ghcolors,
  'solarized': solarizedlight,
  'vs': vs
};

export const useSyntaxTheme = () => {
  const [style, setStyle] = useState(vscDarkPlus);

  useEffect(() => {
    const update = () => {
      // 1. Check user preference
      let storedPreference = 'auto';
      try {
        storedPreference = localStorage.getItem('syntax_theme') || 'auto';
      } catch (e) {}

      // 2. If specific theme selected, use it
      if (storedPreference !== 'auto' && SYNTAX_THEMES[storedPreference]) {
        setStyle(SYNTAX_THEMES[storedPreference]);
        return;
      }

      // 3. Fallback to Auto (System/App Mode)
      const isDark = document.documentElement.classList.contains('dark');
      setStyle(isDark ? vscDarkPlus : oneLight);
    };

    update(); // Initial check

    // Listen for class changes (Dark/Light mode toggles)
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // Listen for manual settings changes (dispatched from GeneralSettings)
    window.addEventListener('syntax-theme-change', update);

    return () => {
      observer.disconnect();
      window.removeEventListener('syntax-theme-change', update);
    };
  }, []);

  return style;
};

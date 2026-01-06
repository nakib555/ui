/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type LogoProps = {
  className?: string;
  size?: number;
};

export const Logo: React.FC<LogoProps> = ({ className = "", size }) => {
  const id = React.useId().replace(/:/g, '');

  return (
    <div 
      className={`${className} flex items-center justify-center text-indigo-600 dark:text-indigo-400`} 
      style={size ? { width: size, height: size } : {}}
      role="img"
      aria-label="Agentic AI Logo"
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id={`grad_main_${id}`} x1="20" y1="20" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id={`grad_accent_${id}`} x1="180" y1="20" x2="20" y2="180" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#a855f7" /> {/* Purple accent */}
            <stop offset="100%" stopColor="#3b82f6" /> {/* Blue accent */}
          </linearGradient>
          <filter id={`glow_${id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background/Base: Hexagonal Shield */}
        <path
          d="M100 10 L177.9 55 V145 L100 190 L22.1 145 V55 L100 10Z"
          stroke={`url(#grad_main_${id})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          className="opacity-20"
        />

        {/* Central Intelligence Core */}
        <circle cx="100" cy="100" r="18" fill={`url(#grad_accent_${id})`} filter={`url(#glow_${id})`} />
        <circle cx="100" cy="100" r="24" stroke={`url(#grad_accent_${id})`} strokeWidth="1.5" className="opacity-60" />

        {/* Inner Connectivity Network - The Neural Mesh */}
        <path 
            d="M100 76 L143 125 L57 125 Z" 
            stroke="currentColor" 
            strokeWidth="1" 
            strokeOpacity="0.2" 
            fill="none" 
        />
        
        {/* Orbiting Nodes representing Agents */}
        {/* Top Node - Strategic/Commander */}
        <g>
            <circle cx="100" cy="50" r="7" fill="currentColor" className="opacity-90" />
            <line x1="100" y1="57" x2="100" y2="76" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-60" />
        </g>
        
        {/* Bottom Right Node - Execution/Tools */}
        <g>
            <circle cx="143.3" cy="125" r="7" fill="currentColor" className="opacity-90" />
            <line x1="137.3" y1="121.5" x2="120.8" y2="112" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-60" />
        </g>

        {/* Bottom Left Node - Analysis/Data */}
        <g>
            <circle cx="56.7" cy="125" r="7" fill="currentColor" className="opacity-90" />
            <line x1="62.7" y1="121.5" x2="79.2" y2="112" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-60" />
        </g>

        {/* Data Ring - The Flow of Information */}
        <circle cx="100" cy="100" r="65" stroke={`url(#grad_accent_${id})`} strokeWidth="1.5" strokeDasharray="4 6" strokeOpacity="0.4" />

        {/* Decorative Tech Accents */}
        <path d="M100 15 V25" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30" />
        <path d="M100 185 V175" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30" />
        <path d="M26 100 H36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30" />
        <path d="M174 100 H164" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="opacity-30" />
        
        {/* Small Data Particles */}
        <circle cx="160" cy="70" r="2" fill="currentColor" className="opacity-40" />
        <circle cx="40" cy="130" r="2" fill="currentColor" className="opacity-40" />
      </svg>
    </div>
  );
};

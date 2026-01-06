
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

type LogoProps = {
  className?: string;
  size?: number;
};

export const WelcomeLogo: React.FC<LogoProps> = ({ className = "", size }) => {
  // Generate a unique ID to prevent ID collisions in DOM
  const id = React.useId().replace(/:/g, '');

  return (
    <div 
      className={`${className} relative flex items-center justify-center`} 
      style={size ? { width: size, height: size } : {}}
      role="img"
      aria-label="Agentic AI Logo"
    >
      <svg
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <style>
          {`
            .spin-slow-${id} { animation: spin-${id} 40s linear infinite; }
            .spin-mid-${id} { animation: spin-${id} 25s linear infinite; }
            .spin-reverse-slow-${id} { animation: spin-${id} 35s linear infinite reverse; }
            .pulse-${id} { animation: pulse-${id} 6s ease-in-out infinite; }
            .float-${id} { animation: float-${id} 8s ease-in-out infinite; }
            
            /* Enhanced Radiating Waves */
            .wave-${id} {
              transform-origin: 128px 128px;
              animation: wave-expand-${id} 3s cubic-bezier(0, 0, 0.2, 1) infinite;
              opacity: 0;
            }

            @keyframes spin-${id} { 100% { transform: rotate(360deg); } }
            @keyframes pulse-${id} { 
              0%, 100% { opacity: 0.5; transform: scale(1); } 
              50% { opacity: 0.8; transform: scale(1.02); } 
            }
            @keyframes float-${id} {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-6px); }
            }
            @keyframes wave-expand-${id} {
              0% { transform: scale(0.5); opacity: 0; stroke-width: 4px; }
              30% { opacity: 0.8; }
              100% { transform: scale(2.2); opacity: 0; stroke-width: 0px; }
            }

            /* Mobile Performance Optimization */
            @media (max-width: 768px) {
              .spin-slow-${id}, 
              .spin-mid-${id}, 
              .spin-reverse-slow-${id} {
                animation-duration: 60s; /* Slower on mobile to save battery */
              }
            }
          `}
        </style>
        
        <defs>
          <linearGradient id={`grad_primary_${id}`} x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--primary-main)" /> 
            <stop offset="100%" stopColor="var(--primary-hover)" /> 
          </linearGradient>
          
          <linearGradient id={`grad_secondary_${id}`} x1="256" y1="0" x2="0" y2="256" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--border-focus)" /> 
            <stop offset="100%" stopColor="var(--primary-main)" /> 
          </linearGradient>
          
          <linearGradient id={`grad_core_${id}`} x1="128" y1="100" x2="128" y2="156" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="var(--primary-subtle)" />
          </linearGradient>

          <filter id={`glow_soft_${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="12" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          
          <filter id={`glow_intense_${id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* --- STRONG SHINING WAVES --- */}
        <g>
             <circle cx="128" cy="128" r="60" stroke={`url(#grad_primary_${id})`} fill="none" className={`wave-${id}`} style={{ animationDelay: '0s' }} />
             <circle cx="128" cy="128" r="60" stroke={`url(#grad_secondary_${id})`} fill="none" className={`wave-${id}`} style={{ animationDelay: '1s' }} />
             <circle cx="128" cy="128" r="60" stroke={`url(#grad_primary_${id})`} fill="none" className={`wave-${id}`} style={{ animationDelay: '2s' }} />
        </g>

        {/* Background Ambient Field */}
        <g className={`pulse-${id}`} style={{ transformOrigin: '128px 128px' }}>
           <circle cx="128" cy="128" r="90" fill={`url(#grad_primary_${id})`} opacity="0.1" filter={`url(#glow_soft_${id})`} />
        </g>

        {/* Outer Tech Ring */}
        <g className={`origin-center spin-slow-${id}`}>
            {/* Dashed Track */}
            <circle cx="128" cy="128" r="110" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15" strokeDasharray="4 8" />
            
            {/* Rotating Arcs */}
            <path d="M128 18 A110 110 0 0 1 238 128" stroke={`url(#grad_secondary_${id})`} strokeWidth="2" strokeLinecap="round" opacity="0.6" filter={`url(#glow_intense_${id})`} />
            <path d="M128 238 A110 110 0 0 1 18 128" stroke={`url(#grad_primary_${id})`} strokeWidth="2" strokeLinecap="round" opacity="0.6" filter={`url(#glow_intense_${id})`} />
            
            {/* Data Nodes on Ring */}
            <circle cx="128" cy="18" r="3" fill={`url(#grad_secondary_${id})`} filter={`url(#glow_intense_${id})`} />
            <circle cx="238" cy="128" r="3" fill={`url(#grad_secondary_${id})`} />
            <circle cx="128" cy="238" r="3" fill={`url(#grad_primary_${id})`} filter={`url(#glow_intense_${id})`} />
            <circle cx="18" cy="128" r="3" fill={`url(#grad_primary_${id})`} />
        </g>

        {/* Middle Geometric Layer - Hexagon & Connections */}
        <g className={`origin-center spin-reverse-slow-${id}`}>
            {/* Hexagon Path */}
            <path 
              d="M128 48 L197 88 V168 L128 208 L59 168 V88 Z" 
              stroke={`url(#grad_primary_${id})`} 
              strokeWidth="1.5" 
              fill="none"
              strokeOpacity="0.4"
            />
            
            {/* Internal connecting lines (Neural Network metaphor) */}
            <path d="M128 48 L128 100" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
            <path d="M197 88 L152 114" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
            <path d="M197 168 L152 142" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
            <path d="M128 208 L128 156" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
            <path d="M59 168 L104 142" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
            <path d="M59 88 L104 114" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.2" />
        </g>

        {/* Inner Orbital System */}
        <g className={`origin-center spin-mid-${id}`}>
             <ellipse cx="128" cy="128" rx="65" ry="25" stroke={`url(#grad_secondary_${id})`} strokeWidth="1" strokeOpacity="0.3" transform="rotate(45 128 128)" />
             <ellipse cx="128" cy="128" rx="65" ry="25" stroke={`url(#grad_primary_${id})`} strokeWidth="1" strokeOpacity="0.3" transform="rotate(-45 128 128)" />
             
             {/* Electrons - Glowing */}
             <circle cx="174" cy="82" r="4" fill="var(--primary-main)" transform="rotate(45 128 128)" filter={`url(#glow_intense_${id})`}>
                <animate attributeName="opacity" values="0.4;1;0.4" dur="4s" repeatCount="indefinite" />
             </circle>
             <circle cx="82" cy="174" r="4" fill="var(--primary-main)" transform="rotate(45 128 128)" filter={`url(#glow_intense_${id})`}>
                <animate attributeName="opacity" values="0.4;1;0.4" dur="4s" repeatCount="indefinite" begin="2s" />
             </circle>
        </g>

        {/* Central Cognitive Core */}
        <g className={`float-${id}`}>
            {/* Core Glow */}
            <circle cx="128" cy="128" r="28" fill={`url(#grad_primary_${id})`} opacity="0.4" filter={`url(#glow_intense_${id})`} />
            
            {/* Solid Core */}
            <circle cx="128" cy="128" r="16" fill={`url(#grad_core_${id})`} />
            
            {/* Iris/Lens detail */}
            <circle cx="128" cy="128" r="10" stroke={`url(#grad_primary_${id})`} strokeWidth="1.5" fill="none" opacity="0.8" />
            <circle cx="128" cy="128" r="5" fill={`url(#grad_primary_${id})`} />
        </g>
      </svg>
    </div>
  );
};

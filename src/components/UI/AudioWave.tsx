
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'framer-motion';

type AudioWaveProps = {
    isPlaying: boolean;
    className?: string;
    barColor?: string;
};

export const AudioWave: React.FC<AudioWaveProps> = ({ isPlaying, className = "", barColor = "bg-primary-main" }) => {
    if (!isPlaying) return null;
    
    return (
        <div className={`flex items-center gap-0.5 h-4 ${className}`}>
            {[1, 2, 3, 4, 5].map((i) => (
                <motion.div
                    key={i}
                    className={`w-1 rounded-full ${barColor}`}
                    initial={{ height: 4 }}
                    animate={{ height: [4, 14, 6, 12, 4] }}
                    transition={{
                        duration: 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: i * 0.08,
                    }}
                />
            ))}
        </div>
    );
};

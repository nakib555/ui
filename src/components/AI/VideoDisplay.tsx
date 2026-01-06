/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion as motionTyped, AnimatePresence } from 'framer-motion';
const motion = motionTyped as any;

type VideoDisplayProps = {
  srcUrl?: string;
  prompt?: string;
};

// --- SVG Icons for Player Controls ---
const PlayIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6.3 2.841A1.5 1.5 0 0 0 4 4.11V15.89a1.5 1.5 0 0 0 2.3 1.269l9.344-5.89a1.5 1.5 0 0 0 0-2.538L6.3 2.84Z" /></svg>;
const PauseIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M5.75 3a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Zm7 0a.75.75 0 0 0-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 0 0 .75-.75V3.75a.75.75 0 0 0-.75-.75h-1.5Z" /></svg>;
const VolumeHighIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M9.823 3.235a.75.75 0 0 1 1.06.05l.024.028 4.606 5.183a.75.75 0 0 1-.955 1.154l-.07-.05-4.606-5.183a.75.75 0 0 1-.05-1.154l.024-.028zM13 7.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5a.75.75 0 0 1 .75-.75z" /><path d="M4.75 5.5a.75.75 0 0 0 0 1.5v6.5a.75.75 0 0 0 0-1.5V5.5z" /><path fillRule="evenodd" d="M1.99 8.157a.75.75 0 0 1 .76-.75h1.5a.75.75 0 0 1 .75.75v3.686a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.76-.75V8.157zM2.75 5.907a2.25 2.25 0 0 0-2.25 2.25v3.686a2.25 2.25 0 0 0 2.25 2.25h1.5A2.25 2.25 0 0 0 8 11.843V8.157A2.25 2.25 0 0 0 5.75 5.907h-1.5z" clipRule="evenodd" /></svg>;
const VolumeLowIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M4.75 5.5a.75.75 0 0 0 0 1.5v6.5a.75.75 0 0 0 0-1.5V5.5z" /><path fillRule="evenodd" d="M1.99 8.157a.75.75 0 0 1 .76-.75h1.5a.75.75 0 0 1 .75.75v3.686a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.76-.75V8.157zM2.75 5.907a2.25 2.25 0 0 0-2.25 2.25v3.686a2.25 2.25 0 0 0 2.25 2.25h1.5A2.25 2.25 0 0 0 8 11.843V8.157A2.25 2.25 0 0 0 5.75 5.907h-1.5z" clipRule="evenodd" /></svg>;
const VolumeMuteIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M12.965 5.233a.75.75 0 0 1 .157 1.054L6.82 15.17a.75.75 0 0 1-1.21-.866L11.906 5.38a.75.75 0 0 1 1.059-.147z" /><path fillRule="evenodd" d="M1.99 8.157a.75.75 0 0 1 .76-.75h1.5a.75.75 0 0 1 .75.75v3.686a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1-.76-.75V8.157zM2.75 5.907a2.25 2.25 0 0 0-2.25 2.25v3.686a2.25 2.25 0 0 0 2.25 2.25h1.5A2.25 2.25 0 0 0 8 11.843V8.157A2.25 2.25 0 0 0 5.75 5.907h-1.5z" clipRule="evenodd" /></svg>;
const FullscreenEnterIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M3.25 3.25a.75.75 0 0 0 0 1.5h1.25V6a.75.75 0 0 0 1.5 0V4.75h1.25a.75.75 0 0 0 0-1.5H3.25ZM15.25 4.75h1.25a.75.75 0 0 0 0-1.5H13.25a.75.75 0 0 0 0 1.5h1.25V6a.75.75 0 0 0 1.5 0V4.75ZM6 13.25v-1.25a.75.75 0 0 0-1.5 0V13.25H3.25a.75.75 0 0 0 0 1.5h3.25a.75.75 0 0 0 0-1.5H6ZM13.25 13.25a.75.75 0 0 0 0 1.5h3.25a.75.75 0 0 0 0-1.5H15.25v-1.25a.75.75 0 0 0-1.5 0V13.25Z" /></svg>;
const FullscreenExitIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M6 4.75V3.25a.75.75 0 0 0-1.5 0v3.25a.75.75 0 0 0 1.5 0V5.5h1.25a.75.75 0 0 0 0-1.5H6ZM13.25 4.75a.75.75 0 0 0 0-1.5H12V3.25a.75.75 0 0 0-1.5 0v3.25a.75.75 0 0 0 1.5 0V4.75h1.25ZM4.75 14v1.25a.75.75 0 0 0 1.5 0V12a.75.75 0 0 0-1.5 0v1.25H3.25a.75.75 0 0 0 0 1.5H4.75ZM14 14.5a.75.75 0 0 0 1.5 0V12a.75.75 0 0 0-1.5 0v1.25h-1.25a.75.75 0 0 0 0 1.5H14Z" /></svg>;
const LoopIcon = () => <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.32 2.366l-1.12 1.12A.75.75 0 0 1 3.75 14V11.25a.75.75 0 0 1 .75-.75h2.75a.75.75 0 0 1 .53 1.28l-1.12 1.12a4 4 0 0 0 6.788-1.72.75.75 0 0 1 1.392.574ZM4.688 8.576a5.5 5.5 0 0 1 9.32-2.366l1.12-1.12A.75.75 0 0 1 16.25 6H13.5a.75.75 0 0 1-.75-.75V2.5a.75.75 0 0 1 1.28-.53l1.12 1.12a4 4 0 0 0-6.788 1.72.75.75 0 0 1-1.392-.574Z" clipRule="evenodd" /></svg>;

const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export const VideoDisplay: React.FC<VideoDisplayProps> = ({ srcUrl, prompt }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [volume, setVolume] = useState(1);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isLooping, setIsLooping] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isControlsVisible, setIsControlsVisible] = useState(false);
    const [isVolumeSliderVisible, setIsVolumeSliderVisible] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLInputElement>(null);

    const handlePlayState = () => {
        if (videoRef.current) {
            setIsPlaying(!videoRef.current.paused);
        }
    };
    
    useEffect(() => {
        const video = videoRef.current;
        if (video) {
            video.addEventListener('play', handlePlayState);
            video.addEventListener('pause', handlePlayState);
            video.addEventListener('ended', handlePlayState);
            return () => {
                video.removeEventListener('play', handlePlayState);
                video.removeEventListener('pause', handlePlayState);
                video.removeEventListener('ended', handlePlayState);
            };
        }
    }, [srcUrl]);

    const togglePlayPause = () => {
        if (videoRef.current) {
            videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current && duration > 0) {
            const currentProgress = (videoRef.current.currentTime / duration) * 100;
            setProgress(currentProgress);
            setCurrentTime(videoRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            videoRef.current.play().catch(e => console.error("Autoplay was prevented:", e));
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (videoRef.current) {
            const newTime = (Number(e.target.value) / 100) * duration;
            videoRef.current.currentTime = newTime;
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (videoRef.current) {
            const newVolume = Number(e.target.value);
            videoRef.current.volume = newVolume;
            setVolume(newVolume);
            setIsMuted(newVolume === 0);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            const currentlyMuted = videoRef.current.muted;
            videoRef.current.muted = !currentlyMuted;
            setIsMuted(!currentlyMuted);
            if (currentlyMuted && videoRef.current.volume === 0) {
              videoRef.current.volume = 0.5;
            }
        }
    };
    
    const toggleLoop = () => {
        if (videoRef.current) {
            const newLoopState = !videoRef.current.loop;
            videoRef.current.loop = newLoopState;
            setIsLooping(newLoopState);
        }
    };

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };
    
    useEffect(() => {
        const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const progressStyle = {
        background: `linear-gradient(to right, #6366f1 ${progress}%, #475569 ${progress}%)`,
    };

    const volumeStyle = {
        background: `linear-gradient(to right, #a7f3d0 ${isMuted ? 0 : volume * 100}%, #475569 ${isMuted ? 0 : volume * 100}%)`,
    };

    const VolumeIcon = () => {
        if (isMuted || volume === 0) return <VolumeMuteIcon />;
        if (volume < 0.5) return <VolumeLowIcon />;
        return <VolumeHighIcon />;
    };

    return (
        <div 
            className="my-6 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-200/10 shadow-lg bg-white dark:bg-white/5 relative"
            ref={containerRef}
            onMouseEnter={() => setIsControlsVisible(true)}
            onMouseLeave={() => {
                setIsControlsVisible(false);
                setIsVolumeSliderVisible(false);
            }}
        >
            <div className="aspect-video w-full bg-slate-900/50 flex items-center justify-center">
                {srcUrl ? (
                    <video
                        ref={videoRef}
                        src={srcUrl}
                        playsInline
                        muted
                        onClick={togglePlayPause}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onVolumeChange={() => {
                            if (videoRef.current) {
                                setIsMuted(videoRef.current.muted);
                                setVolume(videoRef.current.volume);
                            }
                        }}
                        className="w-full h-full cursor-pointer"
                        aria-label={prompt || "Generated video"}
                    />
                ) : (
                    <div className="text-sm text-slate-400 p-4 text-center">
                        <span>No video source provided.</span>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {isControlsVisible && srcUrl && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent flex flex-col justify-end p-3 text-white"
                    >
                        {/* Progress Bar */}
                        <div className="w-full mb-2">
                            <input
                                ref={progressRef}
                                type="range"
                                min="0"
                                max="100"
                                value={progress}
                                onChange={handleSeek}
                                className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer range-sm"
                                style={progressStyle}
                            />
                        </div>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <button onClick={togglePlayPause} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                                    {isPlaying ? <PauseIcon /> : <PlayIcon />}
                                </button>
                                <div
                                    className="flex items-center gap-2"
                                    onMouseEnter={() => setIsVolumeSliderVisible(true)}
                                    onMouseLeave={() => setIsVolumeSliderVisible(false)}
                                >
                                    <button onClick={toggleMute} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                                        <VolumeIcon />
                                    </button>
                                    <AnimatePresence>
                                        {isVolumeSliderVisible && (
                                            <motion.input
                                                initial={{ width: 0, opacity: 0 }}
                                                animate={{ width: 80, opacity: 1 }}
                                                exit={{ width: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                type="range"
                                                min="0"
                                                max="1"
                                                step="0.05"
                                                value={isMuted ? 0 : volume}
                                                onChange={handleVolumeChange}
                                                className="w-20 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer range-sm"
                                                style={volumeStyle}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>
                                <div className="text-xs font-mono">
                                    <span>{formatTime(currentTime)}</span> / <span>{formatTime(duration)}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={toggleLoop} className={`p-1.5 rounded-full hover:bg-white/20 transition-colors ${isLooping ? 'text-indigo-400' : ''}`}>
                                    <LoopIcon />
                                </button>
                                <button onClick={toggleFullScreen} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
                                    {isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

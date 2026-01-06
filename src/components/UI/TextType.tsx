
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ElementType, useEffect, useState, createElement, useRef, useCallback } from 'react';

interface TextTypeProps {
  className?: string;
  showCursor?: boolean;
  cursorCharacter?: string | React.ReactNode;
  cursorBlinkDuration?: number;
  cursorClassName?: string;
  text: string[] | string;
  as?: ElementType;
  typingSpeed?: number;
  initialDelay?: number;
  pauseDuration?: number;
  deletingSpeed?: number;
  loop?: boolean;
  onSequenceComplete?: () => void;
}

// Generates a random delay within a range for a more human-like typing feel.
const getTypingDelay = (baseSpeed: number, jitter = 0.4): number => {
  return baseSpeed + (Math.random() - 0.5) * baseSpeed * jitter;
};

export const TextType = ({
  text,
  as: Component = 'span',
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 1500,
  deletingSpeed = 30,
  loop = false,
  className = '',
  showCursor = true,
  cursorCharacter = '|',
  cursorClassName = '',
  cursorBlinkDuration = 0.5,
  onSequenceComplete,
  ...props
}: TextTypeProps & React.HTMLAttributes<HTMLElement>) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isCursorVisible, setIsCursorVisible] = useState(true);

  // Refs to maintain state logic without triggering re-renders
  const stateRef = useRef({
    phase: 'initial' as 'initial' | 'typing' | 'pausing' | 'deleting',
    sequenceIndex: 0,
    currentText: '',
    textArray: Array.isArray(text) ? text : [text],
    timeoutId: null as number | null,
  });

  // Keep props in refs to access fresh values inside timeout closures
  const propsRef = useRef({ typingSpeed, deletingSpeed, initialDelay, pauseDuration, loop, onSequenceComplete });
  useEffect(() => {
      propsRef.current = { typingSpeed, deletingSpeed, initialDelay, pauseDuration, loop, onSequenceComplete };
  }, [typingSpeed, deletingSpeed, initialDelay, pauseDuration, loop, onSequenceComplete]);

  // CRITICAL OPTIMIZATION: Abort any pending updates immediately if text prop changes.
  useEffect(() => {
    const newState = stateRef.current;
    newState.textArray = Array.isArray(text) ? text : [text];
    
    // Reset logic: If the prop changed, kill the current loop and restart fresh.
    if (newState.timeoutId) window.clearTimeout(newState.timeoutId);
    
    newState.phase = 'initial';
    newState.sequenceIndex = 0;
    newState.currentText = '';
    setDisplayedText('');
    
    // Kick off the new loop immediately
    runLoop();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);


  const runLoop = useCallback(() => {
    const state = stateRef.current;
    const p = propsRef.current;

    const currentTarget = state.textArray[state.sequenceIndex] || '';
    let delay = 0;

    // Safety check
    if (state.textArray.length === 0) return;

    switch (state.phase) {
      case 'initial':
        state.phase = 'typing';
        delay = p.initialDelay;
        break;

      case 'typing':
        if (state.currentText.length < currentTarget.length) {
          const nextChar = currentTarget[state.currentText.length];
          state.currentText += nextChar;
          
          setDisplayedText(state.currentText);

          // Add a longer pause after spaces or punctuation for realism
          const isWordEnd = nextChar === ' ' || nextChar === ',' || nextChar === '.';
          delay = getTypingDelay(isWordEnd ? p.typingSpeed * 3 : p.typingSpeed);
        } else {
          state.phase = 'pausing';
          delay = 0; // Immediate transition
        }
        break;

      case 'pausing':
        const isLastItem = state.sequenceIndex === state.textArray.length - 1;
        if (!isLastItem || p.loop) {
          state.phase = 'deleting';
          delay = p.pauseDuration;
        } else {
          // Sequence complete
          if (p.onSequenceComplete) p.onSequenceComplete();
          return; // Stop the loop
        }
        break;

      case 'deleting':
        if (state.currentText.length > 0) {
          state.currentText = state.currentText.slice(0, -1);
          setDisplayedText(state.currentText);
          delay = getTypingDelay(p.deletingSpeed, 0.6);
        } else {
          // Finished deleting
          const nextIndex = state.sequenceIndex + 1;
          if (nextIndex < state.textArray.length) {
            state.sequenceIndex = nextIndex;
            state.phase = 'typing';
          } else if (p.loop) {
            state.sequenceIndex = 0;
            state.phase = 'typing';
          } else {
             if (p.onSequenceComplete) p.onSequenceComplete();
             return;
          }
          delay = p.typingSpeed;
        }
        break;
    }

    state.timeoutId = window.setTimeout(runLoop, delay);
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (stateRef.current.timeoutId) {
        window.clearTimeout(stateRef.current.timeoutId);
      }
    };
  }, []);

  // Cursor blink effect
  useEffect(() => {
      if (!showCursor) return;
      const interval = setInterval(() => {
          setIsCursorVisible(v => !v);
      }, cursorBlinkDuration * 1000);
      
      return () => clearInterval(interval);
  }, [showCursor, cursorBlinkDuration]);

  return createElement(
    Component,
    { className: `inline-block whitespace-pre-wrap ${className}`, ...props },
    <span className="inline">{displayedText}</span>,
    showCursor && (
      <span
        className={`ml-px inline-block whitespace-nowrap ${cursorClassName}`}
        style={{ opacity: isCursorVisible ? 1 : 0, transition: 'opacity 0.1s' }}
        aria-hidden="true"
      >
        {cursorCharacter}
      </span>
    )
  );
};

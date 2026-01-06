/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Automatically reset error state if children change (e.g., due to HMR, code edits, or parent re-render)
    if (this.state.hasError && this.props.children !== prevProps.children) {
      this.setState({ hasError: false, error: null });
    }
  }

  private handleReload = async () => {
    // Attempt to unregister service workers before reloading to fix potential cache issues
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));
      }
    } catch (e) {
      console.warn('Failed to unregister service workers during reload:', e);
    } finally {
      // Always reload, even if SW cleanup fails
      window.location.reload();
    }
  };

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex items-center justify-center bg-page p-4 text-center z-[9999]">
          <div className="bg-white dark:bg-layer-1 p-8 rounded-2xl shadow-xl border border-border max-w-md w-full">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4 text-red-600 dark:text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-content-primary mb-2">Something went wrong</h2>
            <p className="text-content-secondary mb-6 text-xs font-mono break-words bg-slate-100 dark:bg-black/20 p-2 rounded">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <div className="flex flex-col gap-3">
                <button
                  onClick={this.handleDismiss}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors shadow-sm w-full"
                >
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-content-primary rounded-xl font-semibold transition-colors w-full"
                >
                  Reload App
                </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
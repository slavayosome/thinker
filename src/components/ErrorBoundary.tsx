'use client';

import React, { Component, ReactNode } from 'react';
import { AppError, createError, logError, getErrorIcon, getErrorTitle } from '@/lib/errorUtils';

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  errorInfo: any;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: AppError, retry: () => void) => ReactNode;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Convert the React error to our AppError format
    const appError = createError(
      'unknown',
      error.message || 'A rendering error occurred',
      'React component error boundary triggered',
      true
    );

    return {
      hasError: true,
      error: appError
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log the error with detailed information
    const appError = createError(
      'unknown',
      error.message || 'A rendering error occurred',
      `Component stack: ${errorInfo.componentStack}`,
      true
    );

    logError(appError, 'ErrorBoundary', { originalError: error, errorInfo });

    this.setState({
      errorInfo
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full border-l-4 border-red-500">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getErrorIcon(this.state.error.type, this.state.error.subtype)} />
                </svg>
              </div>
              
              <div className="ml-3 flex-1">
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {getErrorTitle(this.state.error.type, this.state.error.subtype) || 'Something went wrong'}
                </h1>
                <p className="text-gray-700 mb-4">
                  {this.state.error.message}
                </p>
                <p className="text-sm text-gray-600 mb-6">
                  The application encountered an unexpected error. This has been logged and will be investigated.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={this.handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-red-300 shadow-sm text-sm font-medium rounded-md text-red-700 bg-red-50 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                  
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Reload Page
                  </button>
                </div>
                
                {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                  <details className="mt-4">
                    <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                      Show error details (development only)
                    </summary>
                    <pre className="mt-2 text-xs text-gray-600 bg-gray-50 p-3 rounded overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 
import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, LogOut } from 'lucide-react';
import { resetTenant } from '../../lib/supabase';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetAndHome = () => {
    try {
      resetTenant();
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    window.location.href = '/';
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 text-gray-900">
          <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center space-y-6">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100 shadow-sm">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Something went wrong</h2>
              <p className="text-sm text-gray-500 leading-relaxed">
                An unexpected interface error occurred. You can reload the page or return to the landing portal.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-50 border border-gray-200/80 rounded-xl p-3.5 text-left overflow-hidden">
                <p className="text-xs font-mono text-red-600 break-words font-semibold">
                  {this.state.error.message || 'Unknown runtime error'}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-[#FF5900] hover:bg-[#e04f00] text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-[#FF5900]/20 cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Reload Page</span>
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-sm transition-all cursor-pointer"
              >
                <Home size={16} />
                <span>Go to Home</span>
              </button>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={this.handleResetAndHome}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <LogOut size={12} />
                <span>Clear cached tenant session & reset</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Shared';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Explicitly defining props is usually not required with proper generic inheritance,
  // but to satisfy strict checks we can declare it.
  public props: ErrorBoundaryProps;
  
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500">
              <AlertTriangle className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">系統發生錯誤</h1>
            <p className="text-slate-500 mb-6">
              很抱歉，應用程式遇到未預期的問題。<br/>
              請嘗試重新整理頁面。
            </p>
            <div className="bg-slate-100 p-4 rounded-lg mb-6 text-left overflow-auto max-h-40">
               <code className="text-xs text-slate-600 font-mono">
                 {this.state.error?.message || 'Unknown Error'}
               </code>
            </div>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full justify-center"
            >
              <RefreshCw className="w-4 h-4" /> 重新載入
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
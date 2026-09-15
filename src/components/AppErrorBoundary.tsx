import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message?: string }

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };
  static getDerivedStateFromError(error: Error): State { return { hasError: true, message: error.message }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('[App] Unhandled UI error', { error, componentStack: info.componentStack }); }
  render() {
    if (!this.state.hasError) return this.props.children;
    return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6"><section className="max-w-md w-full rounded-2xl bg-white border border-slate-200 shadow-sm p-8 text-center"><h1 className="text-xl font-semibold text-slate-900">O sistema encontrou um erro</h1><p className="mt-3 text-sm text-slate-600">Atualize a página para tentar carregar o módulo novamente.</p>{import.meta.env.DEV && this.state.message && <pre className="mt-4 text-left text-xs text-red-700 bg-red-50 rounded-lg p-3 overflow-auto">{this.state.message}</pre>}<button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">Atualizar página</button></section></main>;
  }
}

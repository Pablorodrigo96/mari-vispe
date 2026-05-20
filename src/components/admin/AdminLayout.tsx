import React, { Suspense } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { ContentLoader } from '@/components/layout/RouteLoader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class AdminErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[AdminLayout] runtime error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 max-w-3xl">
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 p-6">
            <h2 className="text-xl font-semibold text-red-200 mb-2">
              Erro ao renderizar área admin
            </h2>
            <p className="text-sm text-red-100/80 mb-4 break-words">
              {this.state.error.message}
            </p>
            <pre className="text-xs text-red-100/60 whitespace-pre-wrap break-words max-h-96 overflow-auto">
              {this.state.error.stack}
            </pre>
            <button
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-4 py-2 rounded bg-red-500/20 hover:bg-red-500/30 text-red-100 text-sm"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      );
    }
    return <>{this.props.children}</>;
  }
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen flex bg-background">
      <AdminSidebar />
      <main className="flex-1 p-8 overflow-auto">
        <AdminErrorBoundary>
          <Suspense fallback={<ContentLoader />}>
            {children}
          </Suspense>
        </AdminErrorBoundary>
      </main>
    </div>
  );
}

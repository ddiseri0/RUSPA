import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in RUSPA:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-[#1C1C1E] border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-300 font-bold mb-4">
              !
            </div>
            <h2 className="text-xl font-medium text-white mb-2">Qualcosa è andato storto</h2>
            <p className="text-xs text-zinc-400 mb-6 font-mono bg-zinc-900 p-3 rounded-xl w-full overflow-x-auto text-left">
              {this.state.error?.message || 'Errore imprevisto'}
            </p>
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-3 rounded-full bg-white text-black font-semibold text-xs uppercase tracking-wider hover:bg-zinc-200 transition-all shadow-lg"
            >
              Riavvia Partita
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

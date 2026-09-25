import React, { useState, useEffect } from 'react';
import { WebMcpStatus } from '../lib/webMcpBridge';

export const McpDebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<WebMcpStatus | null>(null);
  const [testLog, setTestLog] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const update = () => {
      if (window.__RUSPA_MCP__) {
        setStatus(window.__RUSPA_MCP__.getStatus());
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRunTest = async () => {
    if (!window.__RUSPA_MCP__) return;
    setIsRunning(true);
    setTestLog('Esecuzione test in corso...');
    try {
      const res = await window.__RUSPA_MCP__.runAutomatedSimulation();
      setTestLog(
        JSON.stringify(
          {
            esito: res.success ? 'PASSATO' : 'FALLITO',
            riassunto: res.summary,
            passaggi: res.steps,
          },
          null,
          2
        )
      );
    } catch (e: any) {
      setTestLog('Errore test: ' + e.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!window.__RUSPA_MCP__) return;
    await window.__RUSPA_MCP__.createRoom('1v1');
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] select-none font-sans text-xs">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-zinc-900/90 border border-zinc-700/80 text-zinc-300 hover:text-white hover:border-zinc-500 shadow-xl backdrop-blur-md transition-all active:scale-95"
          title="Apri WebMCP Test Bridge"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-mono font-medium tracking-wide">WebMCP Active</span>
        </button>
      ) : (
        <div className="w-80 sm:w-96 bg-[#18181B] border border-zinc-700 rounded-3xl p-5 shadow-2xl backdrop-blur-xl text-white flex flex-col gap-3 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-sm">WebMCP Agent Bridge</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white text-xs px-2 py-0.5 rounded-full hover:bg-zinc-800"
            >
              Chiudi ✕
            </button>
          </div>

          {/* Status info */}
          <div className="bg-zinc-900/80 border border-zinc-800 p-3 rounded-2xl flex flex-col gap-1 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-zinc-500">Schermata:</span>
              <span className="text-emerald-400 font-bold">{status?.currentScreen || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Giocatore:</span>
              <span className="text-zinc-200">{status?.playerName || 'N/A'}</span>
            </div>
            {status?.currentRoom && (
              <>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Codice Stanza:</span>
                  <span className="text-amber-400 font-bold">{status.currentRoom.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Fase Gioco:</span>
                  <span className="text-zinc-200">{status.currentRoom.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Giocatori Connessi:</span>
                  <span className="text-zinc-200">{status.currentRoom.playersCount}</span>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRunTest}
              disabled={isRunning}
              className="flex-1 py-2 px-3 rounded-xl bg-white text-black font-semibold text-xs hover:bg-zinc-200 active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {isRunning ? 'Esecuzione...' : '▶ Esegui Test Regole'}
            </button>
            {!status?.currentRoom && (
              <button
                onClick={handleQuickCreate}
                className="py-2 px-3 rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700 active:scale-95 transition-all"
              >
                Crea Stanza
              </button>
            )}
          </div>

          {/* Test Log Display */}
          {testLog && (
            <div className="mt-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                  Report Test
                </span>
                <button
                  onClick={() => setTestLog(null)}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  Pulisci
                </button>
              </div>
              <pre className="max-h-40 overflow-y-auto bg-black/80 border border-zinc-800 p-2.5 rounded-xl text-[10px] font-mono text-emerald-300 leading-tight">
                {testLog}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

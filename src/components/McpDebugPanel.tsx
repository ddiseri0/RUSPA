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
    <div className="fixed top-2.5 left-14 sm:top-auto sm:left-auto sm:bottom-4 sm:right-4 z-[9999] select-none font-sans text-xs">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#262626]/90 border border-[#383838] text-[#d9d9d9] hover:text-[#f2f2f2] hover:border-[#f2f2f2]/40 shadow-xl backdrop-blur-md transition-all active:scale-95"
          title="Apri WebMCP Test Bridge"
        >
          <span className="w-2 h-2 rounded-full bg-[#f2f2f2] animate-pulse" />
          <span className="font-mono font-medium tracking-wide">WebMCP Active</span>
        </button>
      ) : (
        <div className="w-80 sm:w-96 bg-[#262626] border border-[#383838] rounded-3xl p-5 shadow-2xl backdrop-blur-xl text-[#f2f2f2] flex flex-col gap-3 animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#383838] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f2f2f2] animate-pulse" />
              <span className="font-semibold text-sm">WebMCP Agent Bridge</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#d9d9d9] hover:text-[#f2f2f2] text-xs px-2 py-0.5 rounded-full hover:bg-[#383838]"
            >
              Chiudi ✕
            </button>
          </div>

          {/* Status info */}
          <div className="bg-[#000000]/70 border border-[#383838] p-3 rounded-2xl flex flex-col gap-1 text-[11px] font-mono">
            <div className="flex justify-between">
              <span className="text-[#d9d9d9]">Schermata:</span>
              <span className="text-[#f2f2f2] font-bold">{status?.currentScreen || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#d9d9d9]">Giocatore:</span>
              <span className="text-[#f2f2f2]">{status?.playerName || 'N/A'}</span>
            </div>
            {status?.currentRoom && (
              <>
                <div className="flex justify-between">
                  <span className="text-[#d9d9d9]">Codice Stanza:</span>
                  <span className="text-[#f2f2f2] font-bold">{status.currentRoom.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#d9d9d9]">Fase Gioco:</span>
                  <span className="text-[#f2f2f2]">{status.currentRoom.phase}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#d9d9d9]">Giocatori Connessi:</span>
                  <span className="text-[#f2f2f2]">{status.currentRoom.playersCount}</span>
                </div>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleRunTest}
              disabled={isRunning}
              className="flex-1 py-2 px-3 rounded-xl bg-[#f2f2f2] text-[#000000] font-semibold text-xs hover:bg-[#e6e6e6] active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {isRunning ? 'Esecuzione...' : '▶ Esegui Test Regole'}
            </button>
            {!status?.currentRoom && (
              <button
                onClick={handleQuickCreate}
                className="py-2 px-3 rounded-xl bg-[#000000] text-[#f2f2f2] border border-[#383838] hover:bg-[#1a1a1a] active:scale-95 transition-all"
              >
                Crea Stanza
              </button>
            )}
          </div>

          {/* Test Log Display */}
          {testLog && (
            <div className="mt-1">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-[#d9d9d9] uppercase tracking-wider">
                  Report Test
                </span>
                <button
                  onClick={() => setTestLog(null)}
                  className="text-[10px] text-[#d9d9d9] hover:text-[#f2f2f2]"
                >
                  Pulisci
                </button>
              </div>
              <pre className="max-h-40 overflow-y-auto bg-[#000000]/90 border border-[#383838] p-2.5 rounded-xl text-[10px] font-mono text-[#f2f2f2] leading-tight">
                {testLog}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

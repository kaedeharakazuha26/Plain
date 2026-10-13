import React from 'react';
import {
  Terminal as TerminalIcon,
  AlertTriangle,
  Layers,
  Cpu,
  Database,
  ChevronDown,
  ChevronUp,
  X,
  FileCode,
  TerminalSquare
} from 'lucide-react';

import RealTerminal from './RealTerminal';
import ConsoleOutput from './ConsoleOutput';
import AstViewer from './AstViewer';
import TokenViewer from './TokenViewer';
import VariablesInspector from './VariablesInspector';

export default function VsBottomDock({
  activeTab,
  setActiveTab,
  result,
  onClear,
  onClose,
  dockHeight,
  setDockHeight,
  onInputSubmit,
  onResetSession,
  activeFile,
  activeCode,
  files,
  onSelectFile,
  onDeleteFile
}) {
  const isExpanded = dockHeight > 250;

  const toggleHeight = () => {
    setDockHeight(isExpanded ? 220 : 420);
  };

  const errorCount = result.error ? 1 : 0;
  const outputCount = result.output?.length || 0;
  const tokenCount = result.tokens?.length || 0;
  const astCount = result.ast?.length || 0;
  const varCount = Object.keys(result.variables || {}).length;

  return (
    <div className="vs-bottom-dock" style={{ height: `${dockHeight}px` }}>
      <div className="bottom-dock-header">
        <div className="dock-tabs">
          <button
            className={`dock-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
            onClick={() => setActiveTab('terminal')}
            title="Real interactive shell terminal"
          >
            <TerminalIcon size={13} color="var(--accent-cyan)" />
            <span>Terminal</span>
          </button>

          <button
            className={`dock-tab-btn ${activeTab === 'output' ? 'active' : ''}`}
            onClick={() => setActiveTab('output')}
            title="Compiler execution log"
          >
            <TerminalSquare size={13} />
            <span>Output</span>
            {outputCount > 0 && <span className="dock-tab-badge">{outputCount}</span>}
          </button>

          <button
            className={`dock-tab-btn ${activeTab === 'problems' ? 'active' : ''}`}
            onClick={() => setActiveTab('problems')}
          >
            <AlertTriangle size={13} color={errorCount > 0 ? 'var(--accent-rose)' : 'inherit'} />
            <span>Problems</span>
            {errorCount > 0 && (
              <span className="dock-tab-badge" style={{ background: 'var(--accent-rose)', color: '#fff' }}>
                {errorCount}
              </span>
            )}
          </button>

          <button
            className={`dock-tab-btn ${activeTab === 'ast' ? 'active' : ''}`}
            onClick={() => setActiveTab('ast')}
          >
            <Layers size={13} />
            <span>AST Tree</span>
            {astCount > 0 && <span className="dock-tab-badge">{astCount}</span>}
          </button>

          <button
            className={`dock-tab-btn ${activeTab === 'tokens' ? 'active' : ''}`}
            onClick={() => setActiveTab('tokens')}
          >
            <Cpu size={13} />
            <span>Tokens</span>
            {tokenCount > 0 && <span className="dock-tab-badge">{tokenCount}</span>}
          </button>

          <button
            className={`dock-tab-btn ${activeTab === 'variables' ? 'active' : ''}`}
            onClick={() => setActiveTab('variables')}
          >
            <Database size={13} />
            <span>Variables</span>
            {varCount > 0 && <span className="dock-tab-badge">{varCount}</span>}
          </button>
        </div>

        <div className="dock-actions">
          <button
            className="dock-action-btn"
            onClick={toggleHeight}
            title={isExpanded ? 'Restore Panel Size' : 'Maximize Panel'}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>

          <button
            className="dock-action-btn"
            onClick={onClose}
            title="Close Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="dock-body" style={{ padding: activeTab === 'terminal' ? 0 : '12px' }}>
        {activeTab === 'terminal' && (
          <RealTerminal
            activeFile={activeFile}
            activeCode={activeCode}
            files={files}
            onFileSelect={onSelectFile}
            onFileDelete={onDeleteFile}
          />
        )}

        {activeTab === 'output' && (
          <ConsoleOutput
            output={result.output}
            error={result.error}
            success={result.success}
            executionTimeMs={result.executionTimeMs}
            engine={result.engine}
            waitingForInput={result.waiting_for_input}
            onInputSubmit={onInputSubmit}
            onClear={onClear}
            onResetSession={onResetSession}
          />
        )}

        {activeTab === 'problems' && (
          <div>
            {result.error ? (
              <div className="error-banner">
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} color="var(--accent-rose)" />
                  <span>Compiler Diagnostic</span>
                </div>
                <div style={{ fontFamily: 'var(--font-code)', marginTop: '4px' }}>
                  {result.error}
                </div>
              </div>
            ) : (
              <div style={{ color: 'var(--text-dim)', fontSize: '12px', padding: '16px 0', textAlign: 'center' }}>
                No problems have been detected in the current workspace.
              </div>
            )}
          </div>
        )}

        {activeTab === 'ast' && (
          <AstViewer ast={result.ast} />
        )}

        {activeTab === 'tokens' && (
          <TokenViewer tokens={result.tokens} />
        )}

        {activeTab === 'variables' && (
          <VariablesInspector variables={result.variables} />
        )}
      </div>
    </div>
  );
}

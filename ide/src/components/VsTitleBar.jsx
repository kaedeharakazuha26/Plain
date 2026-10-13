import React from 'react';
import {
  Play,
  RotateCcw,
  Zap,
  Terminal,
  PanelRight,
  Sparkles,
  Search,
  Layout,
  CheckCircle,
  Cpu
} from 'lucide-react';

export default function VsTitleBar({
  activeFile,
  isRunning,
  onRun,
  autoRun,
  setAutoRun,
  engineMode,
  setEngineMode,
  toggleBottomDock,
  bottomDockOpen,
  toggleRightSidebar,
  rightSidebarOpen
}) {
  return (
    <header className="vs-titlebar">
      <div className="titlebar-left">
        <div className="titlebar-brand">
          <div className="titlebar-logo-icon">P</div>
          <span>Plain IDE</span>
        </div>

        <nav className="titlebar-menu">
          <span className="menu-item">File</span>
          <span className="menu-item">Edit</span>
          <span className="menu-item">Selection</span>
          <span className="menu-item" onClick={onRun}>Run</span>
          <span className="menu-item" onClick={toggleBottomDock}>Terminal</span>
          <span className="menu-item" onClick={toggleRightSidebar}>Guide</span>
        </nav>
      </div>

      <div className="titlebar-center" title="Quick Open (Ctrl + P)">
        <Search size={12} />
        <span>plain-lang — {activeFile?.name || 'hello.plain'}</span>
      </div>

      <div className="titlebar-right">
        {/* Auto-Run Toggle */}
        <button
          className={`btn-icon-toggle ${autoRun ? 'active' : ''}`}
          onClick={() => setAutoRun(!autoRun)}
          title="Auto-run code as you type"
        >
          <Zap size={13} color={autoRun ? 'var(--accent-cyan)' : 'inherit'} />
          <span>Auto-Run</span>
        </button>

        {/* Engine mode switcher */}
        <button
          className="btn-icon-toggle"
          onClick={() => setEngineMode(prev => prev === 'rust' ? 'sim' : 'rust')}
          title="Toggle between Rust Native Binary and Web Simulator"
          style={{ color: engineMode === 'rust' ? '#34d399' : '#fbbf24' }}
        >
          <Cpu size={13} />
          <span>{engineMode === 'rust' ? '🦀 Rust Engine' : '⚡ Web Simulator'}</span>
        </button>

        {/* Primary Run Code Button */}
        <button
          className={`btn-run-code ${isRunning ? 'running' : ''}`}
          onClick={onRun}
          disabled={isRunning}
          title="Execute Plain language code (Ctrl + Enter)"
        >
          <Play size={12} fill="currentColor" />
          <span>{isRunning ? 'Running...' : 'Run Code'}</span>
        </button>

        {/* Toggle Bottom Terminal */}
        <button
          className={`btn-icon-toggle ${bottomDockOpen ? 'active' : ''}`}
          onClick={toggleBottomDock}
          title="Toggle Terminal / Output Panel"
        >
          <Terminal size={14} />
        </button>

        {/* Toggle Right Guide */}
        <button
          className={`btn-icon-toggle ${rightSidebarOpen ? 'active' : ''}`}
          onClick={toggleRightSidebar}
          title="Toggle English Reference / Assistant"
        >
          <PanelRight size={14} />
        </button>
      </div>
    </header>
  );
}

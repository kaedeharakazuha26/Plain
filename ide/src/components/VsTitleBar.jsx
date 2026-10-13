import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Zap,
  Terminal,
  PanelRight,
  Search,
  FilePlus,
  FolderOpen,
  Folder,
  Save,
  X,
  Trash2,
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
  rightSidebarOpen,
  onNewFile,
  onOpenFile,
  onOpenFolder,
  onSaveFile,
  onSaveAs,
  onCloseFile,
  onDeleteFile,
  folderName = 'workspace'
}) {
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const fileMenuRef = useRef(null);

  // Close dropdown menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target)) {
        setFileMenuOpen(false);
      }
    };
    if (fileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fileMenuOpen]);

  return (
    <header className="vs-titlebar">
      <div className="titlebar-left">
        <div className="titlebar-brand">
          <div className="titlebar-logo-icon">P</div>
          <span>Plain IDE</span>
        </div>

        <nav className="titlebar-menu">
          {/* FILE MENU DROPDOWN */}
          <div className="menu-dropdown-wrapper" ref={fileMenuRef}>
            <span
              className={`menu-item ${fileMenuOpen ? 'active' : ''}`}
              onClick={() => setFileMenuOpen(!fileMenuOpen)}
            >
              File
            </span>

            {fileMenuOpen && (
              <div className="titlebar-dropdown-menu">
                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setFileMenuOpen(false);
                    onNewFile();
                  }}
                >
                  <FilePlus size={13} color="var(--accent-cyan)" />
                  <span>New File (.plain)</span>
                  <span className="dropdown-shortcut">Ctrl+N</span>
                </button>

                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setFileMenuOpen(false);
                    onOpenFile();
                  }}
                >
                  <FolderOpen size={13} color="var(--accent-amber)" />
                  <span>Open File...</span>
                  <span className="dropdown-shortcut">Ctrl+O</span>
                </button>

                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setFileMenuOpen(false);
                    onOpenFolder();
                  }}
                >
                  <Folder size={13} color="#f59e0b" />
                  <span>Open Folder...</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setFileMenuOpen(false);
                    onSaveFile();
                  }}
                >
                  <Save size={13} color="var(--accent-emerald)" />
                  <span>Save</span>
                  <span className="dropdown-shortcut">Ctrl+S</span>
                </button>

                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setFileMenuOpen(false);
                    onSaveAs();
                  }}
                >
                  <Save size={13} color="#34d399" />
                  <span>Save As...</span>
                  <span className="dropdown-shortcut">Ctrl+Shift+S</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  className="dropdown-menu-item"
                  onClick={() => {
                    setFileMenuOpen(false);
                    onCloseFile();
                  }}
                >
                  <X size={13} />
                  <span>Close File Tab</span>
                  <span className="dropdown-shortcut">Ctrl+W</span>
                </button>

                {onDeleteFile && activeFile && (
                  <button
                    className="dropdown-menu-item"
                    onClick={() => {
                      setFileMenuOpen(false);
                      if (window.confirm(`Are you sure you want to delete ${activeFile.name}?`)) {
                        onDeleteFile(activeFile.id);
                      }
                    }}
                    style={{ color: 'var(--accent-rose)' }}
                  >
                    <Trash2 size={13} color="var(--accent-rose)" />
                    <span>Delete File</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <span className="menu-item" onClick={onRun}>Run</span>
          <span className="menu-item" onClick={toggleBottomDock}>Terminal</span>
          <span className="menu-item" onClick={toggleRightSidebar}>Guide</span>
        </nav>
      </div>

      <div className="titlebar-center" title="Current Active File">
        <Search size={12} />
        <span>{folderName} — {activeFile?.name || 'untitled.plain'}</span>
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
          title="Toggle Terminal Panel"
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

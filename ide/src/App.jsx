import React, { useState, useEffect, useRef, useCallback } from 'react';
import VsTitleBar from './components/VsTitleBar';
import VsActivityBar from './components/VsActivityBar';
import VsSidebar from './components/VsSidebar';
import VsEditorTabs from './components/VsEditorTabs';
import Editor from './components/Editor';
import VsBottomDock from './components/VsBottomDock';
import VsRightSidebar from './components/VsRightSidebar';
import VsStatusBar from './components/VsStatusBar';

import { EXAMPLES } from './examples';
import { runSimulator } from './simulator';

// Initial files in workspace
const INITIAL_FILES = EXAMPLES.map(ex => ({
  id: ex.id,
  name: `${ex.id}.plain`,
  code: ex.code,
  category: 'examples'
}));

export default function App() {
  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem('plain_ide_files');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_FILES;
  });

  const [openFileIds, setOpenFileIds] = useState(() => {
    return [INITIAL_FILES[0].id, INITIAL_FILES[1].id];
  });

  const [activeFileId, setActiveFileId] = useState(INITIAL_FILES[0].id);

  // Layout UI Toggles & Resizable Dimensions
  const [activeActivityView, setActiveActivityView] = useState('explorer'); // 'explorer' | 'guide' | null
  const [bottomDockOpen, setBottomDockOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [dockTab, setDockTab] = useState('terminal'); // 'terminal' | 'problems' | 'ast' | 'tokens' | 'variables'

  // Resizable Panes State
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);
  const [dockHeight, setDockHeight] = useState(250);

  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);
  const isResizingBottom = useRef(false);

  // Execution & Engine State
  const [isRunning, setIsRunning] = useState(false);
  const [autoRun, setAutoRun] = useState(false);
  const [engineMode, setEngineMode] = useState('rust'); // 'rust' | 'sim'
  const [rustAvailable, setRustAvailable] = useState(true);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [sessionInputs, setSessionInputs] = useState([]);

  const [result, setResult] = useState({
    success: true,
    output: [],
    tokens: [],
    ast: [],
    variables: {},
    error: null,
    waiting_for_input: null,
    executionTimeMs: null,
    engine: 'rust-native'
  });

  // Global mousemove and mouseup listeners for resizing sidebars and dock
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingLeft.current) {
        // Left sidebar starts after 48px activity bar
        const newWidth = Math.max(160, Math.min(520, e.clientX - 48));
        setSidebarWidth(newWidth);
      } else if (isResizingRight.current) {
        // Right sidebar width is distance from right window edge
        const newWidth = Math.max(220, Math.min(650, window.innerWidth - e.clientX));
        setRightSidebarWidth(newWidth);
      } else if (isResizingBottom.current) {
        // Bottom dock height is distance from bottom window edge minus status bar (24px)
        const newHeight = Math.max(110, Math.min(600, window.innerHeight - e.clientY - 24));
        setDockHeight(newHeight);
      }
    };

    const handleMouseUp = () => {
      if (isResizingLeft.current || isResizingRight.current || isResizingBottom.current) {
        isResizingLeft.current = false;
        isResizingRight.current = false;
        isResizingBottom.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResizeLeft = (e) => {
    e.preventDefault();
    isResizingLeft.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const startResizeRight = (e) => {
    e.preventDefault();
    isResizingRight.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const startResizeBottom = (e) => {
    e.preventDefault();
    isResizingBottom.current = true;
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
  };

  // Save files to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('plain_ide_files', JSON.stringify(files));
    } catch {}
  }, [files]);

  // Current active file
  const activeFile = files.find(f => f.id === activeFileId) || files[0];
  const activeCode = activeFile ? activeFile.code : '';

  // Check Rust backend health
  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setRustAvailable(true);
          setEngineMode('rust');
        } else {
          setRustAvailable(false);
          setEngineMode('sim');
        }
      })
      .catch(() => {
        setRustAvailable(false);
        setEngineMode('sim');
      });
  }, []);

  // Parse error line number
  const extractErrorLine = (errStr) => {
    if (!errStr) return null;
    const match = errStr.match(/Line\s+(\d+)/i) || errStr.match(/line\s+(\d+)/i);
    return match ? parseInt(match[1], 10) : null;
  };
  const errorLine = extractErrorLine(result.error);

  // Execute Code via Tauri, Rust HTTP API, or Simulator
  const executeCode = useCallback(async (codeToRun, inputs = sessionInputs) => {
    setIsRunning(true);
    const startTime = performance.now();

    // Check if running inside a Tauri desktop app
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const data = await invoke('run_plain', { code: codeToRun, inputs });
        setResult({
          success: data.success,
          output: data.output || [],
          tokens: data.tokens || [],
          ast: data.ast || [],
          variables: data.variables || {},
          error: data.error || null,
          waiting_for_input: data.waiting_for_input || null,
          executionTimeMs: data.executionTimeMs || Math.round((performance.now() - startTime) * 100) / 100,
          engine: 'tauri-desktop'
        });
        if (!data.success && data.error) setBottomDockOpen(true);
        setIsRunning(false);
        return;
      } catch (err) {
        console.warn('Tauri invoke failed, falling back:', err);
      }
    }

    if (engineMode === 'rust' && rustAvailable) {
      try {
        const response = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: codeToRun, inputs })
        });

        const data = await response.json();
        setResult({
          success: data.success,
          output: data.output || [],
          tokens: data.tokens || [],
          ast: data.ast || [],
          variables: data.variables || {},
          error: data.error || null,
          waiting_for_input: data.waiting_for_input || null,
          executionTimeMs: data.executionTimeMs || Math.round((performance.now() - startTime) * 100) / 100,
          engine: 'rust-native'
        });

        // If error or waiting for input, ensure dock is open
        if ((!data.success && data.error) || data.waiting_for_input) {
          setBottomDockOpen(true);
          setDockTab('terminal');
        }
      } catch (err) {
        console.warn('Rust backend error, falling back to simulator:', err);
        const simResult = runSimulator(codeToRun, inputs);
        setResult({ ...simResult, engine: 'js-simulator' });
      }
    } else {
      const simResult = runSimulator(codeToRun, inputs);
      setResult(simResult);
    }

    setIsRunning(false);
  }, [engineMode, rustAvailable, sessionInputs]);

  // Run initial active code on mount
  useEffect(() => {
    if (activeCode) {
      executeCode(activeCode, []);
    }
  }, []);

  // Run fresh code (clears previous session inputs)
  const handleRunFresh = () => {
    setSessionInputs([]);
    executeCode(activeCode, []);
  };

  // Handle Terminal Interactive Input
  const handleTerminalInput = (inputValue) => {
    const nextInputs = [...sessionInputs, inputValue];
    setSessionInputs(nextInputs);
    executeCode(activeCode, nextInputs);
  };

  // Restart terminal session
  const handleResetSession = () => {
    setSessionInputs([]);
    executeCode(activeCode, []);
  };

  // Handle Code Changes in Active File
  const autoRunTimer = useRef(null);
  const handleCodeChange = (newCode) => {
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, code: newCode } : f));

    if (autoRun) {
      if (autoRunTimer.current) clearTimeout(autoRunTimer.current);
      autoRunTimer.current = setTimeout(() => {
        setSessionInputs([]);
        executeCode(newCode, []);
      }, 500);
    }
  };

  // File Operations
  const handleSelectFile = (id) => {
    setActiveFileId(id);
    if (!openFileIds.includes(id)) {
      setOpenFileIds(prev => [...prev, id]);
    }
    const targetFile = files.find(f => f.id === id);
    if (targetFile) {
      setSessionInputs([]);
      executeCode(targetFile.code, []);
    }
  };

  const handleCloseFile = (id) => {
    const nextOpen = openFileIds.filter(fId => fId !== id);
    setOpenFileIds(nextOpen);
    if (activeFileId === id && nextOpen.length > 0) {
      setActiveFileId(nextOpen[nextOpen.length - 1]);
    }
  };

  const handleCreateFile = (filename) => {
    let finalName = filename.trim();
    if (!finalName.endsWith('.plain')) finalName += '.plain';
    const id = finalName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const newFile = {
      id,
      name: finalName,
      code: `# ${finalName}\n# Write Plain English code here:\n\nask user_name with "What is your name?"\nsay "Hello, " + user_name\n`,
      category: 'workspace'
    };
    setFiles(prev => [...prev, newFile]);
    setOpenFileIds(prev => [...prev, id]);
    setActiveFileId(id);
    setSessionInputs([]);
    executeCode(newFile.code, []);
  };

  const handleDeleteFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    handleCloseFile(id);
  };

  const handleInsertSnippet = (snippet) => {
    handleCodeChange(activeCode + '\n' + snippet);
  };

  const handleClearConsole = () => {
    setResult(prev => ({
      ...prev,
      output: [],
      error: null,
      waiting_for_input: null
    }));
    setSessionInputs([]);
  };

  return (
    <>
      {/* 1. TOP TITLEBAR */}
      <VsTitleBar
        activeFile={activeFile}
        isRunning={isRunning}
        onRun={handleRunFresh}
        autoRun={autoRun}
        setAutoRun={setAutoRun}
        engineMode={engineMode}
        setEngineMode={setEngineMode}
        toggleBottomDock={() => setBottomDockOpen(!bottomDockOpen)}
        bottomDockOpen={bottomDockOpen}
        toggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
        rightSidebarOpen={rightSidebarOpen}
      />

      {/* 2. MAIN WORKSPACE */}
      <main className="vs-workspace">
        {/* Activity Bar (Leftmost icons) */}
        <VsActivityBar
          activeView={activeActivityView}
          setActiveView={setActiveActivityView}
          toggleBottomDock={(forceOpen) => setBottomDockOpen(forceOpen ?? !bottomDockOpen)}
        />

        {/* Primary Sidebar (Explorer) */}
        {activeActivityView === 'explorer' && (
          <>
            <VsSidebar
              files={files}
              openFileIds={openFileIds}
              activeFileId={activeFileId}
              onSelectFile={handleSelectFile}
              onCloseFile={handleCloseFile}
              onCreateFile={handleCreateFile}
              onDeleteFile={handleDeleteFile}
              width={sidebarWidth}
            />
            {/* Resizer Handle: Left Sidebar */}
            <div
              className="vs-resizer-col left"
              onMouseDown={startResizeLeft}
              title="Drag to resize Explorer"
            />
          </>
        )}

        {/* Center Column: Editor Tabs + Editor + Bottom Terminal Dock */}
        <section className="vs-center-col">
          <VsEditorTabs
            files={files}
            openFileIds={openFileIds}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCloseFile={handleCloseFile}
            onNewFile={() => handleCreateFile(`script_${files.length + 1}.plain`)}
          />

          <div className="vs-editor-container">
            <Editor
              code={activeCode}
              onChange={handleCodeChange}
              onRun={handleRunFresh}
              errorLine={errorLine}
              cursorPos={cursorPos}
              setCursorPos={setCursorPos}
            />
          </div>

          {/* Bottom Dock (Terminal, AST, Tokens, Variables, Problems) */}
          {bottomDockOpen && (
            <>
              {/* Resizer Handle: Bottom Dock */}
              <div
                className="vs-resizer-row"
                onMouseDown={startResizeBottom}
                title="Drag to resize Terminal Dock"
              />
              <VsBottomDock
                activeTab={dockTab}
                setActiveTab={setDockTab}
                result={result}
                onClear={handleClearConsole}
                onClose={() => setBottomDockOpen(false)}
                dockHeight={dockHeight}
                setDockHeight={setDockHeight}
                onInputSubmit={handleTerminalInput}
                onResetSession={handleResetSession}
              />
            </>
          )}
        </section>

        {/* Right Sidebar (Sentence Builder & Language Reference) */}
        {rightSidebarOpen && (
          <>
            {/* Resizer Handle: Right Sidebar */}
            <div
              className="vs-resizer-col right"
              onMouseDown={startResizeRight}
              title="Drag to resize Assistant"
            />
            <VsRightSidebar
              onInsertSnippet={handleInsertSnippet}
              onClose={() => setRightSidebarOpen(false)}
              width={rightSidebarWidth}
            />
          </>
        )}
      </main>

      {/* 3. BOTTOM STATUS BAR */}
      <VsStatusBar
        cursorPos={cursorPos}
        error={result.error}
        executionTimeMs={result.executionTimeMs}
        engineMode={engineMode}
        rustAvailable={rustAvailable}
      />
    </>
  );
}

import React, { useState, useEffect, useRef, useCallback } from 'react';
import VsTitleBar from './components/VsTitleBar';
import VsActivityBar from './components/VsActivityBar';
import VsSidebar from './components/VsSidebar';
import VsEditorTabs from './components/VsEditorTabs';
import Editor from './components/Editor';
import VsBottomDock from './components/VsBottomDock';
import VsRightSidebar from './components/VsRightSidebar';
import VsStatusBar from './components/VsStatusBar';

import { runSimulator } from './simulator';

// Clean default starter file in user workspace
const DEFAULT_FILES = [
  {
    id: 'main',
    name: 'main.plain',
    code: `# Welcome to Plain Language!
# Write natural English code below:

ask user_name with "What is your name?"
say "Hello, " + uppercase of user_name + "!"

set scores to [85, 92, 78]
add 95 to scores

for each score in scores
    say "Score: " + score
end
`,
    category: 'workspace'
  }
];

export default function App() {
  const [folderName, setFolderName] = useState('plain-lang');

  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem('plain_ide_files');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Filter out any legacy hardcoded examples
        const nonExamples = parsed.filter(f => f.category !== 'examples');
        if (nonExamples.length > 0) {
          return nonExamples;
        }
      } catch {}
    }
    return DEFAULT_FILES;
  });

  const [openFileIds, setOpenFileIds] = useState(() => {
    return [files[0]?.id || DEFAULT_FILES[0].id];
  });

  const [activeFileId, setActiveFileId] = useState(files[0]?.id || DEFAULT_FILES[0].id);

  // Hidden file inputs for opening file and opening folder
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Layout UI Toggles & Resizable Dimensions
  const [activeActivityView, setActiveActivityView] = useState('explorer'); // 'explorer' | 'guide' | null
  const [bottomDockOpen, setBottomDockOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [dockTab, setDockTab] = useState('terminal'); // 'terminal' | 'output' | 'problems' | 'ast' | 'tokens' | 'variables'

  // Resizable Panes State
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(330);
  const [dockHeight, setDockHeight] = useState(260);

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
        const newWidth = Math.max(160, Math.min(520, e.clientX - 48));
        setSidebarWidth(newWidth);
      } else if (isResizingRight.current) {
        const newWidth = Math.max(220, Math.min(650, window.innerWidth - e.clientX));
        setRightSidebarWidth(newWidth);
      } else if (isResizingBottom.current) {
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
        if (!data.success && data.error) {
          setBottomDockOpen(true);
        }
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

        if (!data.success && data.error) {
          setBottomDockOpen(true);
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

  // Run fresh code
  const handleRunFresh = () => {
    setSessionInputs([]);
    executeCode(activeCode, []);
  };

  // Terminal Interactive Input handler
  const handleTerminalInput = (inputValue) => {
    const nextInputs = [...sessionInputs, inputValue];
    setSessionInputs(nextInputs);
    executeCode(activeCode, nextInputs);
  };

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

  // --- FILE MANAGEMENT OPERATIONS ---

  // 1. Create New File
  const handleCreateFile = (filename) => {
    let finalName = (filename || '').trim();
    if (!finalName) {
      finalName = `script_${files.length + 1}.plain`;
    }
    if (!finalName.endsWith('.plain')) {
      finalName += '.plain';
    }
    const id = finalName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const newFile = {
      id,
      name: finalName,
      code: `# ${finalName}\n# Write Plain English code here:\n\nask user_name with "What is your name?"\nsay "Hello, " + user_name\n`,
      category: 'workspace'
    };
    setFiles(prev => [...prev.filter(f => f.id !== id), newFile]);
    setOpenFileIds(prev => Array.from(new Set([...prev, id])));
    setActiveFileId(id);
    setSessionInputs([]);
    executeCode(newFile.code, []);
  };

  const handleNewFilePrompt = () => {
    const name = window.prompt("Enter new file name (.plain):", `script_${files.length + 1}.plain`);
    if (name) {
      handleCreateFile(name);
    }
  };

  // 2. Open File...
  const handleOpenFile = async () => {
    // 1. Try native Tauri dialog
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const opened = await invoke('open_file_dialog');
        if (opened) {
          const newId = opened.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const newFile = {
            id: newId,
            name: opened.name,
            path: opened.path,
            code: opened.content,
            category: 'workspace'
          };
          setFiles(prev => [...prev.filter(f => f.id !== newId), newFile]);
          setActiveFileId(newId);
          setOpenFileIds(prev => Array.from(new Set([...prev, newId])));
          executeCode(opened.content, []);
          return;
        }
        return;
      } catch (err) {
        console.warn('Tauri open_file_dialog error:', err);
      }
    }

    // 2. Try browser File System Access API
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'Plain Language File (*.plain, *.txt)',
            accept: { 'text/plain': ['.plain', '.txt'] }
          }]
        });
        const file = await handle.getFile();
        const text = await file.text();
        const newId = file.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const newFile = {
          id: newId,
          name: file.name,
          code: text,
          category: 'workspace'
        };
        setFiles(prev => [...prev.filter(f => f.id !== newId), newFile]);
        setActiveFileId(newId);
        setOpenFileIds(prev => Array.from(new Set([...prev, newId])));
        executeCode(text, []);
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // 3. Fallback file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const onFileInputChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const loaded = [];
    for (const f of selected) {
      const text = await f.text();
      let fName = f.name;
      if (!fName.endsWith('.plain') && !fName.endsWith('.txt')) {
        fName += '.plain';
      }
      const id = fName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      loaded.push({
        id,
        name: fName,
        code: text,
        category: 'workspace'
      });
    }

    setFiles(prev => {
      const existingIds = new Set(prev.map(item => item.id));
      const newItems = loaded.filter(item => !existingIds.has(item.id));
      return [...prev, ...newItems];
    });

    const last = loaded[loaded.length - 1];
    if (last) {
      setOpenFileIds(prev => Array.from(new Set([...prev, last.id])));
      setActiveFileId(last.id);
      executeCode(last.code, []);
    }
  };

  // 3. Open Folder...
  const handleOpenFolder = async () => {
    // 1. Try native Tauri dialog
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const folderData = await invoke('open_folder_dialog');
        if (folderData && folderData.files) {
          setFolderName(folderData.folder_name);
          const loaded = folderData.files.map(f => ({
            id: f.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            name: f.name,
            path: f.path,
            code: f.content,
            category: folderData.folder_name
          }));
          if (loaded.length > 0) {
            setFiles(loaded);
            setOpenFileIds([loaded[0].id]);
            setActiveFileId(loaded[0].id);
            executeCode(loaded[0].code, []);
          }
          return;
        }
        return;
      } catch (err) {
        console.warn('Tauri open_folder_dialog error:', err);
      }
    }

    // 2. Fallback folder input
    if (folderInputRef.current) {
      folderInputRef.current.value = '';
      folderInputRef.current.click();
    }
  };

  const onFolderInputChange = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    const firstRel = selected[0].webkitRelativePath || '';
    const rootDir = firstRel.split('/')[0] || 'workspace';
    setFolderName(rootDir);

    const loaded = [];
    for (const f of selected) {
      if (f.name.startsWith('.')) continue;
      if (f.webkitRelativePath.includes('node_modules')) continue;
      if (f.name.endsWith('.plain') || f.name.endsWith('.txt')) {
        const text = await f.text();
        const id = f.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        loaded.push({
          id,
          name: f.name,
          code: text,
          category: rootDir
        });
      }
    }

    if (loaded.length > 0) {
      setFiles(loaded);
      setOpenFileIds([loaded[0].id]);
      setActiveFileId(loaded[0].id);
      executeCode(loaded[0].code, []);
    }
  };

  // 4. Save File (Ctrl+S)
  const handleSaveFile = async () => {
    if (!activeFile) return;

    // In Tauri, also sync to workspace directory on disk
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('exec_terminal', {
          command: 'true',
          args: [],
          cwd: null,
          stdinData: null,
          syncFile: { name: activeFile.name, content: activeCode }
        });
      } catch {}
    }

    // Trigger browser download or local blob
    try {
      const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.name.endsWith('.plain') ? activeFile.name : `${activeFile.name}.plain`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.warn('Save failed:', err);
    }
  };

  // 5. Save As... (Opens native OS Folder & File dialog)
  // 5. Save As... (Opens native OS Folder & File dialog)
  const handleSaveAs = async () => {
    if (!activeFile) return;

    const suggested = activeFile.name.endsWith('.plain') ? activeFile.name : `${activeFile.name}.plain`;

    // 1. If in Tauri desktop app, use native OS file dialog (rfd)
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const saved = await invoke('save_file_dialog', {
          suggestedName: suggested,
          content: activeCode
        });
        if (saved) {
          const newId = saved.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          const newFile = {
            id: newId,
            name: saved.name,
            path: saved.path,
            code: saved.content,
            category: 'workspace'
          };
          setFiles(prev => [...prev.filter(f => f.id !== newId), newFile]);
          setActiveFileId(newId);
          setOpenFileIds(prev => Array.from(new Set([...prev, newId])));
          executeCode(saved.content, []);
          return;
        }
        return; // user cancelled dialog
      } catch (err) {
        console.warn('Tauri save_file_dialog error:', err);
      }
    }

    // 2. Try Vite backend native OS save-as dialog (zenity)
    try {
      const resp = await fetch('/api/terminal/save-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestedName: suggested, content: activeCode })
      });
      const data = await resp.json();
      if (data.success) {
        const newId = data.name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const newFile = {
          id: newId,
          name: data.name,
          path: data.path,
          code: data.content,
          category: 'workspace'
        };
        setFiles(prev => [...prev.filter(f => f.id !== newId), newFile]);
        setActiveFileId(newId);
        setOpenFileIds(prev => Array.from(new Set([...prev, newId])));
        executeCode(data.content, []);
        return;
      } else if (data.cancelled) {
        return; // user cancelled
      }
    } catch {}

    // 3. If in modern browser with showSaveFilePicker
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggested,
          types: [{
            description: 'Plain Language File (*.plain)',
            accept: { 'text/plain': ['.plain'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(activeCode);
        await writable.close();

        const newName = handle.name;
        const newId = newName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const newFile = {
          id: newId,
          name: newName,
          code: activeCode,
          category: 'workspace'
        };
        setFiles(prev => [...prev.filter(f => f.id !== newId), newFile]);
        setActiveFileId(newId);
        setOpenFileIds(prev => Array.from(new Set([...prev, newId])));
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // 4. Fallback: prompt for filename and download
    const chosen = window.prompt("Save file as (.plain):", activeFile.name);
    if (chosen && chosen.trim()) {
      let finalName = chosen.trim();
      if (!finalName.endsWith('.plain')) finalName += '.plain';
      const newId = finalName.toLowerCase().replace(/[^a-z0-9_]/g, '_');
      const newFile = {
        id: newId,
        name: finalName,
        code: activeCode,
        category: 'workspace'
      };
      setFiles(prev => [...prev.filter(f => f.id !== newId), newFile]);
      setActiveFileId(newId);
      setOpenFileIds(prev => Array.from(new Set([...prev, newId])));

      const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = finalName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // 6. Delete File
  const handleDeleteFile = async (id) => {
    const fileToDelete = files.find(f => f.id === id);
    if (!fileToDelete) return;

    // Delete from disk if in Tauri
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('delete_workspace_file', { filename: fileToDelete.name });
      } catch (err) {
        console.warn('Tauri delete file error:', err);
      }
    } else {
      // Delete from disk via Vite dev server
      try {
        await fetch('/api/terminal/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: fileToDelete.name })
        });
      } catch (err) {
        console.warn('Vite delete file error:', err);
      }
    }

    const remainingFiles = files.filter(f => f.id !== id);
    if (remainingFiles.length === 0) {
      // If user deleted the last file, create a fresh untitled.plain
      const fresh = {
        id: 'untitled',
        name: 'untitled.plain',
        code: `# New Plain File\n\nask user_name with "What is your name?"\nsay "Hello, " + user_name\n`,
        category: 'workspace'
      };
      setFiles([fresh]);
      setOpenFileIds(['untitled']);
      setActiveFileId('untitled');
      executeCode(fresh.code, []);
    } else {
      setFiles(remainingFiles);
      handleCloseFile(id);
      if (activeFileId === id) {
        setActiveFileId(remainingFiles[0].id);
        executeCode(remainingFiles[0].code, []);
      }
    }
  };

  // 7. Close File Tab
  const handleCloseFile = (id) => {
    const targetId = id || activeFileId;
    const nextOpen = openFileIds.filter(fId => fId !== targetId);
    setOpenFileIds(nextOpen);
    if (activeFileId === targetId && nextOpen.length > 0) {
      const nextActiveId = nextOpen[nextOpen.length - 1];
      setActiveFileId(nextActiveId);
      const nextFile = files.find(f => f.id === nextActiveId);
      if (nextFile) executeCode(nextFile.code, []);
    }
  };

  // Select file tab
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

  // Keyboard Shortcuts: Ctrl+S (Save), Ctrl+O (Open), Ctrl+N (New File), Ctrl+W (Close tab)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenFile();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewFilePrompt();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
        e.preventDefault();
        if (activeFileId) handleCloseFile(activeFileId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, activeCode, activeFileId, files]);

  return (
    <>
      {/* Hidden inputs for native file & folder pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".plain,.txt"
        multiple
        style={{ display: 'none' }}
        onChange={onFileInputChange}
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        style={{ display: 'none' }}
        onChange={onFolderInputChange}
      />

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
        onNewFile={handleNewFilePrompt}
        onOpenFile={handleOpenFile}
        onOpenFolder={handleOpenFolder}
        onSaveFile={handleSaveFile}
        onSaveAs={handleSaveAs}
        onCloseFile={() => handleCloseFile(activeFileId)}
        onDeleteFile={() => activeFileId && handleDeleteFile(activeFileId)}
        folderName={folderName}
      />

      {/* 2. MAIN WORKSPACE */}
      <main className="vs-workspace">
        {/* Activity Bar (Leftmost icons) */}
        <VsActivityBar
          activeView={activeActivityView}
          setActiveView={setActiveActivityView}
          toggleBottomDock={(forceOpen) => setBottomDockOpen(forceOpen ?? !bottomDockOpen)}
        />

        {/* Primary Sidebar (Explorer with clean files, no hardcoded examples) */}
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
              onOpenFile={handleOpenFile}
              onOpenFolder={handleOpenFolder}
              folderName={folderName}
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

        {/* Center Column: Editor Tabs + Editor + Bottom Real Terminal Dock */}
        <section className="vs-center-col">
          <VsEditorTabs
            files={files}
            openFileIds={openFileIds}
            activeFileId={activeFileId}
            onSelectFile={handleSelectFile}
            onCloseFile={handleCloseFile}
            onNewFile={handleNewFilePrompt}
            onDeleteFile={handleDeleteFile}
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

          {/* Bottom Dock (Real Terminal, Compiler Output, AST, Tokens, Variables, Problems) */}
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
                activeFile={activeFile}
                activeCode={activeCode}
                files={files}
                onSelectFile={handleSelectFile}
                onDeleteFile={handleDeleteFile}
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

import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import {
  Play,
  RotateCcw,
  Trash2,
  Terminal as TerminalIcon,
  Sparkles,
  HelpCircle
} from 'lucide-react';

export default function RealTerminal({
  activeFile,
  activeCode,
  files = [],
  onFileSelect,
  onFileDelete
}) {
  const terminalRef = useRef(null);
  const xtermInstance = useRef(null);
  const fitAddonRef = useRef(null);
  const isRunningRef = useRef(false);

  // Command line input buffer & history
  const currentLineRef = useRef('');
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const waitingForInputRef = useRef(null);

  const PROMPT = '\x1b[1;36mplain@ide\x1b[0m:\x1b[1;32m~/workspace\x1b[0m$ ';

  const syncFileToDisk = async (name, content) => {
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('exec_terminal', {
          command: 'true',
          args: [],
          cwd: null,
          stdinData: null,
          syncFile: { name, content }
        });
      } catch {}
    } else {
      try {
        await fetch('/api/terminal/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: 'true',
            args: [],
            syncFile: { name, content }
          })
        });
      } catch {}
    }
  };

  const syncAllFilesToDisk = async () => {
    for (const f of files) {
      const code = (f.id === activeFile?.id && activeCode !== undefined) ? activeCode : f.code;
      await syncFileToDisk(f.name, code);
    }
  };

  // Run Plain files interactively supporting 'ask' prompts inside terminal
  const runPlainInteractive = async (targetFile, targetCode, inputs = [], printedLinesCount = 0, term) => {
    isRunningRef.current = true;

    // Sync all files so imports across files succeed
    await syncAllFilesToDisk();

    let res = null;
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        res = await invoke('run_plain', { code: targetCode, inputs });
      } catch (err) {
        console.warn('Tauri run_plain failed, falling back:', err);
      }
    }

    if (!res) {
      try {
        const response = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: targetCode, inputs })
        });
        res = await response.json();
      } catch (err) {
        res = { success: false, output: [], error: err.message };
      }
    }

    const outputLines = res.output || [];
    for (let i = printedLinesCount; i < outputLines.length; i++) {
      term.writeln(outputLines[i]);
    }
    const newPrintedCount = outputLines.length;

    // Check if waiting for input from 'ask' prompt
    if (res.waiting_for_input) {
      const promptText = res.waiting_for_input.prompt;
      term.write(`\x1b[1;33m${promptText}\x1b[0m `);
      waitingForInputRef.current = {
        targetFile,
        targetCode,
        inputs,
        printedLinesCount: newPrintedCount,
        prompt: promptText
      };
      currentLineRef.current = '';
      isRunningRef.current = false;
      return;
    }

    if (res.error) {
      term.writeln(`\x1b[31m${res.error}\x1b[0m`);
    }

    term.writeln(`\r\n\x1b[90m[Process finished with exit code ${res.success ? 0 : 1}]\x1b[0m\r\n`);
    term.write(PROMPT);
    waitingForInputRef.current = null;
    isRunningRef.current = false;
  };

  // Execute command on backend (Tauri or HTTP API)
  const executeShellCommand = async (fullCommand, stdin = null, customFile = null) => {
    const parts = fullCommand.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);
    const cleanCmd = cmd.replace(/^\.\//, '');

    // Sync file content to disk so the Plain binary can read it
    let fileToSync = customFile;
    if (!fileToSync) {
      if ((cmd === 'plain' || cleanCmd === 'plain') && args[0]) {
        const targetArg = args[0].replace(/^\.\//, '');
        fileToSync = files.find(f => f.name === targetArg || f.id === targetArg);
      } else if (cleanCmd.endsWith('.plain')) {
        fileToSync = files.find(f => f.name === cleanCmd || f.id === cleanCmd);
      }
    }
    if (!fileToSync && activeFile) {
      fileToSync = activeFile;
    }

    const contentToWrite = fileToSync
      ? (fileToSync.id === activeFile?.id && activeCode !== undefined ? activeCode : fileToSync.code)
      : null;

    const syncFile = fileToSync ? { name: fileToSync.name, content: contentToWrite } : null;

    // 1. Try Tauri if in desktop app
    if (typeof window !== 'undefined' && window.__TAURI_INTERNALS__) {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const res = await invoke('exec_terminal', {
          command: cmd,
          args,
          cwd: null,
          stdinData: stdin,
          syncFile: syncFile
        });
        return {
          stdout: res.stdout || '',
          stderr: res.stderr || '',
          code: res.code || 0
        };
      } catch (err) {
        console.warn('Tauri exec failed, falling back:', err);
      }
    }

    // 2. Fallback to Vite dev server API
    try {
      const response = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          command: cmd,
          args,
          stdin,
          syncFile
        })
      });
      return await response.json();
    } catch (err) {
      return {
        stdout: '',
        stderr: `Failed to execute: ${err.message}`,
        code: 1
      };
    }
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      fontFamily: "'Fira Code', 'Courier New', monospace",
      fontSize: 12.5,
      lineHeight: 1.25,
      theme: {
        background: '#141416',
        foreground: '#cccccc',
        cursor: '#38bdf8',
        selectionBackground: 'rgba(56, 189, 248, 0.3)',
        black: '#1e1e1e',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#f59e0b',
        blue: '#38bdf8',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#ffffff',
        brightBlack: '#64748b',
        brightRed: '#fb7185',
        brightGreen: '#34d399',
        brightYellow: '#fbbf24',
        brightBlue: '#60a5fa',
        brightMagenta: '#d8b4fe',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff'
      }
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermInstance.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome banner
    term.writeln('\x1b[1;36m=== Plain Language Real Terminal (v0.2.0) ===\x1b[0m');
    term.writeln('\x1b[90mWorkspace: /home/jhomar-john-picar/Desktop/My Dev ENV/plain-lang\x1b[0m');
    term.writeln('\x1b[90mCommands: \x1b[33mrun\x1b[90m (run active file) | \x1b[33mplain <file>\x1b[90m | \x1b[33mls\x1b[90m | \x1b[33mcat\x1b[90m | \x1b[33mhelp\x1b[0m\n');
    term.write(PROMPT);

    // Keyboard Handler
    const onDataDisposable = term.onData(async (data) => {
      if (isRunningRef.current) {
        return;
      }

      // Ctrl+C (cancel input / command)
      if (data === '\u0003') {
        if (waitingForInputRef.current) {
          waitingForInputRef.current = null;
          currentLineRef.current = '';
          term.writeln('^C');
          term.write(PROMPT);
          isRunningRef.current = false;
          return;
        }
      }

      // Enter key
      if (data === '\r' || data === '\n') {
        term.writeln('');
        const line = currentLineRef.current;
        currentLineRef.current = '';
        historyIndexRef.current = -1;

        if (waitingForInputRef.current) {
          const state = waitingForInputRef.current;
          waitingForInputRef.current = null;
          isRunningRef.current = true;
          await runPlainInteractive(
            state.targetFile,
            state.targetCode,
            [...state.inputs, line],
            state.printedLinesCount,
            term
          );
          return;
        }

        const trimmed = line.trim();
        if (trimmed) {
          historyRef.current.push(trimmed);
          await handleCommand(trimmed, term);
        } else {
          term.write(PROMPT);
        }
        return;
      }

      // Backspace key
      if (data === '\u007F' || data === '\b') {
        if (currentLineRef.current.length > 0) {
          currentLineRef.current = currentLineRef.current.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }

      // Arrow Up (History back) - only when not waiting for interactive input
      if (data === '\x1b[A' && !waitingForInputRef.current) {
        if (historyRef.current.length > 0) {
          const nextIdx = historyIndexRef.current === -1
            ? historyRef.current.length - 1
            : Math.max(0, historyIndexRef.current - 1);
          historyIndexRef.current = nextIdx;
          const prevCmd = historyRef.current[nextIdx];

          // Clear current line on screen
          while (currentLineRef.current.length > 0) {
            term.write('\b \b');
            currentLineRef.current = currentLineRef.current.slice(0, -1);
          }
          currentLineRef.current = prevCmd;
          term.write(prevCmd);
        }
        return;
      }

      // Arrow Down (History forward) - only when not waiting for interactive input
      if (data === '\x1b[B' && !waitingForInputRef.current) {
        if (historyRef.current.length > 0 && historyIndexRef.current !== -1) {
          const nextIdx = historyIndexRef.current + 1;
          while (currentLineRef.current.length > 0) {
            term.write('\b \b');
            currentLineRef.current = currentLineRef.current.slice(0, -1);
          }
          if (nextIdx < historyRef.current.length) {
            historyIndexRef.current = nextIdx;
            const nextCmd = historyRef.current[nextIdx];
            currentLineRef.current = nextCmd;
            term.write(nextCmd);
          } else {
            historyIndexRef.current = -1;
            currentLineRef.current = '';
          }
        }
        return;
      }

      // Printable characters
      if (data >= ' ' || data === '\t') {
        currentLineRef.current += data;
        term.write(data);
      }
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {}
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      onDataDisposable.dispose();
      term.dispose();
    };
  }, []);

  // Built-in Shell Handler
  const handleCommand = async (cmdLine, term) => {
    isRunningRef.current = true;
    const parts = cmdLine.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    if (cmd === 'clear') {
      term.clear();
      term.write(PROMPT);
      isRunningRef.current = false;
      return;
    }

    if (cmd === 'help') {
      term.writeln('\x1b[1;33mAvailable Commands:\x1b[0m');
      term.writeln('  \x1b[36mrun\x1b[0m                     Execute the file currently open in editor');
      term.writeln('  \x1b[36mplain <filename.plain>\x1b[0m  Execute a Plain code file with Rust interpreter');
      term.writeln('  \x1b[36mplain -c "<code>"\x1b[0m       Execute a single Plain line or block');
      term.writeln('  \x1b[36mls\x1b[0m                      List files in workspace');
      term.writeln('  \x1b[36mcat <filename.plain>\x1b[0m    Print file contents to terminal');
      term.writeln('  \x1b[36mrm <filename.plain>\x1b[0m     Delete file from workspace and disk');
      term.writeln('  \x1b[36mpwd\x1b[0m                     Print current working directory');
      term.writeln('  \x1b[36mclear\x1b[0m                   Clear terminal screen');
      term.writeln('  \x1b[36m<shell command>\x1b[0m         Run any Linux/shell command directly');
      term.writeln('');
      term.write(PROMPT);
      isRunningRef.current = false;
      return;
    }

    if (cmd === 'ls') {
      term.writeln('\x1b[1;34mWorkspace files:\x1b[0m');
      files.forEach(f => {
        term.writeln(`  \x1b[32m${f.name}\x1b[0m`);
      });
      term.writeln('');
      term.write(PROMPT);
      isRunningRef.current = false;
      return;
    }

    if (cmd === 'cat') {
      const targetName = args[0] ? args[0].replace(/^\.\//, '') : '';
      const target = files.find(f => f.name === targetName || f.id === targetName);
      if (target) {
        term.writeln(target.code);
      } else {
        term.writeln(`\x1b[31mcat: ${targetName || ''}: No such file\x1b[0m`);
      }
      term.writeln('');
      term.write(PROMPT);
      isRunningRef.current = false;
      return;
    }

    if (cmd === 'rm' || cmd === 'delete') {
      const targetName = args[0] ? args[0].replace(/^\.\//, '') : '';
      const target = files.find(f => f.name === targetName || f.id === targetName);
      if (target) {
        term.writeln(`\x1b[33mDeleting ${target.name}...\x1b[0m`);
        if (onFileDelete) {
          onFileDelete(target.id);
        }
        await executeShellCommand(`rm ${target.name}`);
        term.writeln(`\x1b[32mSuccessfully deleted ${target.name}\x1b[0m\r\n`);
      } else {
        term.writeln(`\x1b[31mrm: cannot remove '${targetName || ''}': No such file\x1b[0m\r\n`);
      }
      term.write(PROMPT);
      isRunningRef.current = false;
      return;
    }

    const cleanCommand = cmd.replace(/^\.\//, '');
    if (cleanCommand.endsWith('.plain')) {
      const targetFile = files.find(f => f.name === cleanCommand || f.id === cleanCommand) || activeFile;
      const fileName = targetFile ? targetFile.name : cleanCommand;
      const targetCode = (targetFile && targetFile.id === activeFile?.id && activeCode !== undefined)
        ? activeCode
        : (targetFile ? targetFile.code : '');

      term.writeln(`\x1b[36mRunning ${fileName} with Plain interpreter...\x1b[0m`);
      if (targetFile) {
        await runPlainInteractive(targetFile, targetCode, [], 0, term);
      } else {
        const res = await executeShellCommand(`plain ${fileName}`);
        if (res.stdout) term.write(res.stdout.replace(/\r?\n/g, '\r\n'));
        if (res.stderr) term.writeln(`\x1b[31m${res.stderr.replace(/\r?\n/g, '\r\n')}\x1b[0m`);
        term.writeln(`\r\n\x1b[90m[Process finished with exit code ${res.code}]\x1b[0m\r\n`);
        term.write(PROMPT);
        isRunningRef.current = false;
      }
      return;
    }

    if (cmd === 'run') {
      const targetName = args[0] ? args[0].replace(/^\.\//, '') : (activeFile ? activeFile.name : null);
      if (!targetName) {
        term.writeln('\x1b[31mNo active file to run.\x1b[0m');
        term.write(PROMPT);
        isRunningRef.current = false;
        return;
      }

      const targetFile = files.find(f => f.name === targetName || f.id === targetName) || activeFile;
      const targetCode = (targetFile.id === activeFile?.id && activeCode !== undefined)
        ? activeCode
        : targetFile.code;

      term.writeln(`\x1b[36mRunning ${targetFile.name} with Plain interpreter...\x1b[0m`);
      await runPlainInteractive(targetFile, targetCode, [], 0, term);
      return;
    }

    if (cmd === 'plain') {
      const targetName = args[0] ? args[0].replace(/^\.\//, '') : null;
      if (targetName && targetName.endsWith('.plain')) {
        const targetFile = files.find(f => f.name === targetName || f.id === targetName) || activeFile;
        const targetCode = (targetFile && targetFile.id === activeFile?.id && activeCode !== undefined)
          ? activeCode
          : (targetFile ? targetFile.code : '');

        term.writeln(`\x1b[36mRunning ${targetName} with Plain interpreter...\x1b[0m`);
        if (targetFile) {
          await runPlainInteractive(targetFile, targetCode, [], 0, term);
          return;
        }
      }

      try {
        const res = await executeShellCommand(cmdLine);
        if (res.stdout) {
          term.write(res.stdout.replace(/\r?\n/g, '\r\n'));
        }
        if (res.stderr) {
          term.write(`\x1b[31m${res.stderr.replace(/\r?\n/g, '\r\n')}\x1b[0m`);
        }
      } catch (err) {
        term.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
      }
      term.writeln('');
      term.write(PROMPT);
      isRunningRef.current = false;
      return;
    }

    // Default: execute command on backend
    try {
      const res = await executeShellCommand(cmdLine);
      if (res.stdout) {
        term.write(res.stdout.replace(/\r?\n/g, '\r\n'));
      }
      if (res.stderr) {
        term.write(`\x1b[31m${res.stderr.replace(/\r?\n/g, '\r\n')}\x1b[0m`);
      }
    } catch (err) {
      term.writeln(`\x1b[31mError: ${err.message}\x1b[0m`);
    }

    term.writeln('');
    term.write(PROMPT);
    isRunningRef.current = false;
  };

  // Run the current file immediately in the real terminal
  const runCurrentFile = () => {
    if (!xtermInstance.current || !activeFile) return;
    const term = xtermInstance.current;
    term.writeln(`run`);
    handleCommand('run', term);
  };

  const handleClear = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.write(PROMPT);
    }
  };

  const handleRestart = () => {
    if (xtermInstance.current) {
      xtermInstance.current.clear();
      xtermInstance.current.writeln('\x1b[1;36m=== Plain Terminal Session Restarted ===\x1b[0m\r\n');
      xtermInstance.current.write(PROMPT);
    }
  };

  return (
    <div className="real-terminal-wrapper">
      {/* Terminal Mini Toolbar */}
      <div className="real-terminal-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="terminal-badge">REAL PTY TERMINAL</span>
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Active file: <code>{activeFile?.name || 'none'}</code>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className="btn-terminal-action primary"
            onClick={runCurrentFile}
            title="Execute active file in this real terminal"
          >
            <Play size={11} fill="currentColor" />
            <span>Run File Here</span>
          </button>

          <button
            className="btn-terminal-action"
            onClick={handleClear}
            title="Clear terminal screen"
          >
            <Trash2 size={11} />
            <span>Clear</span>
          </button>

          <button
            className="btn-terminal-action"
            onClick={handleRestart}
            title="Restart terminal shell"
          >
            <RotateCcw size={11} />
            <span>Restart</span>
          </button>
        </div>
      </div>

      {/* Xterm.js Container */}
      <div className="xterm-mount-container" ref={terminalRef} />
    </div>
  );
}

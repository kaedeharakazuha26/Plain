import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Trash2,
  CornerDownLeft,
  RotateCcw,
  Sparkles
} from 'lucide-react';

export default function ConsoleOutput({
  output = [],
  error = null,
  success = true,
  executionTimeMs = null,
  engine = 'rust-native',
  waitingForInput = null,
  onInputSubmit,
  onClear,
  onResetSession
}) {
  const [copied, setCopied] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  const [inputHistory, setInputHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const inputRef = useRef(null);
  const terminalBottomRef = useRef(null);
  const consoleContainerRef = useRef(null);

  // Auto-focus input when waiting for input or terminal opens
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForInput, output]);

  // Scroll to bottom on new output or input prompt
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [output, waitingForInput]);

  const handleCopy = () => {
    const text = (output || []).join('\n') + (error ? `\nError: ${error}` : '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const val = currentInput;
    if (onInputSubmit) {
      onInputSubmit(val);
    }
    if (val.trim()) {
      setInputHistory(prev => [...prev, val]);
    }
    setCurrentInput('');
    setHistoryIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      if (inputHistory.length > 0) {
        e.preventDefault();
        const nextIdx = historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(nextIdx);
        setCurrentInput(inputHistory[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      if (inputHistory.length > 0) {
        e.preventDefault();
        if (historyIndex < inputHistory.length - 1 && historyIndex !== -1) {
          const nextIdx = historyIndex + 1;
          setHistoryIndex(nextIdx);
          setCurrentInput(inputHistory[nextIdx]);
        } else {
          setHistoryIndex(-1);
          setCurrentInput('');
        }
      }
    }
  };

  const handleTerminalClick = (e) => {
    // If user clicked inside console area, refocus the prompt input
    if (inputRef.current && !e.target.closest('button')) {
      inputRef.current.focus();
    }
  };

  return (
    <div className="console-view" onClick={handleTerminalClick}>
      {/* Top Meta Bar */}
      <div className="console-meta-bar">
        <div className="status-indicator-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {error ? (
            <div className="status-indicator error">
              <AlertTriangle size={15} />
              <span>Execution Failed</span>
            </div>
          ) : waitingForInput ? (
            <div className="status-indicator waiting">
              <span className="pulse-dot"></span>
              <span>Waiting for Input: {waitingForInput.variable}</span>
            </div>
          ) : output && output.length > 0 ? (
            <div className="status-indicator success">
              <CheckCircle2 size={15} />
              <span>Finished</span>
            </div>
          ) : (
            <div className="status-indicator idle">
              <Terminal size={15} />
              <span>Ready for execution</span>
            </div>
          )}

          {executionTimeMs !== null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-dim)', fontSize: '11px' }}>
              <Clock size={13} />
              <span>{executionTimeMs} ms</span>
            </div>
          )}

          <span className="engine-badge">{engine}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onResetSession && (
            <button
              className="btn-secondary"
              style={{ padding: '3px 8px', fontSize: '11px' }}
              onClick={onResetSession}
              title="Restart session and clear all inputs"
            >
              <RotateCcw size={12} />
              <span>Restart</span>
            </button>
          )}

          <button
            className="btn-secondary"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={handleCopy}
            title="Copy console output"
          >
            {copied ? <Check size={12} color="var(--accent-emerald)" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            className="btn-secondary"
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={onClear}
            title="Clear console"
          >
            <Trash2 size={12} />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Input Required Highlight Card if currently waiting for an 'ask' */}
      {waitingForInput && (
        <div className="terminal-ask-banner">
          <div className="terminal-ask-header">
            <span className="ask-badge">PROMPT</span>
            <span className="ask-var-name">Variable: <code>{waitingForInput.variable}</code></span>
          </div>
          <div className="ask-prompt-text">
            "{waitingForInput.prompt}"
          </div>
          <div className="ask-tip">
            Type your response below and press <kbd>Enter</kbd> to continue program execution.
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <div className="error-banner-header">
            <AlertTriangle size={16} />
            <span>Plain Diagnostic</span>
          </div>
          <div style={{ fontFamily: 'var(--font-code)', fontSize: '13px' }}>
            {error}
          </div>
          <div className="error-banner-tip">
            💡 Check your syntax (e.g. <code>ask name with "..."</code>, <code>set ... to ...</code>, <code>end</code>).
          </div>
        </div>
      )}

      {/* Console Lines Stream + Interactive Prompt */}
      <div className="console-lines" ref={consoleContainerRef}>
        {output && output.length > 0 ? (
          output.map((line, idx) => (
            <div key={idx} className="console-line">
              <span className="line-prompt">&gt;</span>
              <span>{line}</span>
            </div>
          ))
        ) : !error && !waitingForInput ? (
          <div className="console-empty">
            <Terminal size={30} opacity={0.35} />
            <span>Interactive Terminal</span>
            <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
              Press "Run Code" or type directly below to execute statements.
            </span>
          </div>
        ) : null}

        {/* Live Interactive Terminal Input Prompt */}
        <form onSubmit={handleSubmit} className={`terminal-interactive-line ${waitingForInput ? 'focused' : ''}`}>
          <span className="terminal-prompt-sym">
            {waitingForInput ? '?' : '❯'}
          </span>
          <input
            ref={inputRef}
            type="text"
            className="terminal-text-input"
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              waitingForInput
                ? `Answer: "${waitingForInput.prompt}" (Press Enter)`
                : 'Type terminal input or answer and press Enter...'
            }
            autoFocus
            spellCheck={false}
            autoComplete="off"
          />
          <button
            type="submit"
            className="terminal-submit-btn"
            title="Send Input (Enter)"
          >
            <CornerDownLeft size={13} />
          </button>
        </form>

        <div ref={terminalBottomRef} />
      </div>
    </div>
  );
}

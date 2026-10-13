import React, { useRef, useEffect } from 'react';

const KEYWORDS = new Set([
  'set', 'say', 'if', 'then', 'otherwise', 'else', 'end', 'repeat', 'times', 'while', 'to',
  'ask', 'with', 'define', 'return', 'call', 'add', 'for', 'each', 'in', 'change',
  'increase', 'decrease', 'by', 'of', 'uppercase', 'lowercase', 'length', 'first', 'last', 'item'
]);
const ENGLISH_OPS = new Set([
  'is', 'above', 'below', 'equal', 'at', 'least', 'most', 'not', 'and', 'or',
  'between', 'greater', 'less', 'than', 'different', 'from', 'same', 'as',
  'plus', 'minus', 'multiplied', 'divided'
]);
const BOOLEANS = new Set(['true', 'false']);

function highlightPlainCode(code) {
  // Simple token highlighter that preserves whitespace and formatting for HTML overlay
  const lines = code.split('\n');
  return lines.map((line, lineIdx) => {
    // If it's a comment
    const commentIdx = line.indexOf('#');
    let codePart = commentIdx !== -1 ? line.slice(0, commentIdx) : line;
    let commentPart = commentIdx !== -1 ? line.slice(commentIdx) : '';

    // Tokenize strings, numbers, words
    const regex = /(".*?"|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[+\-*/><=!]+|\S)/g;
    let lastIndex = 0;
    const parts = [];
    let match;

    while ((match = regex.exec(codePart)) !== null) {
      if (match.index > lastIndex) {
        parts.push(codePart.slice(lastIndex, match.index));
      }
      const token = match[0];
      const lower = token.toLowerCase();

      if (token.startsWith('"')) {
        parts.push(<span key={match.index} className="hl-string">{token}</span>);
      } else if (!isNaN(Number(token))) {
        parts.push(<span key={match.index} className="hl-number">{token}</span>);
      } else if (BOOLEANS.has(lower)) {
        parts.push(<span key={match.index} className="hl-bool">{token}</span>);
      } else if (KEYWORDS.has(lower)) {
        parts.push(<span key={match.index} className="hl-keyword">{token}</span>);
      } else if (ENGLISH_OPS.has(lower) || /^[+\-*/><=!]+$/.test(token)) {
        parts.push(<span key={match.index} className="hl-operator">{token}</span>);
      } else {
        parts.push(token);
      }
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < codePart.length) {
      parts.push(codePart.slice(lastIndex));
    }

    return (
      <div key={lineIdx} className="overlay-line">
        {parts}
        {commentPart && <span className="hl-comment">{commentPart}</span>}
        {line === '' && <span>&nbsp;</span>}
      </div>
    );
  });
}

export default function Editor({
  code,
  onChange,
  onRun,
  errorLine,
  cursorPos,
  setCursorPos
}) {
  const textareaRef = useRef(null);
  const overlayRef = useRef(null);
  const lineGutterRef = useRef(null);

  const lines = code.split('\n');
  const lineCount = lines.length;

  const handleScroll = () => {
    if (textareaRef.current) {
      const top = textareaRef.current.scrollTop;
      const left = textareaRef.current.scrollLeft;
      if (overlayRef.current) {
        overlayRef.current.scrollTop = top;
        overlayRef.current.scrollLeft = left;
      }
      if (lineGutterRef.current) {
        lineGutterRef.current.scrollTop = top;
      }
    }
  };

  const handleKeyDown = (e) => {
    // Run on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun();
      return;
    }

    // Support Tab indentation (4 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChange(newCode);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const updateCursorPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const textBefore = code.slice(0, pos);
    const lineNum = textBefore.split('\n').length;
    const colNum = pos - textBefore.lastIndexOf('\n');
    setCursorPos({ line: lineNum, col: colNum });
  };

  return (
    <div className="editor-pane">
      <div className="pane-header">
        <div className="pane-title">
          <span>SOURCE CODE (PLAIN LANGUAGE)</span>
        </div>
        <div className="pane-controls">
          <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
            Shortcut: <kbd style={{ background: '#1e293b', padding: '2px 5px', borderRadius: '3px', color: '#94a3b8' }}>Ctrl+Enter</kbd> to run
          </span>
        </div>
      </div>

      <div className="editor-wrapper">
        {/* Line Numbers Gutter */}
        <div className="line-numbers-gutter" ref={lineGutterRef}>
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNum = i + 1;
            const isError = errorLine === lineNum;
            return (
              <div
                key={lineNum}
                className={`gutter-line ${isError ? 'has-error' : ''}`}
                title={isError ? `Error on line ${lineNum}` : `Line ${lineNum}`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Textarea + Highlighting Overlay */}
        <div className="editor-textarea-container">
          <div className="editor-highlight-overlay" ref={overlayRef}>
            {highlightPlainCode(code)}
          </div>
          <textarea
            ref={textareaRef}
            className="editor-textarea"
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            onKeyUp={updateCursorPosition}
            onClick={updateCursorPosition}
            placeholder="Type your Plain language sentences here... e.g. set name to 'jhomar'"
            spellCheck="false"
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
          />
        </div>
      </div>

      <div className="editor-status-bar">
        <span>Lines: {lineCount} | Chars: {code.length}</span>
        <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
      </div>
    </div>
  );
}

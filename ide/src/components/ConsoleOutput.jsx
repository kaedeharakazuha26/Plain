import React, { useState } from 'react';
import { Terminal, CheckCircle2, AlertTriangle, Clock, Copy, Check, Trash2 } from 'lucide-react';

export default function ConsoleOutput({
  output = [],
  error = null,
  success = true,
  executionTimeMs = null,
  engine = 'rust-native',
  onClear
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = (output || []).join('\n') + (error ? `\nError: ${error}` : '');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="console-view">
      <div className="console-meta-bar">
        <div className="status-indicator-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {error ? (
            <div className="status-indicator error">
              <AlertTriangle size={15} />
              <span>Execution Failed</span>
            </div>
          ) : output && output.length > 0 ? (
            <div className="status-indicator success">
              <CheckCircle2 size={15} />
              <span>Success</span>
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
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

      {error && (
        <div className="error-banner">
          <div className="error-banner-header">
            <AlertTriangle size={16} />
            <span>Plain Error</span>
          </div>
          <div style={{ fontFamily: 'var(--font-code)', fontSize: '13px' }}>
            {error}
          </div>
          <div className="error-banner-tip">
            💡 Check your spelling, variable definitions with <code>set ... to ...</code>, or loop termination conditions.
          </div>
        </div>
      )}

      <div className="console-lines">
        {output && output.length > 0 ? (
          output.map((line, idx) => (
            <div key={idx} className="console-line">
              <span className="line-prompt">&gt;</span>
              <span>{line}</span>
            </div>
          ))
        ) : !error ? (
          <div className="console-empty">
            <Terminal size={32} opacity={0.4} />
            <span>Run your code to see the output here</span>
            <span style={{ fontSize: '11px' }}>Press the green "Run Code" button above or press Ctrl+Enter</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

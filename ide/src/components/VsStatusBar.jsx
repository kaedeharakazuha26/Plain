import React from 'react';
import {
  GitBranch,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Cpu
} from 'lucide-react';

export default function VsStatusBar({
  cursorPos,
  error,
  executionTimeMs,
  engineMode,
  rustAvailable
}) {
  return (
    <footer className="vs-statusbar">
      <div className="statusbar-left">
        <div className="statusbar-item" title="Git Branch: main">
          <GitBranch size={12} />
          <span>main*</span>
        </div>

        <div className="statusbar-item" title={error ? '1 Error found' : '0 Errors'}>
          <AlertCircle size={12} />
          <span>{error ? '1' : '0'}</span>
          <AlertTriangle size={12} style={{ marginLeft: '4px' }} />
          <span>0</span>
        </div>
      </div>

      <div className="statusbar-item" style={{ cursor: 'default' }}>
        <span>Plain Language v0.1 (Rust Interpreter)</span>
      </div>

      <div className="statusbar-right">
        <div className="statusbar-item">
          <span>Ln {cursorPos.line}, Col {cursorPos.col}</span>
        </div>

        <div className="statusbar-item">
          <span>Spaces: 4</span>
        </div>

        <div className="statusbar-item">
          <span>UTF-8</span>
        </div>

        <div className="statusbar-item">
          <span>Plain English</span>
        </div>

        <div
          className="statusbar-item"
          style={{
            background: engineMode === 'rust' ? 'rgba(0,0,0,0.2)' : 'rgba(245, 158, 11, 0.3)'
          }}
          title={engineMode === 'rust' ? 'Running on native Rust binary' : 'Running on Web Simulator'}
        >
          <Cpu size={12} />
          <span>
            {engineMode === 'rust' ? 'Rust Native' : 'Web Simulator'}
            {executionTimeMs !== null ? ` (${executionTimeMs}ms)` : ''}
          </span>
        </div>
      </div>
    </footer>
  );
}

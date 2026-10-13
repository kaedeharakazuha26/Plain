import React, { useState } from 'react';
import { Layers, ChevronRight, ChevronDown, Code2 } from 'lucide-react';

function AstNodeCard({ node, index }) {
  const [expanded, setExpanded] = useState(true);

  let type = 'Statement';
  let badgeClass = 'ast-badge';
  let title = '';
  let details = null;

  if ('Set' in node) {
    type = 'Stmt::Set';
    badgeClass = 'ast-badge set';
    title = `set ${node.Set.name} to ...`;
    details = node.Set;
  } else if ('Say' in node) {
    type = 'Stmt::Say';
    badgeClass = 'ast-badge say';
    title = 'say <expr>';
    details = node.Say;
  } else if ('If' in node) {
    type = 'Stmt::If';
    badgeClass = 'ast-badge if';
    title = 'if <condition> ...';
    details = node.If;
  } else if ('Repeat' in node) {
    type = 'Stmt::Repeat';
    badgeClass = 'ast-badge repeat';
    title = 'repeat <times> ...';
    details = node.Repeat;
  } else if ('While' in node) {
    type = 'Stmt::While';
    badgeClass = 'ast-badge while';
    title = 'while <condition> ...';
    details = node.While;
  } else {
    title = JSON.stringify(node);
  }

  return (
    <div className="ast-node">
      <div
        className="ast-node-header"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {expanded ? <ChevronDown size={14} color="var(--text-dim)" /> : <ChevronRight size={14} color="var(--text-dim)" />}
          <span className={badgeClass}>{type}</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{title}</span>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>Node #{index + 1}</span>
      </div>

      {expanded && (
        <pre className="ast-json-pre">
          {JSON.stringify(details || node, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AstViewer({ ast = [] }) {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'raw'

  if (!ast || ast.length === 0) {
    return (
      <div className="console-empty">
        <Layers size={32} opacity={0.4} />
        <span>No AST available</span>
        <span style={{ fontSize: '11px' }}>Run valid Plain code to view the parsed Abstract Syntax Tree</span>
      </div>
    );
  }

  return (
    <div className="ast-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          Total AST Root Statements: <strong>{ast.length}</strong>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`btn-secondary ${viewMode === 'cards' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => setViewMode('cards')}
          >
            Visual Nodes
          </button>
          <button
            className={`btn-secondary ${viewMode === 'raw' ? 'active' : ''}`}
            style={{ padding: '3px 8px', fontSize: '11px' }}
            onClick={() => setViewMode('raw')}
          >
            Raw JSON
          </button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        ast.map((node, idx) => <AstNodeCard key={idx} node={node} index={idx} />)
      ) : (
        <pre className="ast-json-pre" style={{ maxHeight: '450px' }}>
          {JSON.stringify(ast, null, 2)}
        </pre>
      )}
    </div>
  );
}

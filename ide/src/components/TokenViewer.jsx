import React, { useState } from 'react';
import { Cpu, Search } from 'lucide-react';

function formatTokenKind(kind) {
  if (typeof kind === 'string') {
    return { name: kind, val: null };
  }
  if (typeof kind === 'object' && kind !== null) {
    const key = Object.keys(kind)[0];
    return { name: key, val: String(kind[key]) };
  }
  return { name: String(kind), val: null };
}

export default function TokenViewer({ tokens = [] }) {
  const [filter, setFilter] = useState('');
  const [hideNewlines, setHideNewlines] = useState(true);

  if (!tokens || tokens.length === 0) {
    return (
      <div className="console-empty">
        <Cpu size={32} opacity={0.4} />
        <span>No tokens generated</span>
        <span style={{ fontSize: '11px' }}>Run your code to inspect tokens from src/lexer.rs</span>
      </div>
    );
  }

  const filteredTokens = tokens.filter((tok) => {
    const { name, val } = formatTokenKind(tok.kind);
    if (hideNewlines && (name === 'Newline' || name === 'Eof')) {
      return false;
    }
    if (!filter) return true;
    const query = filter.toLowerCase();
    return (
      name.toLowerCase().includes(query) ||
      (val && val.toLowerCase().includes(query)) ||
      String(tok.line).includes(query)
    );
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            placeholder="Filter tokens (e.g. Set, Ident, line)..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%',
              background: '#090e18',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '6px 12px',
              fontSize: '12px',
              color: 'var(--text-main)',
              outline: 'none'
            }}
          />
        </div>

        <button
          className={`btn-secondary ${hideNewlines ? 'active' : ''}`}
          style={{ padding: '6px 10px', fontSize: '11px' }}
          onClick={() => setHideNewlines(!hideNewlines)}
        >
          {hideNewlines ? 'Showing Code Tokens' : 'Showing All (incl. Newlines)'}
        </button>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginBottom: '8px' }}>
        Displaying <strong>{filteredTokens.length}</strong> of <strong>{tokens.length}</strong> tokens:
      </div>

      <div className="token-grid">
        {filteredTokens.map((tok, idx) => {
          const { name, val } = formatTokenKind(tok.kind);
          return (
            <div key={idx} className="token-chip">
              <span className="tok-line">L{tok.line}</span>
              <span className="tok-kind">{name}</span>
              {val !== null && <span className="tok-val">"{val}"</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { Database } from 'lucide-react';

export default function VariablesInspector({ variables = {} }) {
  const entries = Object.entries(variables || {});

  if (entries.length === 0) {
    return (
      <div className="console-empty">
        <Database size={32} opacity={0.4} />
        <span>No variables stored</span>
        <span style={{ fontSize: '11px' }}>Variables created using <code>set [name] to [value]</code> will appear here</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Active variables in memory: <strong>{entries.length}</strong>
      </div>

      <table className="var-table">
        <thead>
          <tr>
            <th>Variable Name</th>
            <th>Type</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, val]) => {
            let type = 'unknown';
            let displayVal = '';

            if (typeof val === 'object' && val !== null) {
              if ('Number' in val) {
                type = 'number';
                displayVal = String(val.Number);
              } else if ('Text' in val) {
                type = 'text';
                displayVal = `"${val.Text}"`;
              } else if ('Bool' in val) {
                type = 'boolean';
                displayVal = String(val.Bool);
              }
            } else {
              displayVal = String(val);
            }

            return (
              <tr key={name}>
                <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{name}</td>
                <td>
                  <span className="var-type-badge">{type}</span>
                </td>
                <td style={{ color: type === 'text' ? 'var(--text-string)' : type === 'number' ? 'var(--text-number)' : 'var(--text-main)' }}>
                  {displayVal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

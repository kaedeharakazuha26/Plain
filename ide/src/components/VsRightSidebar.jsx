import React from 'react';
import { BookOpen, Sparkles, Plus, Code, HelpCircle, X } from 'lucide-react';
import GrammarDocs from './GrammarDocs';

export default function VsRightSidebar({
  onInsertSnippet,
  onClose
}) {
  const quickConstructs = [
    { label: 'set x to ...', code: 'set variable_name to 10\n' },
    { label: 'say ...', code: 'say "Hello, Plain!"\n' },
    { label: 'if ... end', code: 'if age is above 18\n    say "Adult"\nend\n' },
    { label: 'if ... otherwise ...', code: 'if score is at least 80\n    say "Passed"\notherwise\n    say "Failed"\nend\n' },
    { label: 'repeat n times', code: 'repeat 3 times\n    say "Hi"\nend\n' },
    { label: 'while loop', code: 'while count is below 5\n    set count to count + 1\nend\n' },
    { label: 'is above', code: 'if price is above 100\n' },
    { label: 'is at least', code: 'if score is at least 90\n' },
    { label: 'is equal to', code: 'if role is equal to "admin"\n' },
  ];

  return (
    <aside className="vs-right-sidebar">
      <div className="right-sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={13} color="var(--accent-cyan)" />
          <span>English Assistant</span>
        </div>
        <button
          className="dock-action-btn"
          onClick={onClose}
          title="Close Assistant"
        >
          <X size={13} />
        </button>
      </div>

      <div className="right-sidebar-content">
        {/* Quick Sentence Builder */}
        <div className="assistant-card">
          <h4>
            <Plus size={13} />
            <span>Sentence Builder</span>
          </h4>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Click any sentence construct to insert it at cursor in the code editor:
          </p>

          <div className="snippet-buttons-grid">
            {quickConstructs.map((item, idx) => (
              <button
                key={idx}
                className="btn-snippet-item"
                onClick={() => onInsertSnippet(item.code)}
                title={`Insert: ${item.code}`}
              >
                + {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* English Syntax Reference */}
        <div className="assistant-card">
          <GrammarDocs onInsert={onInsertSnippet} />
        </div>
      </div>
    </aside>
  );
}

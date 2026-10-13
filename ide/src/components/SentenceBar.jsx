import React from 'react';
import { Plus } from 'lucide-react';

export default function SentenceBar({ onInsert }) {
  const templates = [
    { label: 'set variable', code: 'set variable_name to 10\n', kw: 'set' },
    { label: 'say text', code: 'say "Hello, Plain!"\n', kw: 'say' },
    { label: 'if condition', code: 'if x is above 10\n    say "Large"\notherwise\n    say "Small"\nend\n', kw: 'if' },
    { label: 'repeat loop', code: 'repeat 3 times\n    say "Looping..."\nend\n', kw: 'repeat' },
    { label: 'while loop', code: 'while counter is below 5\n    set counter to counter + 1\nend\n', kw: 'while' },
    { label: 'is at least', code: 'if score is at least 50\n    say "Passed"\nend\n', kw: 'is at least' }
  ];

  return (
    <div className="sentence-bar">
      <span className="sentence-bar-label">Sentence Snippets:</span>
      {templates.map((tpl, idx) => (
        <button
          key={idx}
          className="sentence-chip"
          onClick={() => onInsert(tpl.code)}
          title={`Insert ${tpl.label}`}
        >
          <Plus size={11} />
          <span className="kw">{tpl.kw}</span>
          <span>{tpl.label.replace(tpl.kw, '').trim()}</span>
        </button>
      ))}
    </div>
  );
}

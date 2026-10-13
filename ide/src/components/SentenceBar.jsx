import React from 'react';
import { Plus } from 'lucide-react';

export default function SentenceBar({ onInsert }) {
  const templates = [
    { label: 'set variable', code: 'set variable_name to 10\n', kw: 'set' },
    { label: 'say text', code: 'say "Hello, Plain!"\n', kw: 'say' },
    { label: 'define function', code: 'define greet with name\n    say "Hello, " + uppercase of name\nend\n', kw: 'define' },
    { label: 'call function', code: 'set result to call add_nums with 5, 10\n', kw: 'call' },
    { label: 'set list', code: 'set scores to [80, 90, 75]\n', kw: 'list' },
    { label: 'add to list', code: 'add 100 to scores\n', kw: 'add' },
    { label: 'for each loop', code: 'for each item in scores\n    say item\nend\n', kw: 'for each' },
    { label: 'if otherwise if', code: 'if age is between 13 and 19\n    say "teenager"\notherwise if age is at least 20\n    say "adult"\notherwise\n    say "kid"\nend\n', kw: 'if' },
    { label: 'increase variable', code: 'increase score by 10\n', kw: 'increase' },
    { label: 'ask user input', code: 'ask user_name with "What is your name?"\n', kw: 'ask' }
  ];

  return (
    <div className="sentence-bar">
      <span className="sentence-bar-label">v0.2 Sentence Snippets:</span>
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

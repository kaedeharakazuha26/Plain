import React from 'react';
import { BookOpen, PlusCircle } from 'lucide-react';

export default function GrammarDocs({ onInsert }) {
  const sections = [
    {
      title: '1. Variables & Assignment',
      desc: 'Declare or re-assign a variable in Plain English.',
      code: 'set user_name to "Alice"',
      insert: 'set score to 100\n'
    },
    {
      title: '2. Printing Output',
      desc: 'Print any expression, number, or combined text.',
      code: 'say "Score is " + score',
      insert: 'say "The current value is " + score\n'
    },
    {
      title: '3. Conditionals (If / Otherwise)',
      desc: 'Branch logic using English words. Then is optional.',
      code: 'if age is above 18\n    say "Adult"\notherwise\n    say "Minor"\nend',
      insert: 'if age is at least 18\n    say "Access granted"\notherwise\n    say "Access denied"\nend\n'
    },
    {
      title: '4. English Comparison Phrases',
      desc: 'Natural phrasing instead of cryptic symbols:',
      bulletPoints: [
        'is above (>)',
        'is below (<)',
        'is at least (>=)',
        'is at most (<=)',
        'is equal to (==)',
        'is not equal to (!=)',
        'is (=)'
      ],
      code: 'if score is at least 90 and score is below 100\n    say "Grade A"\nend',
      insert: 'if score is at least 90\n    say "Grade A"\nend\n'
    },
    {
      title: '5. Repeat Loop',
      desc: 'Run a code block a fixed number of times.',
      code: 'repeat 5 times\n    say "Hello!"\nend',
      insert: 'repeat 3 times\n    say "Hello loop"\nend\n'
    },
    {
      title: '6. While Loop (Guarded)',
      desc: 'Executes while condition is true. Protected with a 1,000,000-iteration safety stop.',
      code: 'while counter is below 10\n    set counter to counter + 1\nend',
      insert: 'while count is below 5\n    set count to count + 1\n    say "Count: " + count\nend\n'
    },
    {
      title: '7. Text Joining & Math',
      desc: 'The + operator automatically concatenates text and numbers!',
      code: 'say "Total cost: $" + (price * count)',
      insert: 'say "Total: " + (price * quantity)\n'
    }
  ];

  return (
    <div className="grammar-guide">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
        <BookOpen size={18} />
        <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Plain English Reference Guide (v0.1)</h2>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        Plain is designed to feel like readable English sentences. Click "Insert" on any card to insert snippet at your cursor.
      </p>

      {sections.map((sec, idx) => (
        <div key={idx} className="grammar-card">
          <h3>{sec.title}</h3>
          <p>{sec.desc}</p>
          {sec.bulletPoints && (
            <ul style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 10px 18px', lineHeight: 1.6 }}>
              {sec.bulletPoints.map((b, bIdx) => (
                <li key={bIdx}><code>{b}</code></li>
              ))}
            </ul>
          )}
          <div className="grammar-code-box">
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{sec.code}</pre>
            <button
              className="btn-insert-code"
              onClick={() => onInsert(sec.insert || sec.code + '\n')}
              title="Insert into editor"
            >
              <PlusCircle size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
              Insert
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

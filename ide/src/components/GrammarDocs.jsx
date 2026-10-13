import React from 'react';
import { BookOpen, PlusCircle } from 'lucide-react';

export default function GrammarDocs({ onInsert }) {
  const sections = [
    {
      title: '1. Variables & Shortcuts (v0.2)',
      desc: 'Declare, change, or increment variables.',
      code: 'set name to "jhomar"\nchange score to 100\nincrease lives by 2\ndecrease health by 10',
      insert: 'increase score by 5\n'
    },
    {
      title: '2. User Input (v0.2)',
      desc: 'Prompt the user for input. Automatically parses numbers or text.',
      code: 'ask age with "How old are you?"',
      insert: 'ask user_name with "What is your name?"\n'
    },
    {
      title: '3. Functions & Scopes (v0.2)',
      desc: 'Define custom functions with isolated scope and return values.',
      code: 'define add_numbers with a, b\n    return a plus b\nend\nset total to call add_numbers with 10, 20',
      insert: 'define greet with name\n    say "Hello, " + uppercase of name\nend\ncall greet with "Alex"\n'
    },
    {
      title: '4. Lists & For Each Loops (v0.2)',
      desc: 'Create lists with [], append with add, and iterate with for each.',
      code: 'set scores to [80, 90, 75]\nadd 100 to scores\nfor each s in scores\n    say s\nend',
      insert: 'set items to ["Apple", "Orange", "Banana"]\nfor each item in items\n    say item\nend\n'
    },
    {
      title: '5. List & Text Helpers (v0.2)',
      desc: 'Convenient 1-indexed English helpers.',
      bulletPoints: [
        'length of <list or text>',
        'first of <list or text>',
        'last of <list or text>',
        'item 2 of <list or text> (1-indexed)',
        'uppercase of <text>',
        'lowercase of <text>'
      ],
      code: 'say uppercase of "hello"\nsay length of scores\nsay first of scores\nsay item 2 of scores',
      insert: 'say "Length: " + length of scores\nsay "First: " + first of scores\n'
    },
    {
      title: '6. Chained Conditionals (v0.2)',
      desc: 'Branch logic using if ... otherwise if ... otherwise ... end.',
      code: 'if age is between 13 and 19\n    say "teenager"\notherwise if age is at least 20\n    say "adult"\notherwise\n    say "kid"\nend',
      insert: 'if age is between 13 and 19\n    say "teenager"\notherwise if age is at least 20\n    say "adult"\notherwise\n    say "kid"\nend\n'
    },
    {
      title: '7. English Comparisons & Math Words (v0.2)',
      desc: 'Natural phrasing instead of cryptic symbols:',
      bulletPoints: [
        'is between 13 and 19',
        'is above / is greater than (>)',
        'is below / is less than (<)',
        'is at least (>=) / is at most (<=)',
        'is equal to / is same as (==)',
        'is not equal to / is different from (!=)',
        'plus (+), minus (-), multiplied by (*), divided by (/)'
      ],
      code: 'set total to a plus (b multiplied by 2)\nif score is between 80 and 100\n    say "Honors"\nend',
      insert: 'if score is between 80 and 100\n    say "Grade: A"\nend\n'
    }
  ];

  return (
    <div className="grammar-guide">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
        <BookOpen size={18} />
        <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Plain Language Reference (v0.2)</h2>
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
        Plain v0.2 brings functions, lists, user input, helpers, and chained conditionals. Click "Insert" on any card to insert snippet at your cursor.
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

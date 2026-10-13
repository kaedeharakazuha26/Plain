import React, { useState } from 'react';
import {
  BookOpen,
  PlusCircle,
  Code,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Check
} from 'lucide-react';

export default function GrammarDocs({ onInsert }) {
  const [copiedSection, setCopiedSection] = useState(null);

  const sections = [
    {
      id: 'vars',
      tag: 'VARIABLES',
      title: '1. Variables & Value Shortcuts',
      desc: 'Declare new variables or modify existing ones using natural English keywords.',
      code: `set name to "jhomar"
change score to 100
increase lives by 1
decrease health by 10`,
      insert: 'set score to 100\nincrease score by 25\nsay "Final Score: " + score\n'
    },
    {
      id: 'io',
      tag: 'INPUT & OUTPUT',
      title: '2. Interactive Terminal Input & Output',
      desc: 'Prompt the user interactively in the bottom terminal. Type answers right into the console prompt!',
      code: `ask user_name with "What is your name?"
say "Hello, " + user_name

ask age with "How old are you?"
say "Next year you will be: " + (age plus 1)`,
      insert: 'ask user_name with "What is your name?"\nsay "Welcome, " + uppercase of user_name + "!"\n'
    },
    {
      id: 'functions',
      tag: 'FUNCTIONS',
      title: '3. Functions & Isolated Scope',
      desc: 'Define functions with parameters, local variables, and return values.',
      code: `define add_numbers with a, b
    return a plus b
end

set total to call add_numbers with 15, 35
say "The total is: " + total`,
      insert: `define greet with user_name
    say "Hello, " + uppercase of user_name
end

call greet with "jhomar"
`
    },
    {
      id: 'imports',
      tag: 'MODULES & IMPORTS',
      title: '4. Multi-File Imports & Integration',
      desc: 'Import another .plain file to call its functions and access its shared variables.',
      code: `import "examples/math_utils.plain"

set doubled to call double_number with 21
say "Doubled: " + doubled`,
      insert: `import "examples/math_utils.plain"
set doubled to call double_number with 21
say "Result: " + doubled
`
    },
    {
      id: 'lists',
      tag: 'LISTS',
      title: '4. Lists & For Each Iteration',
      desc: 'Create lists with square brackets, append items with "add ... to", and iterate with "for each".',
      code: `set scores to [80, 90, 75]
add 100 to scores

for each score in scores
    say "Score item: " + score
end`,
      insert: `set items to ["Laptop", "Mouse", "Keyboard"]
add "Headphones" to items

for each item in items
    say "Item in cart: " + item
end
`
    },
    {
      id: 'helpers',
      tag: 'HELPERS',
      title: '5. Text & List Built-in Helpers',
      desc: 'Convenient 1-indexed English shortcuts for reading lengths, items, and letter casing.',
      bulletPoints: [
        'length of <list or text> — Total count of items or characters',
        'first of <list or text> — The first element or letter',
        'last of <list or text> — The last element or letter',
        'item 2 of <list or text> — 1-indexed element access',
        'uppercase of <text> — Capitalize entire string',
        'lowercase of <text> — Lowercase entire string'
      ],
      code: `say "Upper: " + uppercase of "hello world"
say "Length: " + length of [10, 20, 30]
say "First: " + first of [10, 20, 30]
say "Item 2: " + item 2 of [10, 20, 30]`,
      insert: 'set fruits to ["Apple", "Banana", "Cherry"]\nsay "Count: " + length of fruits\nsay "First fruit: " + first of fruits\nsay "Second fruit: " + item 2 of fruits\n'
    },
    {
      id: 'conditionals',
      tag: 'LOGIC',
      title: '6. Chained Conditionals',
      desc: 'Branch logic naturally with "if", "otherwise if", "otherwise", and "end".',
      code: `if age is between 13 and 19
    say "Status: Teenager"
otherwise if age is at least 20
    say "Status: Adult"
otherwise
    say "Status: Kid"
end`,
      insert: `set age to 16
if age is between 13 and 19
    say "Status: Teenager"
otherwise if age is at least 20
    say "Status: Adult"
otherwise
    say "Status: Kid"
end
`
    },
    {
      id: 'comparisons',
      tag: 'OPERATORS',
      title: '7. English Comparisons & Math Words',
      desc: 'Readable English words replace complex symbolic operators.',
      bulletPoints: [
        'is between A and B — Inclusive range comparison',
        'is above / is greater than (>)',
        'is below / is less than (<)',
        'is at least (>=) / is at most (<=)',
        'is equal to / is same as (==)',
        'is not equal to / is different from (!=)',
        'plus (+), minus (-), multiplied by (*), divided by (/)'
      ],
      code: `set total to base plus (rate multiplied by 2)
if score is between 80 and 100
    say "Honor student!"
end`,
      insert: 'if score is at least 90 and score is at most 100\n    say "Grade: A"\nend\n'
    },
    {
      id: 'loops',
      tag: 'LOOPS',
      title: '8. Repeat & While Loops',
      desc: 'Traditional loop constructs for repeating fixed counts or conditional loops.',
      code: `repeat 3 times
    say "Echo!"
end

set count to 1
while count is at most 5
    say count
    increase count by 1
end`,
      insert: 'repeat 3 times\n    say "Hello from Plain!"\nend\n'
    }
  ];

  const handleInsert = (code, idx) => {
    onInsert(code);
    setCopiedSection(idx);
    setTimeout(() => setCopiedSection(null), 1500);
  };

  return (
    <div className="grammar-guide">
      <div className="reference-header-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)' }}>
          <BookOpen size={16} />
          <h3 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.02em' }}>
            Plain Language Reference (v0.2)
          </h3>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
          Plain turns basic English sentences into working programs. Explore syntax rules below or click <strong>Insert</strong> to test directly in your editor.
        </p>
      </div>

      <div className="reference-cards-list">
        {sections.map((sec, idx) => (
          <div key={sec.id} className="grammar-card">
            <div className="grammar-card-top">
              <span className="grammar-tag-badge">{sec.tag}</span>
              <span className="grammar-card-title">{sec.title}</span>
            </div>

            <p className="grammar-card-desc">{sec.desc}</p>

            {sec.bulletPoints && (
              <ul className="grammar-bullet-list">
                {sec.bulletPoints.map((b, bIdx) => (
                  <li key={bIdx}>{b}</li>
                ))}
              </ul>
            )}

            <div className="grammar-code-box">
              <pre><code>{sec.code}</code></pre>
              <button
                className={`btn-insert-code ${copiedSection === idx ? 'copied' : ''}`}
                onClick={() => handleInsert(sec.insert || sec.code + '\n', idx)}
                title="Insert snippet into code editor"
              >
                {copiedSection === idx ? (
                  <>
                    <Check size={11} />
                    <span>Inserted</span>
                  </>
                ) : (
                  <>
                    <PlusCircle size={11} />
                    <span>Insert</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

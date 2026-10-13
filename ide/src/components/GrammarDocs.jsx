import React, { useState } from 'react';
import {
  BookOpen,
  PlusCircle,
  Code,
  Terminal,
  Cpu,
  Layers,
  Sparkles,
  Check,
  FileText
} from 'lucide-react';

export default function GrammarDocs({ onInsert }) {
  const [copiedSection, setCopiedSection] = useState(null);

  const sections = [
    {
      id: 'compiler',
      tag: 'COMPILER (NEW IN v0.4)',
      title: '1. Rust Compiler (Transpiler)',
      desc: 'Plain translates your program into standalone Rust source code, and rustc builds a native standalone binary.',
      bulletPoints: [
        'cargo run -- compile <input.plain> [output.rs] — Emits standalone Rust with embedded Value runtime',
        'rustc output.rs -o binary — Produces native zero-dependency executable',
        'Compiler subset: set, say, if, repeat, while, functions, lists, math, interpolation, contains, starts/ends with, aggregations',
        'Interpreted and compiled executions produce byte-identical output'
      ],
      code: `# Run via compiler:
# cargo run -- compile examples/compile-demo.plain compiled.rs
# rustc compiled.rs -o demo && ./demo

set total to 10 plus 20
say "Compiled total is {total}"`,
      insert: 'set total to 10 plus 20\nsay "Compiled total is {total}"\n'
    },
    {
      id: 'interpolation',
      tag: 'INTERPOLATION (v0.4)',
      title: '2. Text String Interpolation',
      desc: 'Embed variables and record fields directly within strings using {name} and {field of record}.',
      bulletPoints: [
        '"{name}" — Automatically formats variable value into the text string',
        '"{field of record}" — Supports arbitrary nested field paths in interpolation',
        '"{{}}" — Double braces print literal curly braces in the text',
        'Unknown variable or field names produce clear diagnostic errors'
      ],
      code: `set user_name to "Ana"
set score to 95
say "Hello {user_name}, your score is {score} {{points}}!"

set person to record with name "Ana", address record with city "Cebu"
say "{name of person} lives in {city of address of person}"`,
      insert: 'set user to "Ana"\nset score to 100\nsay "Hello {user}, your final score is {score}!"\n'
    },
    {
      id: 'records',
      tag: 'RECORDS (v0.4)',
      title: '3. Records & Nested Records',
      desc: 'Create structured key-value records, nest records inside records, and mutate fields at any depth.',
      bulletPoints: [
        'record with key val, key val — Creates a dictionary-like record',
        '<field> of <record> — Reads the field value (e.g. name of person)',
        '<field> of <subfield> of <record> — Chained field access for nested structures',
        'set <field> of <subfield> of <record> to <val> — In-place field mutation',
        'Missing field errors list all available fields on the record'
      ],
      code: `set person to record with name "Ana", address record with city "Cebu", zip 6000
say city of address of person

set city of address of person to "Manila"
say "Updated: " + city of address of person`,
      insert: `set person to record with name "Ana", address record with city "Cebu", zip 6000
say "Resident: {name of person} in {city of address of person}"
set city of address of person to "Manila"
say "Moved to: {city of address of person}"
`
    },
    {
      id: 'files',
      tag: 'FILES (v0.4)',
      title: '4. File Operations & Line Iteration',
      desc: 'Save, append, load, and iterate over files line-by-line using natural English statements.',
      bulletPoints: [
        'save <expr> to file "<path>" — Writes content to file (creates or overwrites)',
        'append <expr> to file "<path>" — Appends new line with content to file',
        'load <name> from file "<path>" — Loads entire file content as text',
        'for each line in file "<path>" ... end — Iterates over file lines directly'
      ],
      code: `save "First line" to file "examples/people.txt"
append "Second line" to file "examples/people.txt"

for each line in file "examples/people.txt"
    say line
end`,
      insert: `save "Ana" to file "examples/people.txt"
append "Ben" to file "examples/people.txt"

for each line in file "examples/people.txt"
    say "Person: " + line
end
`
    },
    {
      id: 'text_tools',
      tag: 'TEXT TOOLS',
      title: '5. Text Analysis & String Tools',
      desc: 'Powerful English string manipulation helpers for searching, splitting, joining, and transforming.',
      bulletPoints: [
        'sentence contains "quick" — Substring check (returns true/false)',
        'sentence starts with "the" / sentence ends with "fox" — Prefix/suffix checks',
        'split <text> by "<delim>" — Splits string into list of parts',
        'join <list> with "<delim>" — Joins elements into single string',
        'replace <find> with <rep> in <text> — Replaces occurrences',
        'trim of <text>, reverse of <text>, uppercase of, lowercase of',
        'number of <text> — Converts text to numeric value',
        'text of <expr> — Converts value to text'
      ],
      code: `set sentence to "  the quick brown fox  "
set cleaned to trim of sentence

if cleaned contains "quick" and cleaned starts with "the"
    say "Search passed"
end

set words to split cleaned by " "
say "Replaced: " + replace "fox" with "dog" in cleaned`,
      insert: `set sentence to "the quick brown fox"
set words to split sentence by " "
say "Words count: " + length of words
say "Joined: " + join words with "-"
`
    },
    {
      id: 'list_tools',
      tag: 'LIST TOOLS',
      title: '6. Lists, Sorting & Aggregations',
      desc: 'Create lists, add or remove items, sort ascending/descending, and compute statistical aggregates.',
      bulletPoints: [
        '[a, b, c] — List literal syntax',
        'add <val> to <list> — Append element',
        'remove <val> from <list> / remove item <N> from <list> — Remove elements',
        'sort <list> / sort <list> descending — In-place list sorting',
        'sum of <list> — Sum of all numeric items',
        'average of <list> — Arithmetic mean of numeric items',
        'smallest of <list> / largest of <list> — Min/max values'
      ],
      code: `set scores to [80, 95, 60, 90]
add 100 to scores
sort scores

say "Sum: " + sum of scores
say "Average: " + average of scores
say "Smallest: " + smallest of scores
say "Largest: " + largest of scores`,
      insert: `set scores to [85, 92, 78, 95]
sort scores
say "Lowest score: " + smallest of scores
say "Highest score: " + largest of scores
say "Average score: " + average of scores
`
    },
    {
      id: 'functions',
      tag: 'FUNCTIONS',
      title: '7. Functions & Scopes',
      desc: 'Define custom functions with arguments, local scope, and return values.',
      bulletPoints: [
        'define <name> with <arg1>, <arg2> ... end — Declares function',
        'return <expr> — Returns value to caller',
        'call <name> with <arg1>, <arg2> — Invokes function'
      ],
      code: `define calculate_bonus with salary, rate
    return salary multiplied by rate
end

set bonus to call calculate_bonus with 2000, 0.15
say "Bonus: $" + bonus`,
      insert: `define greet with user_name
    say "Hello, {uppercase of user_name}!"
end

call greet with "jhomar"
`
    },
    {
      id: 'imports',
      tag: 'MODULES',
      title: '8. Multi-File Imports',
      desc: 'Import other .plain files to reuse shared functions and variables.',
      bulletPoints: [
        'import "<path.plain>" / include "<path>" — Imports module into workspace',
        'Functions in imported file become immediately callable',
        'Circular imports are automatically prevented'
      ],
      code: `import "examples/math_utils.plain"

set doubled to call double_number with 21
say "Doubled: " + doubled`,
      insert: `import "examples/math_utils.plain"
set doubled to call double_number with 21
say "Result: " + doubled
`
    },
    {
      id: 'io',
      tag: 'INPUT',
      title: '9. Interactive Terminal Input',
      desc: 'Prompt user interactively in the terminal. Type answers right into the console.',
      bulletPoints: [
        'ask <var> with "<prompt>" — Prompts user in terminal',
        'Numeric inputs are automatically parsed as numbers'
      ],
      code: `ask user_name with "What is your name?"
say "Welcome, " + user_name`,
      insert: 'ask user_name with "What is your name?"\nsay "Hello, {user_name}!"\n'
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
            Plain Language Reference (v0.4)
          </h3>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.5 }}>
          Complete guide to Plain v0.4 features: native compiler to Rust, string interpolation, nested records, file operations, and text/list helpers.
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

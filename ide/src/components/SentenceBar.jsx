import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  Plus,
  Play,
  Terminal,
  Layers,
  ChevronRight,
  Info,
  Code2,
  Check
} from 'lucide-react';

export default function SentenceBar({ onInsert }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedIdx, setCopiedIdx] = useState(null);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'modules', label: 'Imports' },
    { id: 'io', label: 'Input & Say' },
    { id: 'vars', label: 'Variables' },
    { id: 'functions', label: 'Functions' },
    { id: 'lists', label: 'Lists & Loops' },
    { id: 'logic', label: 'Conditionals' },
    { id: 'helpers', label: 'Helpers' }
  ];

  const snippets = [
    // Multi-file Modules & Imports
    {
      category: 'modules',
      keyword: 'import',
      title: 'Import another Plain file',
      description: 'Imports another .plain file to call its functions and access its shared variables.',
      code: 'import "examples/math_utils.plain"\n\nset doubled to call double_number with 21\nsay "21 doubled is: " + doubled\n'
    },
    {
      category: 'modules',
      keyword: 'include',
      title: 'Include helper module',
      description: 'Alternative English syntax to import reusable module code.',
      code: 'include "helpers.plain"\n\ncall setup_environment\n'
    },
    // Interactive I/O
    {
      category: 'io',
      keyword: 'ask',
      title: 'Ask for text input',
      description: 'Prompts the user interactively in the terminal and stores the answer in a variable.',
      code: 'ask user_name with "What is your name?"\nsay "Hello, " + user_name\n'
    },
    {
      category: 'io',
      keyword: 'ask number',
      title: 'Ask for number and do math',
      description: 'Prompts the user for a number. Automatically parsed as numeric so you can calculate with it immediately.',
      code: 'ask user_age with "How old are you?"\nsay "In 5 years you will be: " + (user_age plus 5)\n'
    },
    {
      category: 'io',
      keyword: 'say',
      title: 'Print text or value',
      description: 'Outputs text, variables, or expressions to the console.',
      code: 'say "Welcome to Plain Language!"\n'
    },
    // Variables
    {
      category: 'vars',
      keyword: 'set',
      title: 'Set variable',
      description: 'Creates or updates a variable with a value.',
      code: 'set player_score to 100\n'
    },
    {
      category: 'vars',
      keyword: 'increase',
      title: 'Increase variable shortcut',
      description: 'Increments a numeric variable by a specified amount.',
      code: 'increase player_score by 10\n'
    },
    {
      category: 'vars',
      keyword: 'decrease',
      title: 'Decrease variable shortcut',
      description: 'Decrements a numeric variable by a specified amount.',
      code: 'decrease lives by 1\n'
    },
    {
      category: 'vars',
      keyword: 'change',
      title: 'Change variable',
      description: 'Updates an existing variable to a new value.',
      code: 'change status to "ready"\n'
    },
    // Functions
    {
      category: 'functions',
      keyword: 'define',
      title: 'Define function (v0.2)',
      description: 'Declares a custom function with isolated local scope.',
      code: 'define greet with name\n    say "Hello, " + uppercase of name\nend\n'
    },
    {
      category: 'functions',
      keyword: 'call',
      title: 'Call function (v0.2)',
      description: 'Invokes a function and passes arguments.',
      code: 'call greet with "Alex"\n'
    },
    {
      category: 'functions',
      keyword: 'define multi-arg',
      title: 'Function with multiple arguments',
      description: 'Defines a custom function that takes multiple comma-separated arguments after with.',
      code: 'define calc_area with length, width\n    return length multiplied by width\nend\n\nset room_area to call calc_area with 12, 10\nsay "Room area: " + room_area\n'
    },
    {
      category: 'functions',
      keyword: 'return',
      title: 'Return from function (v0.2)',
      description: 'Returns a calculated value back to the caller.',
      code: 'define add_bonus with score\n    return score plus 25\nend\nset final_score to call add_bonus with 100\n'
    },
    // Lists & Loops
    {
      category: 'lists',
      keyword: 'list',
      title: 'Create a list (v0.2)',
      description: 'Initializes a list with square bracket notation.',
      code: 'set scores to [85, 92, 78]\n'
    },
    {
      category: 'lists',
      keyword: 'item of',
      title: 'Access item by 1-indexed number',
      description: 'Pulls a specific element from a list starting from index 1.',
      code: 'set inventory to ["Sword", "Shield", "Potion"]\nsay "Equipped: " + item 1 of inventory\nsay "Secondary: " + item 2 of inventory\n'
    },
    {
      category: 'lists',
      keyword: 'add to',
      title: 'Append item to list (v0.2)',
      description: 'Adds a new item to an existing list.',
      code: 'add 95 to scores\n'
    },
    {
      category: 'lists',
      keyword: 'for each',
      title: 'Iterate with for each (v0.2)',
      description: 'Loops through each item in a list with an iterator variable.',
      code: 'for each item in scores\n    say "Score: " + item\nend\n'
    },
    // Conditionals
    {
      category: 'logic',
      keyword: 'if chained',
      title: 'If ... otherwise if ... otherwise (v0.2)',
      description: 'Chained conditional branching for multiple cases.',
      code: 'if age is between 13 and 19\n    say "Teenager"\notherwise if age is at least 20\n    say "Adult"\notherwise\n    say "Child"\nend\n'
    },
    {
      category: 'logic',
      keyword: 'repeat',
      title: 'Repeat loop',
      description: 'Executes a block of code a set number of times.',
      code: 'repeat 3 times\n    say "Plain is simple and fun!"\nend\n'
    },
    {
      category: 'logic',
      keyword: 'while',
      title: 'While loop',
      description: 'Repeats execution while a condition remains true.',
      code: 'while count is below 5\n    say count\n    increase count by 1\nend\n'
    },
    // Helpers
    {
      category: 'helpers',
      keyword: 'helpers',
      title: 'Text & List Helpers (v0.2)',
      description: 'English shortcuts for lengths, casing, and index lookups.',
      code: 'say "Length: " + length of scores\nsay "First: " + first of scores\nsay "Upper: " + uppercase of "hello"\n'
    },
    {
      category: 'helpers',
      keyword: 'comparisons',
      title: 'English Math & Comparisons (v0.2)',
      description: 'Natural English words for comparisons and arithmetic.',
      code: 'if score is between 80 and 100\n    say "Honor Roll"\nend\n'
    }
  ];

  const filtered = activeCategory === 'all'
    ? snippets
    : snippets.filter(s => s.category === activeCategory);

  const handleInsertClick = (code, idx) => {
    onInsert(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="sentence-builder-wrapper">
      {/* 1. Instruction Card */}
      <div className="builder-instructions-card">
        <div className="instructions-title">
          <Info size={14} color="var(--accent-cyan)" />
          <span>How to Build Plain Sentences</span>
        </div>
        <ol className="instructions-steps">
          <li>
            <strong>1. Click to Insert:</strong> Click any snippet below to insert valid English syntax directly into your active code.
          </li>
          <li>
            <strong>2. Customize Placeholders:</strong> Change variable names (e.g. <code>user_name</code>) and values (e.g. <code>"What is your name?"</code>).
          </li>
          <li>
            <strong>3. Chain Sentences:</strong> Place each sentence on its own line (e.g. <code>ask</code> followed by <code>say</code>).
          </li>
          <li>
            <strong>4. Interactive Terminal:</strong> When your program asks for input, you can type your answer right in the terminal dock and press <kbd>Enter</kbd>!
          </li>
        </ol>
      </div>

      {/* 2. Category Filters */}
      <div className="builder-category-tabs">
        {categories.map(cat => (
          <button
            key={cat.id}
            className={`builder-tab-btn ${activeCategory === cat.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 3. Snippets Grid */}
      <div className="builder-snippets-list">
        {filtered.map((item, idx) => (
          <div key={idx} className="builder-snippet-card">
            <div className="snippet-card-header">
              <span className="snippet-kw-badge">{item.keyword}</span>
              <span className="snippet-title-text">{item.title}</span>
            </div>

            <p className="snippet-desc-text">{item.description}</p>

            <pre className="snippet-code-preview">
              <code>{item.code.trim()}</code>
            </pre>

            <button
              className={`btn-insert-snippet ${copiedIdx === idx ? 'inserted' : ''}`}
              onClick={() => handleInsertClick(item.code, idx)}
              title="Insert into editor"
            >
              {copiedIdx === idx ? (
                <>
                  <Check size={12} />
                  <span>Inserted!</span>
                </>
              ) : (
                <>
                  <Plus size={12} />
                  <span>Insert Sentence</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

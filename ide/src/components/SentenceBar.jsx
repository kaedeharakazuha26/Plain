import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Check,
  Code2,
  Terminal,
  Layers,
  FileText
} from 'lucide-react';

export default function SentenceBar({ onInsert }) {
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedIdx, setCopiedIdx] = useState(null);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'v04', label: 'v0.4 New' },
    { id: 'records', label: 'Records' },
    { id: 'files', label: 'Files' },
    { id: 'text', label: 'Text Tools' },
    { id: 'lists', label: 'Lists & Stats' },
    { id: 'functions', label: 'Functions' },
    { id: 'io', label: 'Input & Say' },
    { id: 'logic', label: 'Conditionals' }
  ];

  const snippets = [
    // v0.4 Interpolation & Compiler
    {
      category: 'v04',
      keyword: 'interpolation',
      title: 'String text interpolation',
      description: 'Embed variables and expressions directly inside text quotes with {expr}.',
      code: 'set user to "Ana"\nset score to 100\nsay "Hello {user}, your score is {score}!"\n'
    },
    {
      category: 'v04',
      keyword: 'compile',
      title: 'Compile Plain to standalone Rust',
      description: 'Translates Plain code into standalone Rust source that rustc builds into a native executable.',
      code: '# In your terminal:\n# cargo run -- compile examples/compile-demo.plain compiled.rs\n# rustc compiled.rs -o demo && ./demo\n'
    },
    // Records & Nested Records
    {
      category: 'records',
      keyword: 'record with',
      title: 'Create nested record',
      description: 'Defines a key-value record with sub-records inside it.',
      code: 'set person to record with name "Ana", address record with city "Cebu", zip 6000\nsay "{name of person} lives in {city of address of person}"\n'
    },
    {
      category: 'records',
      keyword: 'field of',
      title: 'Read nested record field',
      description: 'Reads a field from a record using chained English "field of record" phrasing.',
      code: 'say city of address of person\n'
    },
    {
      category: 'records',
      keyword: 'set field of',
      title: 'Mutate nested record field',
      description: 'Updates a specific nested field inside a record in place.',
      code: 'set city of address of person to "Manila"\nsay "Updated city: {city of address of person}"\n'
    },
    {
      category: 'records',
      keyword: 'records in list',
      title: 'List of records iteration',
      description: 'Store multiple records inside a list and loop through them with for each.',
      code: 'set people to [record with name "Ana", age 21, record with name "Ben", age 17]\nfor each p in people\n    say "{name of p} is {age of p}"\nend\n'
    },
    // File operations
    {
      category: 'files',
      keyword: 'for each line',
      title: 'Read file line-by-line',
      description: 'Iterates through each line in a text file without loading the entire file into memory at once.',
      code: 'for each line in file "examples/people.txt"\n    say line\nend\n'
    },
    {
      category: 'files',
      keyword: 'save to file',
      title: 'Save text to file',
      description: 'Writes content to the specified file path, creating or replacing it.',
      code: 'save "First line of notes" to file "examples/notes.txt"\n'
    },
    {
      category: 'files',
      keyword: 'append to file',
      title: 'Append line to file',
      description: 'Appends a new line with content to the file.',
      code: 'append "Appended line" to file "examples/notes.txt"\n'
    },
    {
      category: 'files',
      keyword: 'load from file',
      title: 'Load file content',
      description: 'Reads the entire file content into a text variable.',
      code: 'load notes from file "examples/notes.txt"\nsay notes\n'
    },
    // Text tools
    {
      category: 'text',
      keyword: 'contains',
      title: 'Substring matching',
      description: 'Checks if text contains a substring, or if a list contains an item.',
      code: 'set text to "the quick brown fox"\nif text contains "quick" and text starts with "the"\n    say "Matched!"\nend\n'
    },
    {
      category: 'text',
      keyword: 'split by',
      title: 'Split text into list',
      description: 'Splits a text string by a delimiter into a list of words or parts.',
      code: 'set words to split "apple,banana,cherry" by ","\nsay "Word count: " + length of words\n'
    },
    {
      category: 'text',
      keyword: 'join with',
      title: 'Join list into text',
      description: 'Joins elements of a list into a single string separated by a delimiter.',
      code: 'set tags to ["rust", "plain", "compiler"]\nsay "Tags: " + join tags with " #"\n'
    },
    {
      category: 'text',
      keyword: 'replace with in',
      title: 'Replace text occurrences',
      description: 'Replaces all occurrences of a search string with a new replacement.',
      code: 'set updated to replace "fox" with "dog" in "the quick brown fox"\nsay updated\n'
    },
    {
      category: 'text',
      keyword: 'trim of',
      title: 'Trim whitespace',
      description: 'Trims leading and trailing whitespace from text.',
      code: 'set clean to trim of "  hello world  "\nsay clean\n'
    },
    // Lists & Aggregations
    {
      category: 'lists',
      keyword: 'sum of',
      title: 'Sum and average of list',
      description: 'Computes statistical totals directly in English without manual loops.',
      code: 'set scores to [85, 90, 95]\nsay "Sum: " + sum of scores\nsay "Average: " + average of scores\n'
    },
    {
      category: 'lists',
      keyword: 'smallest of',
      title: 'Smallest and largest item',
      description: 'Finds minimum or maximum values in a list.',
      code: 'set scores to [22, 18, 31, 25]\nsay "Lowest: " + smallest of scores\nsay "Highest: " + largest of scores\n'
    },
    {
      category: 'lists',
      keyword: 'sort',
      title: 'Sort list in place',
      description: 'Sorts list items ascending or descending.',
      code: 'set scores to [90, 60, 85, 100]\nsort scores descending\nsay "Rankings: " + scores\n'
    },
    // Functions
    {
      category: 'functions',
      keyword: 'define',
      title: 'Function with parameters & return',
      description: 'Creates a callable function with parameters, local scope, and return value.',
      code: 'define calculate_tax with amount, rate\n    return amount multiplied by rate\nend\n\nset tax to call calculate_tax with 100, 0.12\nsay "Tax: $" + tax\n'
    },
    // I/O & Interactive Input
    {
      category: 'io',
      keyword: 'ask',
      title: 'Interactive terminal input',
      description: 'Prompts user interactively in the terminal and stores the answer in a variable.',
      code: 'ask user_name with "What is your name?"\nsay "Hello, {user_name}!"\n'
    },
    {
      category: 'io',
      keyword: 'say',
      title: 'Output text or expression',
      description: 'Prints strings, variables, or math results to stdout.',
      code: 'say "Welcome to Plain v0.4!"\n'
    },
    // Logic
    {
      category: 'logic',
      keyword: 'if between',
      title: 'Range condition check',
      description: 'Checks if a number falls inclusively within a min and max range.',
      code: 'set age to 16\nif age is between 13 and 19\n    say "Teenager"\notherwise\n    say "Other age"\nend\n'
    }
  ];

  const filteredSnippets = activeCategory === 'all'
    ? snippets
    : snippets.filter(s => s.category === activeCategory);

  const handleSnippetClick = (code, idx) => {
    onInsert(code);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="sentence-builder-wrapper">
      {/* Instructions Card */}
      <div className="builder-instructions-card">
        <div className="instructions-title">
          <Sparkles size={14} color="var(--accent-cyan)" />
          <span>How to use Sentence Builder (v0.4)</span>
        </div>
        <ul className="instructions-steps">
          <li>1. Filter by category tab below or browse <code>All</code>.</li>
          <li>2. Click the <strong>Insert</strong> button on any sentence block to place it at your editor cursor.</li>
          <li>3. Press <kbd>Ctrl+S</kbd> to save, or run directly in the terminal below!</li>
        </ul>
      </div>

      {/* Category Tabs */}
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

      {/* Snippets List */}
      <div className="builder-snippets-list">
        {filteredSnippets.map((item, idx) => (
          <div key={idx} className="builder-snippet-card">
            <div className="snippet-card-header">
              <span className="snippet-kw-badge">{item.keyword}</span>
              <span className="snippet-title-text">{item.title}</span>
            </div>

            <p className="snippet-desc-text">{item.description}</p>

            <div className="snippet-code-preview">
              <code>{item.code.trim()}</code>
            </div>

            <button
              className={`btn-insert-snippet ${copiedIdx === idx ? 'inserted' : ''}`}
              onClick={() => handleSnippetClick(item.code, idx)}
              title="Insert snippet into code editor"
            >
              {copiedIdx === idx ? (
                <>
                  <Check size={11} />
                  <span>Inserted!</span>
                </>
              ) : (
                <>
                  <Plus size={11} />
                  <span>Insert</span>
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

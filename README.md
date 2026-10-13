# Plain — A Tiny English-like Programming Language, in Rust (v0.4)

[![Language](https://img.shields.io/badge/Language-Plain%20v0.4-00d2ff?style=flat-square)](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/src/lib.rs)
[![Rust](https://img.shields.io/badge/Backend-Rust%202021-f74c00?style=flat-square&logo=rust)](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/Cargo.toml)
[![Frontend](https://img.shields.io/badge/IDE-React%2019%20%2B%20Vite%208-61dafb?style=flat-square&logo=react)](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/ide/package.json)
[![Desktop](https://img.shields.io/badge/Desktop-Tauri%20v2-24c8db?style=flat-square&logo=tauri)](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/ide/src-tauri)
[![Tests](https://img.shields.io/badge/Tests-15%20Passing-4ade80?style=flat-square)](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/src/main.rs#L180)

**Plain** is an English-like programming language implemented in Rust. You write clean, natural English sentences that read like human instructions. 

Plain can execute your programs in two distinct ways:

1. **Interpreter**: A Rust tree-walking runtime reads, validates, and runs your `.plain` files directly with instant feedback and interactive terminal input.
2. **Compiler (New in v0.4)**: Plain translates your code into clean, standalone Rust source code, and `rustc` compiles it into a native, standalone binary that needs zero external crates.

```plain
set person to record with name "Ana", address record with city "Cebu", zip 6000
say "Hello, {name of person} from {city of address of person}!"

save "Ana" to file "examples/people.txt"
append "Ben" to file "examples/people.txt"

for each line in file "examples/people.txt"
    say "Line from file: " + line
end
```

---

## Table of Contents

- [How Plain Works](#how-plain-works)
- [Prerequisites & Installing Dependencies](#prerequisites--installing-dependencies)
- [Running Plain (CLI)](#running-plain-cli)
  - [Interpreter](#1-interpreter)
  - [Compiler (Plain to Rust)](#2-compiler-new-in-v04)
  - [Interactive Testing](#3-running-tests)
- [Modern VS Code IDE & Desktop App](#modern-vs-code-ide--desktop-app)
- [Language Syntax Reference](#language-syntax-reference)
  - [1. Text String Interpolation (v0.4)](#1-text-string-interpolation-new-in-v04)
  - [2. Records & Nested Records (v0.4)](#2-records--nested-records-new-in-v04)
  - [3. File Operations (v0.4)](#3-file-operations-new-in-v04)
  - [4. Variables & Numbers](#4-variables--numbers)
  - [5. Interactive Terminal Input & Output](#5-interactive-terminal-input--output)
  - [6. Functions & Local Scope](#6-functions--local-scope)
  - [7. Modules & Multi-File Imports](#7-modules--multi-file-imports)
  - [8. Lists & Sorting](#8-lists--sorting)
  - [9. Statistical Aggregations](#9-statistical-aggregations)
  - [10. Text Helpers & String Tools](#10-text-helpers--string-tools)
  - [11. Control Flow & Loops](#11-control-flow--loops)
  - [12. English Comparisons & Word Math](#12-english-comparisons--word-math)
- [Project Structure](#project-structure)
- [Examples Tour](#examples-tour)
- [Ideas for v0.5](#ideas-for-v05)

---

## How Plain Works

Plain processes code through a modular architecture:

```
                      your .plain source code
                                │
                                ▼
                       ┌─────────────────┐
                       │    lexer.rs     │  (Character scan → Token stream)
                       └────────┬────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │    parser.rs    │  (Recursive descent → Typed AST)
                       └────────┬────────┘
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
      ┌─────────────────────┐       ┌─────────────────────┐
      │   interpreter.rs    │       │    transpile.rs     │ (New in v0.4)
      │  (Tree-walk runtime │       │ (Emits standalone   │
      │   & memory scopes)  │       │  Rust source code)  │
      └──────────┬──────────┘       └──────────┬──────────┘
                 │                             │
                 ▼                             ▼
          Direct Output                 rustc demo.rs -o demo
                                               │
                                               ▼
                                         Native Binary
```

1. **[`lexer.rs`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/src/lexer.rs)**: Tokenizes Plain syntax into semantic tokens (`Set`, `Say`, `Record`, `Save`, `InterpolatedText`, `Ident`, etc.) with accurate line numbers and comment handling (`#`).
2. **[`parser.rs`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/src/parser.rs)**: Parses token streams into typed Abstract Syntax Tree (AST) nodes defined in [`ast.rs`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/src/ast.rs). Parses nested records, operator precedence, string interpolation `{expr}`, and natural comparison phrases (`is between`, `is greater than`).
3. **[`interpreter.rs`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/src/interpreter.rs)**: Walks AST nodes directly. Manages lexically scoped variable frames, function calls, recursive field access, file streams, and interactive I/O.
4. **[`transpile.rs`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/src/transpile.rs)**: Emits standalone, valid Rust source code bundled with a lightweight `Value` runtime. Generates native code that needs no external crates.

---

## Prerequisites & Installing Dependencies

### 1. Rust Toolchain (Compiler & Runtime)

Install Rust using `rustup`:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

Verify installation:
```bash
cargo --version   # cargo 1.75+ recommended
rustc --version   # rustc 1.75+ recommended
```

### 2. Node.js & npm (For the IDE)

The web IDE and desktop app require Node.js (v18 or higher):

```bash
# Check version:
node --version
npm --version
```

### 3. Tauri v2 Desktop Dependencies (Linux Only)

If running the native desktop app on Linux, install required webview libraries:

```bash
sudo apt update
sudo apt install -y libwebkit2gtk-4.1-dev build-essential curl wget file \
    libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

### 4. Clone & Install Project

```bash
git clone <repo-url> plain-lang
cd plain-lang

# Install IDE frontend dependencies
cd ide
npm install
cd ..
```

---

## Running Plain (CLI)

### 1. Interpreter

Run `.plain` files directly:

```bash
cargo run                            # Runs built-in demo
cargo run -- examples/hello.plain    # v0.1: Basics, loops, conditionals
cargo run -- examples/features.plain # v0.2: Functions, lists, comparisons
cargo run -- examples/v03.plain      # v0.3: Records, text tools, aggregations
cargo run -- examples/v04.plain      # v0.4: Interpolation, nested records, file iteration
cargo run -- examples/ask.plain      # Interactive prompt demo
```

Run one-liner code directly from the command line:

```bash
cargo run -- -e 'say "Hello from Plain!"'
```

### 2. Compiler (New in v0.4)

Translate a `.plain` program to standalone Rust and compile it to a native binary:

```bash
# Step 1: Transpile Plain to standalone Rust source
cargo run -- compile examples/compile-demo.plain compiled.rs

# Step 2: Compile with rustc (requires no crates)
rustc compiled.rs -o demo

# Step 3: Run the native executable
./demo
```

> [!NOTE]
> If you omit the output filename (`cargo run -- compile examples/compile-demo.plain`), Plain prints the generated Rust code directly to stdout.

#### Compiler Subset Details
- **Compiles natively**: `set/change`, `say`, `if/otherwise if/otherwise`, `repeat ... times`, `while`, `increase/decrease`, `add ... to`, `define/call/return`, lists `[...]`, all math/comparisons/logic, `contains / starts with / ends with`, `length/first/last/item/sum/average/uppercase/lowercase of`, and `{name}` string interpolation.
- **Interpreter-only in v0.4**: `ask`, records, `for each`, files, `split/join/replace`, `smallest/largest/reverse/trim of`, and `number of / text of`. Attempting to compile these features returns a clear error naming the feature instead of emitting broken Rust code.
- **Byte-identical guarantee**: Running [`compile-demo.plain`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/examples/compile-demo.plain) through the interpreter and through the compiler produces byte-identical output.

### 3. Running Tests

Run the full automated test suite (15 integration & unit tests):

```bash
cargo test
```

All 15 tests verify lexing, parsing, scope isolation, imports, record nesting, string interpolation, file I/O, list aggregations, and transpile compilation with `rustc`.

---

## Modern VS Code IDE & Desktop App

Plain includes a dedicated visual IDE modeled after VS Code. It is built using React 19, Vite 8, and Tauri v2.

```bash
# Option A: Run IDE in browser:
./start-ide.sh
# or:
npm run ide                          # Starts on http://localhost:5173

# Option B: Run as native Desktop App (Tauri v2):
npm run tauri:dev

# Option C: Build standalone production binaries:
npm run ide:build                    # Builds web bundle in ide/dist
npm run tauri:build                  # Builds Linux .deb, .AppImage, or Windows installer
```

### IDE Features & Layout

```
┌──────┬───────────────┬─────────────────────────────────┬──────────────────────┐
│ ICON │ FILE EXPLORER │        VS CODE EDITOR           │   ASSISTANT PANE     │
│  BAR │ ───────────── │ ─────────────────────────────── │ ──────────────────── │
│  🗂️  │ 📄 main.plain │ set user to "Ana"               │ ⚡ Sentence Builder  │
│  ✨  │ 📄 test.plain │ say "Hello {user}!"             │ 📖 Grammar Docs      │
│  📖  │               │                                 │ 🔬 Variables Table   │
│  ⚙️  │ [+] New File  │                                 │ 🌳 AST & Tokens      │
├──────┴───────────────┴─────────────────────────────────┴──────────────────────┤
│ BOTTOM DOCK: [>_ Terminal]  [📄 Output]  [⚠️ Problems]  [🔬 Tokens]  [🌳 AST]  │
│ plain@ide:~/workspace$ run                                                    │
│ Running main.plain with Plain interpreter...                                  │
│ Hello Ana!                                                                    │
└───────────────────────────────────────────────────────────────────────────────┘
```

1. **Top Menu & File Operations**:
   - **File Menu**: New File (<kbd>Ctrl+N</kbd>), Open File (<kbd>Ctrl+O</kbd>), Open Folder, Save (<kbd>Ctrl+S</kbd>), Save As (<kbd>Ctrl+Shift+S</kbd>), Close Tab (<kbd>Ctrl+W</kbd>).
   - **Engine Switcher**: Toggle between **🦀 Rust Native Backend** (direct subprocess) and **⚡ Web Simulator** (instant client-side fallback).
2. **File Explorer (Left Sidebar)**:
   - Create new `.plain` files inline.
   - Delete files with instant confirmation.
   - Smooth horizontal resizing (160px – 520px).
3. **Interactive Sentence Builder (Right Assistant)**:
   - Categorized English building blocks: v0.4 features, Records, Files, Text Tools, Lists, Functions, I/O.
   - Click any pattern to insert it directly at your editor cursor.
4. **Complete Grammar Reference**:
   - Interactive syntax reference cheatsheet with one-click code insertion.
5. **Real Embedded Terminal (xterm.js)**:
   - Full ANSI terminal emulator embedded inside the IDE.
   - Prompt: `plain@ide:~/workspace$ ` with command history (<kbd>↑</kbd>/<kbd>↓</kbd>).
   - Commands: `run` (runs active file), `plain <file.plain>`, `ls`, `cat`, `pwd`, `clear`.
   - Full support for interactive stdin inputs (`ask` prompt pause and resume).
6. **Diagnostic Inspectors**:
   - **Output**: Real-time stdout capture.
   - **Variables**: Live runtime variable state table.
   - **Tokens**: Token stream viewer.
   - **AST**: Visual tree inspector of parsed statements and expressions.

---

## Language Syntax Reference

### 1. Text String Interpolation (New in v0.4)

Embed variables and nested record fields directly inside double-quoted strings using `{expression}`:

```plain
set user_name to "Ana"
set score to 100
say "Hello {user_name}, your score is {score}"

set person to record with name "Ana", address record with city "Cebu"
say "{name of person} lives in {city of address of person}"
```

- Use `{{` and `}}` to print literal curly braces:
  ```plain
  say "JSON example: {{ \"status\": \"ok\" }}"
  # Output: JSON example: { "status": "ok" }
  ```
- Referencing an unknown variable inside `{...}` produces a runtime error.

---

### 2. Records & Nested Records (New in v0.4)

Records act as structured key-value dictionaries. They can be nested to any depth:

```plain
# Define a record with nested records
set person to record with name "Ana", address record with city "Cebu", zip 6000

# Access fields with English "of" chaining
say name of person
say city of address of person

# Mutate nested fields in place
set city of address of person to "Manila"
say city of address of person
```

#### Records in Lists
```plain
set people to [record with name "Ana", age 21, record with name "Ben", age 17]

for each p in people
    say "{name of p} is {age of p} years old"
end
```

> [!NOTE]
> Attempting to read a non-existent field reports an error listing all available fields on the record:
> `Record has no field 'country'. Available fields: address, name`

---

### 3. File Operations (New in v0.4)

#### Stream file line-by-line
```plain
for each line in file "examples/people.txt"
    say line
end
```

#### Save, Append, and Load
```plain
# Save (overwrites or creates file)
save "Header Line" to file "examples/log.txt"

# Append (adds content on a new line)
append "Entry 1" to file "examples/log.txt"
append "Entry 2" to file "examples/log.txt"

# Load entire file as text
load file_contents from file "examples/log.txt"
say file_contents
```

---

### 4. Variables & Numbers

```plain
set count to 10
change count to 20
increase count by 5     # count is now 25
decrease count by 3     # count is now 22
```

Numbers support decimals and standard math precedence.

---

### 5. Interactive Terminal Input & Output

```plain
ask user_name with "What is your name?"
say "Hello, {user_name}!"

ask age with "How old are you?"
# Typed numbers are automatically stored as numbers:
say "In 10 years you will be: " + (age plus 10)
```

---

### 6. Functions & Local Scope

Functions have their own isolated local variable scope and can return values:

```plain
define calculate_total with price, tax_rate
    return price plus (price multiplied by tax_rate)
end

set total to call calculate_total with 100, 0.12
say "Total amount: $" + total
```

---

### 7. Modules & Multi-File Imports

Split your code into reusable files and import them:

```plain
# math_utils.plain:
define multiply with a, b
    return a multiplied by b
end

# main.plain:
import "math_utils.plain"

set result to call multiply with 6, 7
say "Result: " + result
```

Plain automatically handles circular imports safely.

---

### 8. Lists & Sorting

```plain
set items to ["Laptop", "Keyboard", "Mouse"]
add "Headphones" to items

# Remove first matching element
remove "Mouse" from items

# Remove by 1-based index
remove item 1 from items

# In-place sorting
set scores to [90, 60, 85, 100]
sort scores              # [60, 85, 90, 100]
sort scores descending   # [100, 90, 85, 60]

# List iteration
for each item in items
    say "Item: " + item
end
```

---

### 9. Statistical Aggregations

Compute metrics over lists in English:

```plain
set numbers to [10, 20, 30, 40]

say sum of numbers          # 100
say average of numbers      # 25
say smallest of numbers     # 10
say largest of numbers      # 40
say length of numbers       # 4
say first of numbers        # 10
say last of numbers         # 40
say item 2 of numbers       # 20 (1-indexed)
```

> [!TIP]
> `sum` is usable both as a keyword in `sum of <list>` and as a standard variable name (`set sum to 0`).

---

### 10. Text Helpers & String Tools

```plain
set sentence to "  the quick brown fox  "
set cleaned to trim of sentence               # "the quick brown fox"

# Substring, prefix, suffix checks
if cleaned contains "quick" and cleaned starts with "the" and cleaned ends with "fox"
    say "Matches passed"
end

# Split string into list
set words to split cleaned by " "            # ["the", "quick", "brown", "fox"]

# Join list into string
set joined to join words with "-"             # "the-quick-brown-fox"

# String replacement
set replaced to replace "fox" with "dog" in cleaned # "the quick brown dog"

# Case transformations & conversions
say uppercase of "hello"                     # "HELLO"
say lowercase of "WORLD"                     # "world"
say reverse of "rust"                        # "tsur"
say number of "42"                           # 42 (numeric)
say text of 100                              # "100" (text)
```

---

### 11. Control Flow & Loops

```plain
# If - Otherwise If - Otherwise
set age to 16
if age is between 13 and 19
    say "Teenager"
otherwise if age is at least 20
    say "Adult"
otherwise
    say "Child"
end

# Repeat loop
repeat 3 times
    say "Hello!"
end

# While loop
set counter to 5
while counter is above 0
    say counter
    decrease counter by 1
end
```

---

### 12. English Comparisons & Word Math

Plain lets you use English words instead of cryptic symbols:

| English Phrase | Operator Equivalent | Example |
| :--- | :--- | :--- |
| `is between A and B` | `x >= A && x <= B` | `if score is between 80 and 100` |
| `is above` / `is greater than` | `>` | `if total is above 50` |
| `is below` / `is less than` | `<` | `if temp is below 0` |
| `is at least` | `>=` | `if count is at least 10` |
| `is at most` | `<=` | `if count is at most 100` |
| `is equal to` / `is same as` / `is` | `==` | `if status is "ready"` |
| `is not equal to` / `is different from` | `!=` | `if role is different from "admin"` |
| `plus` | `+` | `10 plus 5` |
| `minus` | `-` | `20 minus 8` |
| `multiplied by` | `*` | `6 multiplied by 7` |
| `divided by` | `/` | `100 divided by 4` |
| `and`, `or`, `not` | `&&`, `\|\|`, `!` | `if a is 1 and not b` |

---

## Project Structure

```
plain-lang/
├── Cargo.toml                  # Rust package definition (v0.4.0)
├── Cargo.lock                  # Pinned Rust dependencies
├── package.json                # Root workspace scripts (npm run ide, npm run tauri)
├── start-ide.sh                # Helper script to launch Rust build + Vite IDE
├── README.md                   # Complete Plain language & IDE documentation
│
├── src/                        # Core Plain Language implementation (Rust)
│   ├── ast.rs                  # AST structures (Value, BinOp, Expr, Stmt, InterpolatePart)
│   ├── lexer.rs                # Tokenizer with line numbers & string literal scanning
│   ├── parser.rs               # Recursive descent parser for Plain grammar
│   ├── interpreter.rs          # Tree-walking runtime, scopes, file I/O, ask loop
│   ├── transpile.rs            # Native compiler emitting standalone Rust source
│   ├── lib.rs                  # Library entrypoint (inspect_source, compile_source, run_source)
│   └── main.rs                 # Plain CLI binary, compile command, and 15 automated tests
│
├── examples/                   # Tour and verification examples
│   ├── hello.plain             # v0.1: Basics, loops, conditionals
│   ├── features.plain          # v0.2: Functions, lists, helpers, comparisons tour
│   ├── ask.plain               # Interactive terminal input demo
│   ├── v03.plain               # v0.3: Records, text tools, statistical aggregations
│   ├── v04.plain               # v0.4: String interpolation, nested records, file iteration
│   ├── compile-demo.plain      # v0.4: Standalone compiler demo
│   ├── import_demo.plain       # Multi-file module import demonstration
│   ├── math_utils.plain        # Reusable helper module for imports
│   └── people.txt              # Sample text file for line iteration tests
│
└── ide/                        # Modern VS Code IDE & Desktop App
    ├── package.json            # IDE frontend dependencies (React 19, Xterm, Lucide)
    ├── vite.config.js          # Vite 8 build & dev server config
    ├── index.html              # HTML shell
    │
    ├── src/                    # Frontend React source
    │   ├── App.jsx             # Main IDE state coordinator & layout
    │   ├── main.jsx            # React root mount
    │   ├── examples.js         # Curated starter code templates
    │   ├── simulator.js        # Instant browser-side simulator engine
    │   │
    │   └── components/
    │       ├── VsTitleBar.jsx          # File menu, Save/Open dialogs, run actions
    │       ├── VsSidebar.jsx           # Explorer file tree, create/delete files
    │       ├── VsActivityBar.jsx       # Left activity icons (Files, Builder, Docs)
    │       ├── VsEditorTabs.jsx        # Multi-file tabs with dirty state indicators
    │       ├── Editor.jsx              # Code editor with error diagnostics
    │       ├── RealTerminal.jsx        # xterm.js interactive terminal with CLI shell
    │       ├── ConsoleOutput.jsx       # Direct stdout output stream
    │       ├── SentenceBar.jsx         # English sentence builder assistant
    │       ├── GrammarDocs.jsx         # Complete syntax reference cheatsheet
    │       ├── VariablesInspector.jsx  # Live runtime variable state table
    │       ├── AstViewer.jsx           # Parsed AST visualizer
    │       ├── TokenViewer.jsx         # Lexer token stream inspector
    │       ├── VsBottomDock.jsx        # Resizable bottom dock (Terminal, Output, etc.)
    │       └── VsStatusBar.jsx         # Status bar (line, col, backend status)
    │
    └── src-tauri/              # Native Desktop App wrapper (Tauri v2)
        ├── Cargo.toml          # Tauri Rust dependencies
        ├── tauri.conf.json     # Window, icon, and desktop permissions config
        └── src/
            ├── lib.rs          # Native OS bridge (dialogs, execution subprocess)
            └── main.rs         # Tauri application bootstrap
```

---

## Examples Tour

| File | Highlights Demonstrated |
| :--- | :--- |
| [`examples/v04.plain`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/examples/v04.plain) | String interpolation `{user}`, nested records `city of address of person`, and line iteration `for each line in file "..."` |
| [`examples/compile-demo.plain`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/examples/compile-demo.plain) | Verified compiler demo compiling to native standalone Rust without crates |
| [`examples/v03.plain`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/examples/v03.plain) | Records, `split by`, `join with`, `replace ... with ... in`, `trim of`, `sum of`, `average of`, `sort` |
| [`examples/features.plain`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/examples/features.plain) | Functions with `define` and `return`, lists with `add`, English comparisons |
| [`examples/ask.plain`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/examples/ask.plain) | Interactive terminal prompt reading strings and numbers directly from stdin |
| [`examples/import_demo.plain`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/examples/import_demo.plain) | Multi-file module imports reusing functions across files |
| [`examples/hello.plain`](file:///home/jhomar-john-picar/Desktop/My%20Dev%20ENV/plain-lang/examples/hello.plain) | Original v0.1 introduction to Plain syntax |

---


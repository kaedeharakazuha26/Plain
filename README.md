# Plain — an English-like Programming Language, in Rust (v0.2)

You write basic English sentences. A Rust program reads, parses, and executes it.

```plain
set name to "jhomar"
ask age with "How old are you?"

define greet with name
    say "Hello, " + uppercase of name
end

call greet with name

set scores to [80, 90, 75]
add 100 to scores

for each score in scores
    say "Score: " + score
end

if age is between 13 and 19
    say "Status: teenager"
otherwise if age is at least 20
    say "Status: adult"
otherwise
    say "Status: kid"
end
```

---

## Quick Start & CLI

Run Plain files directly using the Rust CLI:

```bash
cargo run                            # Built-in demo
cargo run -- examples/hello.plain    # v0.1 syntax demo
cargo run -- examples/features.plain # v0.2 full syntax tour
cargo run -- examples/ask.plain      # Interactive user input demo
cargo test                           # Run test suite (6 tests passing)
```

Compile a release binary:

```bash
cargo build --release
./target/release/plain examples/features.plain
```

---

## Modern VS Code IDE & Desktop App

Plain includes a dedicated IDE with a VS Code aesthetic, built with React, Vite, and Tauri v2:

```bash
# In your browser (Vite):
./start-ide.sh
# or:
npm run ide                          # Starts at http://localhost:5173

# As a native Desktop App (Tauri v2):
npm run tauri:dev
```

### IDE Features

1. **Clean Workspace Explorer (Left Sidebar)**:
   - Dedicated project file management with your `.plain` files.
   - Create new `.plain` files inline, delete files, and view file counts.
   - Open folders and navigate custom workspaces without hardcoded distractions.

2. **Top Menu Bar & File Management**:
   - **File Menu Dropdown**:
     - **New File** (<kbd>Ctrl+N</kbd>): Create a new file with `.plain` extension.
     - **Open File...** (<kbd>Ctrl+O</kbd>): Pick and load `.plain` files from your computer.
     - **Open Folder...**: Pick an entire project folder to load into the workspace.
     - **Save** (<kbd>Ctrl+S</kbd>): Save code changes and download/write to disk.
     - **Save As...** (<kbd>Ctrl+Shift+S</kbd>): Save as a new `.plain` file.
     - **Close Tab** (<kbd>Ctrl+W</kbd>): Close active file tab.
   - Quick search breadcrumbs and engine switcher (**🦀 Rust Native** / **⚡ Web Simulator**).

3. **Smooth Resizable Panes**:
   - Draggable vertical resizer for the Left Explorer (160px – 520px).
   - Draggable vertical resizer for the Right Assistant (220px – 650px).
   - Draggable horizontal resizer for the Bottom Dock (110px – 600px).

4. **Real Terminal (Powered by Xterm.js)**:
   - Embedded real interactive terminal running directly inside the IDE.
   - Built-in shell prompt: `plain@ide:~/workspace$ ` with full ANSI color themes, block cursor, and command history (<kbd>↑</kbd>/<kbd>↓</kbd>).
   - Click **Run File Here** or type `run` to execute the active `.plain` file in the terminal.
   - Run any command: `plain <file.plain>`, `ls`, `cat <file>`, `pwd`, `clear`, or Linux bash commands.
   - Full support for interactive terminal input (`ask` prompts).

5. **Diagnostic Output & Inspection Dock**:
   - **Terminal Tab**: Real PTY terminal emulator.
   - **Output Tab**: Live execution stdout stream and interactive input prompt.
   - **Problems Tab**: Compiler errors with line diagnostics.
   - **AST Tree Tab**: Interactive hierarchical AST node viewer.
   - **Tokens Tab**: Lexer token breakdown chips.
   - **Variables Tab**: Real-time memory variables table.

6. **English Assistant & Sentence Builder (Right Sidebar)**:
   - **Sentence Builder**:
     - Includes a 4-step instruction guide on building Plain sentences.
     - Category filter pills: `All`, `Input & Say`, `Variables`, `Functions`, `Lists & Loops`, `Conditionals`, and `Helpers`.
     - One-click insertion directly into your editor cursor.
   - **Language Reference**:
     - Comprehensive Plain v0.2 documentation with syntax tags, explanation, and sample snippets.

---

## How It Works

```
your .plain file
      ↓
lexer.rs        text  -> tokens        set | name | to | "jhomar"
      ↓
parser.rs       tokens -> AST tree     Set { name, value }
      ↓
interpreter.rs  walks the tree and executes it:
                - Environment scope HashMaps for variables and functions
                - `return` bubbles values out of functions cleanly
                - `ask` reads interactive terminal input
```

---

## Language Reference & Syntax

### 1. Basics & Variables
- `set <name> to <expr>` / `change <name> to <expr>`
- `say <expr>` — prints value to console
- `# comment` — comment to the end of the line
- `ask <name> with "<prompt>"` — interactive input in terminal; typed numbers are stored as numbers

```plain
set name to "jhomar"
ask age with "How old are you?"
say "Hello, " + uppercase of name
```

### 2. Multi-File Modules & Imports (New!)
Plain supports modular programming across multiple files. You can import any other `.plain` file to reuse its functions, constants, and variables:

```plain
# Import another file by path (with or without .plain)
import "examples/math_utils.plain"
# or: include "helpers.plain" / import file "utils.plain"

# Call functions defined in the imported file
set doubled to call double_number with 21
say "Result: " + doubled

# Access top-level variables from the imported file
say "Imported pi: " + pi
```
- Functions defined with `define` in the imported file become immediately callable.
- Circular imports are automatically prevented.
- File paths are resolved relative to the workspace or working directory.

### 3. Functions & Isolated Scope
```plain
define calculate_total with subtotal, tax_rate
    return subtotal plus (subtotal multiplied by tax_rate)
end

set total to call calculate_total with 100, 0.15
say "Total amount: $" + total
```
- Parameters are separated by commas after `with`.
- Functions maintain local scope (outer variables are accessible; local assignments do not leak).
- Use `return <expr>` to return values.

### 4. Interactive User Input (`ask`)
```plain
ask user_name with "What is your name?"
say "Welcome, " + user_name

ask age with "How old are you?"
say "Next year you will be: " + (age plus 1)
```
- When executed in the Real Terminal or CLI, execution pauses at the prompt, displays the question, and waits for your answer.
- Typed numbers are automatically stored as numbers, and text as text.

### 5. Lists & Iteration
```plain
set scores to [80, 90, 75]
add 100 to scores

for each score in scores
    say "Score: " + score
end
```
- Helpers: `length of`, `first of`, `last of`, `item 2 of` (1-indexed).

### 6. Control Flow
```plain
# Conditionals
if age is between 13 and 19
    say "Status: teenager"
otherwise if age is at least 20
    say "Status: adult"
otherwise
    say "Status: kid"
end

# Loops
repeat 3 times
    say "Echo!"
end

while count is below 5
    increase count by 1
end
```

### 7. Natural English Comparisons & Math
- Range check: `is between 10 and 20`
- Comparisons: `is above`, `is below`, `is at least`, `is at most`, `is equal to`, `is not equal to`, `is different from`, `is same as`
- Symbols: `> < >= <= == !=`
- Arithmetic: `+ - * / plus minus multiplied by divided by`
- Logic: `and`, `or`, `not`

---

## Running Tests

All interpreter features (including multi-file imports, interactive inputs, and functions) are covered by automated unit tests:

```bash
cargo test
```

Tests include:
- Multi-file importing and cross-file function calling
- Pipeline lexer/parser/interpreter execution
- Functions, parameter passing, and return values
- Lists and `for each` loops
- Text helpers and English comparison operations
- Division by zero error handling
- Unknown variable error diagnostics

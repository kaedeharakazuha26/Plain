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

## Language Reference (v0.2)

### 1. Variables & Values
```plain
set name to "jhomar"
change score to 100
increase lives by 1
decrease health by 10
```

### 2. Interactive User Input
```plain
ask user_name with "What is your name?"
say "Hello, " + user_name

ask age with "How old are you?"
say "Next year you will be: " + (age plus 1)
```
- Automatically parses numeric responses as numbers, and text responses as text strings.

### 3. Functions & Isolated Scope
```plain
define calculate_total with subtotal, tax_rate
    return subtotal plus (subtotal multiplied by tax_rate)
end

set total to call calculate_total with 100, 0.15
say "Total amount: $" + total
```
- Parameters are comma-separated after `with`.
- Functions maintain local scope (outer variables are accessible; local assignments do not leak).

### 4. Lists & For Each Iteration
```plain
set scores to [80, 90, 75]
add 100 to scores

for each score in scores
    say "Score: " + score
end
```

### 5. Built-in Helpers (1-Indexed)
```plain
say length of scores          # Length of list or text
say first of scores           # First element or letter
say last of scores            # Last element or letter
say item 2 of scores          # 1-indexed element access
say uppercase of "hello"      # "HELLO"
say lowercase of "WORLD"      # "world"
```

### 6. Chained Conditionals
```plain
if age is between 13 and 19
    say "Teenager"
otherwise if age is at least 20
    say "Adult"
otherwise
    say "Kid"
end
```

### 7. Natural English Comparisons & Math
```plain
is between 10 and 20          # Range check
is above / is greater than    # >
is below / is less than       # <
is at least                   # >=
is at most                    # <=
is equal to / is same as      # ==
is not equal to               # !=
plus, minus, multiplied by, divided by
and, or, not
```

### 8. Loops
```plain
repeat 3 times
    say "Echo!"
end

while count is below 5
    increase count by 1
end
```

---

## Running Tests

All interpreter features are covered by automated unit tests:

```bash
cargo test
```

Tests include:
- Pipeline lexer/parser/interpreter execution
- Functions, parameter passing, and return values
- Lists and `for each` loops
- Text helpers and English comparison operations
- Division by zero error handling
- Unknown variable error diagnostics

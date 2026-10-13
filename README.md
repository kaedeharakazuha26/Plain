# Plain — a tiny English-like language, in Rust (v0.2)

You write basic English. A Rust program (the interpreter) reads it and runs it.

```
set name to "jhomar"
ask age with "How old are you?"

define greet with name
    say "Hello, " + uppercase of name
end

call greet with name

set scores to [80, 90, 75]
add 100 to scores

for each score in scores
    say score
end

if age is between 13 and 19
    say "teenager"
otherwise if age is at least 20
    say "adult"
otherwise
    say "kid"
end
```

## Run it

```bash
cargo run                            # built-in demo
cargo run -- examples/hello.plain    # v0.1 syntax (still works)
cargo run -- examples/features.plain # v0.2 syntax tour
cargo run -- examples/ask.plain      # input demo (type answers)
cargo test                           # 6 tests
```

## Frontend IDE (VS Code & Desktop App)

Test and write Plain code visually with a modern VS Code-style IDE and desktop application:

```bash
# In your browser:
npm run ide                          # starts on http://localhost:5173
# or run the startup script:
./start-ide.sh

# Or as a native Desktop App (Tauri):
npm run tauri:dev
```

- **File Explorer (Left)**: Browse example `.plain` files, create and edit custom files.
- **Code Editor (Center)**: Syntax highlighting for Plain English v0.2, line numbers, error indicators.
- **Terminal & Inspector (Bottom Dock)**: Live stdout output, AST tree breakdown, lexer tokens, memory variables.
- **English Assistant (Right)**: 1-click sentence builder snippets & grammar cheat sheet.

## How it works

```
your .plain file
      ↓
lexer.rs        text  -> tokens        set | name | to | "jhomar"
      ↓
parser.rs       tokens -> AST tree     Set { name, value }
      ↓
interpreter.rs  walks the tree and executes it (variables in a HashMap,
                functions in a second HashMap, `return` bubbles up as a value)
```

## Syntax

**Basics**
- `set x to <expr>` / `change x to <expr>` — create/change a variable
- `say <expr>` — print
- `# comment`

**Input (new in v0.2)**
- `ask name with "What is your name?"` — prints the prompt, reads a line.
  If the user types a number it is stored as a number, else as text.

**Functions (new in v0.2)**
```
define sum_of with a, b
    return a plus b
end
set total to call sum_of with 5, 3
call greet with "jhomar"        # as a statement, result ignored
```
Params are comma-separated after `with`. Function bodies get their own
scope (they can read outer variables; their changes don't leak out).
Names can't be keywords — you can't name a function `add` or a variable
`say`, those words are reserved.

**Lists (new in v0.2)**
- `set scores to [80, 90, 75]`
- `add 100 to scores` — appends (on a number it adds, on text it joins)
- `for each score in scores ... end`
- `length of scores`, `first of scores`, `last of scores`,
  `item 2 of scores` (counting starts at 1, like English)

**Control flow**
- `if <expr> ... otherwise if <expr> ... otherwise ... end` (`then` optional)
- `repeat <expr> times ... end`
- `while <expr> ... end` (1,000,000-iteration safety stop)

**Variable shortcuts (new in v0.2)**
- `increase lives` / `increase lives by 2` / `decrease lives by 1`

**Values & math**
- Numbers, text `"..."`, `true` / `false`, lists
- `+ - * / ( )`, word forms: `plus`, `minus`, `multiplied by`, `divided by`
- `+` also joins text and lists

**Comparisons (plain English)**
`is above`, `is below`, `is greater than`, `is less than`, `is at least`,
`is at most`, `is equal to`, `is not equal to`, `is different from`,
`is same as`, `is between 13 and 19`, plain `is` — plus symbols
`> < >= <= == !=`, and logic `and` / `or` / `not`

**Text helpers (new in v0.2)**
`uppercase of name`, `lowercase of name`, `length of name`

Errors are plain messages with line numbers, e.g.
`Unknown name 'foo' (did you forget: set foo to ...?)`

## Ideas for v0.3

- text tools: `contains`, splitting/joining text
- `remove ... from <list>`, sorting
- dictionaries in English: `set person to name "Ana", age 20`
- reading/writing files
- transpiling to Rust instead of interpreting (a real compiler back-end)

# Plain — a tiny English-like language, in Rust (v0.1)

You write basic English. A Rust program (the interpreter) reads it and runs it.

```
set name to "jhomar"
set age to 20

say "Hello, " + name

if age is above 18
    say "You are an adult"
otherwise
    say "You are a minor"
end

repeat 3 times
    say "Hi"
end
```

## Run it

```bash
cargo run                        # runs the built-in demo
cargo run -- examples/hello.plain
cargo test                       # pipeline tests
```

## Frontend IDE

Test and write Plain code visually with a modern

```bash
npm run ide                      # starts the IDE on http://localhost:5173
# or run the startup script:
./start-ide.sh
```

- **File Explorer (Left)**: Browse example `.plain` files, create and edit custom files.
- **Code Editor (Center)**: Syntax highlighting for Plain English, line numbers, error indicators.
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
interpreter.rs  walks the tree and executes it (variables in a HashMap)
```

| File | Job |
|---|---|
| `src/lexer.rs` | chops sentences into tokens, tracks line numbers |
| `src/ast.rs` | `Value` (number / text / true-false), `Expr`, `Stmt` types |
| `src/parser.rs` | grammar: statements + expression precedence |
| `src/interpreter.rs` | executes the AST, holds variables |
| `src/main.rs` | reads a file (or runs the demo), wires it all together |

## Language in v0.1

- `set x to <expr>` — create/change a variable
- `say <expr>` — print
- `if <expr> ... otherwise ... end` — `otherwise` is optional, `then` is optional
- `repeat <expr> times ... end`
- `while <expr> ... end` (with a 1,000,000-iteration safety stop)
- Values: numbers (`20`, `3.5`), text (`"hello"`), `true` / `false`
- Math: `+ - * / ( )` — `+` also joins text: `"Total: " + total`
- English comparisons: `is above`, `is below`, `is at least`, `is at most`,
  `is equal to`, `is not equal to`, plain `is` (= equals)
  — symbols `> < >= <= == !=` work too
- Logic: `and`, `or`, `not`
- Comments: `# anything after this is ignored`

Errors are plain messages with line numbers, e.g.
`Unknown name 'foo' (did you forget: set foo to ...?)`

## Ideas for v0.2

- `ask name with "What is your name?"` — read input
- lists: `set items to 1, 2, 3`
- functions in English: `define greet with name ... end`
- transpiling to Rust instead of interpreting (a real compiler back-end)

Working name is **Plain** — rename the folder / `Cargo.toml` name anytime,
it's just a placeholder.

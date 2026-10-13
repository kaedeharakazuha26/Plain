# Plain — a tiny English-like language, in Rust (v0.4)

You write basic English. Plain can run it two ways:

1. **Interpreter** — a Rust program reads your file and runs it directly.
2. **Compiler (new in v0.4)** — Plain translates your file to Rust source,
   and `rustc` builds a real standalone program from it.

```plain
set person to record with name "Ana", age 20
say "Hello, {name of person}!"

save "Ana" to file "examples/people.txt"
for each line in file "examples/people.txt"
    say line
end
```

## Run it

```bash
cargo run                            # built-in demo
cargo run -- examples/hello.plain    # v0.1
cargo run -- examples/features.plain # v0.2
cargo run -- examples/v03.plain      # v0.3
cargo run -- examples/v04.plain      # v0.4: interpolation, nested records, file lines
cargo run -- examples/ask.plain      # input demo
cargo test                           # 15 tests
```

## Compile it (v0.4)

```bash
cargo run -- compile examples/compile-demo.plain compiled.rs
rustc compiled.rs -o demo
./demo
```

`compile` prints the Rust to stdout if you omit the output file.
The generated file is self-contained (it carries a small `Value` runtime)
and needs no crates. Interpreted and compiled runs of `compile-demo.plain`
produce byte-identical output.

**Compiler subset** — it compiles: `set/say/if/repeat/while`,
`increase/decrease`, `add ... to`, `define/call/return`, lists,
all math/comparisons/logic, `contains / starts with / ends with`,
`length/first/last/item/sum/average/uppercase/lowercase of`,
and `{name}` interpolation.

**Interpreter-only for now:** `ask`, records, `for each`, files,
`split/join/replace`, `smallest/largest/reverse/trim of`,
`number of / text of`. Compiling those gives a clear error naming the
feature instead of broken Rust. Two more compiler notes: variables first
created inside an `if`/loop block stay inside that block in Rust, and
runtime errors in compiled programs are Rust panics with the same messages.

## How it works

```
your .plain file ──→ lexer.rs ──→ parser.rs ──→ AST
                                                  ├─→ interpreter.rs  (runs it)
                                                  └─→ transpile.rs    (v0.4: emits Rust)
```

## Syntax highlights

### Text interpolation (new in v0.4)
```plain
say "Hello {user_name}, your score is {score}"
say "{name of person} lives in {city of address of person}"
```
`{name}` and `{field of record}` (any depth) are filled in when the text
is used. `{{` and `}}` print literal braces. Unknown names are errors.

### Records — now nested (v0.4)
```plain
set person to record with name "Ana", address record with city "Cebu", zip 6000
say city of address of person
set city of address of person to "Manila"
set people to [record with name "Ana", age 21, record with name "Ben", age 17]
for each p in people
    say "{name of p} is {age of p}"
end
```
A missing field is an error that lists the fields the record *does* have.

### Files — line by line (new in v0.4)
```plain
for each line in file "examples/people.txt"
    say line
end
```
Plus v0.3's `save <expr> to file "..."`, `append ...` (adds a new line),
and `load <name> from file "..."` (loads as text; use `number of` to convert).

### Everything from before
- **Variables & assignment:** `set x to <expr>`, `change x to <expr>`, `increase x by 1`, `decrease x by 1`, `# comments`
- **Output & Input:** `say <expr>`, `ask name with "Prompt"`
- **Control Flow:** `if / otherwise if / otherwise`, `repeat N times`, `while <cond>`, `for each item in <list>`
- **Functions:** `define func with a, b ... return <expr> ... end`, `call func with a, b`
- **Modules / Imports:** `import "file.plain"`
- **Lists:** `[1, 2, 3]`, `add val to list`, `remove val from list`, `remove item N from list`, `sort list`, `sort list descending`
- **List Aggregations:** `sum of list`, `average of list`, `smallest of list`, `largest of list`, `first of list`, `last of list`, `item N of list`, `length of list`
- **Text Tools:** `sentence contains "sub"`, `starts with`, `ends with`, `split by`, `join with`, `replace find with rep in target`, `uppercase of`, `lowercase of`, `trim of`, `reverse of`, `number of`, `text of`
- **English comparisons:** `is above`, `is below`, `is greater than`, `is less than`, `is at least`, `is at most`, `is equal to`, `is not equal to`, `is different from`, `is same as`, `is between min and max`, `and`, `or`, `not`
- **Word math:** `plus`, `minus`, `multiplied by`, `divided by`, `+`, `-`, `*`, `/`

Reserved words can't be variable/function names — except `sum`, which is
only a keyword in the phrase `sum of <list>`.

---

## IDE & Visual Studio Experience

Plain includes a desktop IDE with:
- **Left Explorer:** File tree with create `.plain` file, save, and delete.
- **Top Menu Bar:** File dropdown (New, Open, Open Folder, Save, Save As).
- **Sentence Builder:** Visual English blocks that compose into valid Plain code.
- **Language Reference:** Interactive cheatsheet with syntax examples and copy buttons.
- **Real Terminal:** Built-in xterm.js terminal capable of running `plain`, `run`, and interactive `ask` input.

```bash
# Web IDE:
npm run ide

# Native Desktop App (Tauri v2):
npm run tauri:dev
```

## Ideas for v0.5

- grow the compiler subset: records and `for each` in generated Rust
- `ask` in compiled programs (stdin in the runtime)
- a `--release` one-step build (transpile + rustc in one command)
- error line numbers in transpiled code (map panics back to .plain lines)

Working name is **Plain** — rename anytime, it's just a placeholder.

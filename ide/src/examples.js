export const EXAMPLES = [
  {
    id: 'v04',
    title: 'Plain v0.4 Features Tour',
    category: 'v0.4 Features',
    description: 'String interpolation, nested records, and line-by-line file reading',
    code: `# Plain v0.4 Features Tour — interpolation, nested records, file lines

# 1. Text Interpolation
set user_name to "Jhomar"
set score to 100
say "Hello {user_name}, your score is {score}"

# 2. Nested Records
set person to record with name "Ana", address record with city "Cebu", zip 6000
say "{name of person} lives in {city of address of person}"

# Mutate nested record field
set city of address of person to "Manila"
say "Updated address city: {city of address of person}"

# 3. Records in Lists & Iteration
set people to [record with name "Ana", age 21, record with name "Ben", age 17]
for each p in people
    say "{name of p} is {age of p}"
end

# 4. File Operations — line by line
save "Ana" to file "examples/people.txt"
append "Ben" to file "examples/people.txt"
append "Charlie" to file "examples/people.txt"

say "--- Lines from file ---"
for each line in file "examples/people.txt"
    say line
end
`
  },
  {
    id: 'compile_demo',
    title: 'Compiler Demo (Plain → Rust)',
    category: 'v0.4 Features',
    description: 'Compiles into standalone Rust source code executable by rustc',
    code: `# Plain v0.4 Compiler Demo — examples/compile-demo.plain
# Compiles to standalone native Rust without crates!
# Both interpreted and compiled executions produce byte-identical output.

# 1. Variables and math
set base to 10
increase base by 5
decrease base by 3
say "Base value: {base}"

# 2. Logic & Comparisons
if base is greater than 10 and base is between 10 and 15
    say "Comparison check: passed"
end

# 3. String tools & {name} interpolation
set title to "Plain Language"
if title contains "Lang" and title starts with "Plain" and title ends with "Language"
    say "Title matches: {title}"
end
say "Uppercase title: {uppercase of title}"
say "Lowercase title: {lowercase of title}"

# 4. Functions & Returns
define calculate_total with price, tax_rate
    return price plus (price multiplied by tax_rate)
end

set total to call calculate_total with 100, 0.12
say "Total amount: {total}"

# 5. Lists & aggregations
set numbers to [10, 20, 30]
add 40 to numbers

say "Numbers count: {length of numbers}"
say "First number: {first of numbers}"
say "Last number: {last of numbers}"
say "Item 2: {item 2 of numbers}"
say "Sum of numbers: {sum of numbers}"
say "Average of numbers: {average of numbers}"

# 6. Loops (Repeat & While)
set counter to 0
repeat 3 times
    increase counter by 1
end
say "Repeated counter: {counter}"

while counter is above 0
    decrease counter by 1
end
say "Counter after countdown: {counter}"
say "Compiler demo complete!"
`
  },
  {
    id: 'v03',
    title: 'Plain v0.3 Text & Records',
    category: 'v0.3 Features',
    description: 'Flat records, text tools (split/join/replace), and list aggregations (sum/average/sort)',
    code: `# Plain v0.3 Features Tour

# 1. Records / Dictionaries
set person to record with name "Ana", age 20
say "Name: " + name of person
say "Age: " + age of person
set age of person to 21
say "Updated age: " + age of person

# 2. Text Tools
set phrase to "  the quick brown fox jumps  "
say "Trimmed: [" + trim of phrase + "]"

set sentence to trim of phrase
if sentence contains "quick" and sentence starts with "the" and sentence ends with "jumps"
    say "Text matching: passed"
end

set words to split sentence by " "
say "Words list: " + words

set joined to join words with "-"
say "Joined with dashes: " + joined

set replaced to replace "fox" with "dog" in sentence
say "Replaced sentence: " + replaced

# 3. List Aggregations & Helpers
set scores to [80, 95, 60, 90]
say "Original scores: " + scores
say "Sum: " + sum of scores
say "Average: " + average of scores
say "Smallest: " + smallest of scores
say "Largest: " + largest of scores

sort scores
say "Sorted scores: " + scores

sort scores descending
say "Sorted descending: " + scores
`
  },
  {
    id: 'features',
    title: 'Plain v0.2 Syntax Tour',
    category: 'v0.2 Features',
    description: 'Complete tour of v0.2: functions, lists, helpers, and comparisons',
    code: `# Plain v0.2 Syntax Tour

# 1. Variables & Shortcuts
set count to 10
change count to 20
increase count by 5
decrease count by 3
say "Count is now: " + count

# 2. Functions with Parameters and Return
define calculate_bonus with base_salary, multiplier
    return base_salary multiplied by multiplier
end

set bonus to call calculate_bonus with 1000, 1.5
say "Calculated bonus: $" + bonus

# 3. Lists and Operations
set scores to [85, 92, 78]
add 95 to scores

say "Scores list: " + scores
say "Total scores count: " + length of scores
say "First score: " + first of scores
say "Last score: " + last of scores
say "Second score: " + item 2 of scores

say "--- All Scores ---"
for each s in scores
    say "Score: " + s
end

# 4. Text Helpers
set user to "jhomar"
say "Uppercase: " + uppercase of user
say "Lowercase: " + lowercase of "HELLO WORLD"
say "Username length: " + length of user

# 5. English Comparisons & Chained Conditionals
set age to 16
if age is between 13 and 19
    say "Age Category: Teenager"
otherwise if age is at least 20
    say "Age Category: Adult"
otherwise
    say "Age Category: Kid"
end
`
  },
  {
    id: 'ask_demo',
    title: 'Ask & User Input',
    category: 'v0.2 Features',
    description: 'Ask user input interactively in the terminal',
    code: `# Plain v0.2 — Interactive input demo
# Type your answers directly into the terminal input prompt below!

ask user_name with "What is your name?"
say "Hello, " + uppercase of user_name + "!"

ask age with "How old are you?"
if age is between 13 and 19
    say "You are a teenager!"
otherwise if age is at least 20
    say "You are an adult!"
otherwise
    say "You are a kid!"
end
`
  },
  {
    id: 'hello',
    title: 'Hello & Welcome (v0.1)',
    category: 'Basics',
    description: 'Original v0.1 basic syntax (still fully supported in v0.4)',
    code: `# Welcome to Plain!
# Plain lets you write code that reads like basic English sentences.

set name to "jhomar"
set age to 20

say "Hello, " + name
say "Welcome to the Plain Language IDE!"

if age is above 18
    say "Status: You are an adult"
otherwise
    say "Status: You are a minor"
end
`
  }
];

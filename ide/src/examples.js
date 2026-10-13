export const EXAMPLES = [
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
    id: 'functions_demo',
    title: 'Functions & Scopes',
    category: 'v0.2 Features',
    description: 'Local function scopes, parameters, and return values',
    code: `# Functions have their own local scope in v0.2!

define greet with user_name
    say "Welcome, " + uppercase of user_name + "!"
end

define sum_of with a, b
    return a plus b
end

call greet with "Alex"
set total to call sum_of with 42, 58
say "Total sum: " + total
`
  },
  {
    id: 'lists_demo',
    title: 'Lists & For Each Loop',
    category: 'v0.2 Features',
    description: 'Creating lists, appending with add, and looping with for each',
    code: `# Lists in Plain v0.2
set items to ["Laptop", "Mouse", "Keyboard"]
add "Headphones" to items

say "Shopping cart count: " + length of items
say "First item: " + first of items
say "Last item: " + last of items

say "--- Items in Cart ---"
for each product in items
    say "Product: " + product
end
`
  },
  {
    id: 'hello',
    title: 'Hello & Welcome (v0.1)',
    category: 'Basics',
    description: 'Original v0.1 basic syntax (still fully supported in v0.2)',
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
  },
  {
    id: 'calculator',
    title: 'Store Checkout & Discount',
    category: 'Math & Logic',
    description: 'Arithmetic formulas and compound English logic with "and"',
    code: `# Calculate order totals and conditional discounts
set item_name to "Mechanical Keyboard"
set price to 120
set quantity to 3

set subtotal to price * quantity
say "Item: " + item_name
say "Subtotal: $" + subtotal

if subtotal is at least 300 and quantity is above 2
    set discount to 30
    set final_total to subtotal - discount
    say "Special discount applied: -$" + discount
    say "Final price to pay: $" + final_total
otherwise
    say "Standard price: $" + subtotal
end
`
  }
];

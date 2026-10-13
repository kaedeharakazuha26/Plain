export const EXAMPLES = [
  {
    id: 'hello',
    title: 'Hello & Welcome',
    category: 'Basics',
    description: 'Basic variable assignment, text concatenation, and conditionals',
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
  },
  {
    id: 'repeat_loop',
    title: 'Repeat Loop (Counting)',
    category: 'Loops',
    description: 'Clean English repeat loops',
    code: `# Repeat something a fixed number of times
set steps to 4
set counter to 0

say "Initiating countdown sequence..."

repeat steps times
    set counter to counter + 1
    say "Step #" + counter + " completed successfully."
end

say "All steps finished!"
`
  },
  {
    id: 'while_loop',
    title: 'While Loop (Countdown)',
    category: 'Loops',
    description: 'While loop with built-in 1,000,000 iteration safety guard',
    code: `# While loop with safety guard
set energy to 5

while energy is above 0
    say "Current energy level: " + energy + " / 5"
    set energy to energy - 1
end

say "Battery depleted! Recharging now."
`
  },
  {
    id: 'english_comparisons',
    title: 'English Comparisons',
    category: 'Expressions',
    description: 'Showcase of natural English phrasing: is above, is below, is at least, is equal to',
    code: `# Plain supports natural English comparison phrases:
# 'is above', 'is below', 'is at least', 'is at most', 'is equal to', 'is not equal to'

set score to 85

if score is at least 90
    say "Grade: Outstanding (A)"
otherwise
    if score is at least 80
        say "Grade: Very Good (B)"
    otherwise
        say "Grade: Needs improvement"
    end
end

set role to "admin"
if role is equal to "admin"
    say "Access granted to admin console"
end
`
  },
  {
    id: 'error_handling',
    title: 'Error Diagnostics Demo',
    category: 'Testing & Errors',
    description: 'Demonstrates helpful English compiler error messages',
    code: `# This example triggers helpful error messages
# Try uncommenting each line to see how Plain reports errors!

# 1. Division by zero:
# set result to 100 / 0

# 2. Unknown variable with suggestion:
say missing_variable
`
  }
];

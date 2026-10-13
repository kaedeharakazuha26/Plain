use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Serialize)]
pub enum TokenKind {
    Number(f64),
    Text(String),
    Ident(String),

    // keywords
    Set,
    Say,
    If,
    Then,
    Repeat,
    Times,
    While,
    Otherwise, // "otherwise" (also accepts "else")
    End,
    To,
    Is,
    Above,
    Below,
    Equal,
    At,
    Least,
    Most,
    Not,
    And,
    Or,
    True,
    False,

    // v0.2 keywords
    Ask,
    With,
    Define,
    Return,
    Call,
    Add,
    For,
    Each,
    In,
    Change,
    Increase,
    Decrease,
    By,
    Between,
    Greater,
    Less,
    Than,
    Different,
    From,
    Same,
    As,
    Of,
    Uppercase,
    Lowercase,
    Length,
    First,
    Last,
    Item,
    Multiplied,
    Divided,

    // symbols
    Plus,
    Minus,
    Star,
    Slash,
    LParen,
    RParen,
    LBracket,
    RBracket,
    Comma,
    Gt,
    Lt,
    Ge,
    Le,
    EqEq,
    NotEq,

    Newline,
    Eof,
}

#[derive(Debug, Clone, Serialize)]
pub struct Token {
    pub kind: TokenKind,
    pub line: usize,
}

pub fn tokenize(source: &str) -> Result<Vec<Token>, String> {
    let chars: Vec<char> = source.chars().collect();
    let mut tokens = Vec::new();
    let mut i = 0;
    let mut line = 1;

    while i < chars.len() {
        let c = chars[i];

        match c {
            '\n' => {
                tokens.push(Token { kind: TokenKind::Newline, line });
                line += 1;
                i += 1;
            }
            ' ' | '\t' | '\r' => i += 1,

            // comment: everything after # is ignored
            '#' => {
                while i < chars.len() && chars[i] != '\n' {
                    i += 1;
                }
            }

            '"' => {
                let start_line = line;
                i += 1;
                let mut text = String::new();
                while i < chars.len() && chars[i] != '"' {
                    if chars[i] == '\n' {
                        return Err(format!("Unterminated string on line {}", start_line));
                    }
                    text.push(chars[i]);
                    i += 1;
                }
                if i >= chars.len() {
                    return Err(format!("Unterminated string on line {}", start_line));
                }
                i += 1; // closing quote
                tokens.push(Token { kind: TokenKind::Text(text), line: start_line });
            }

            '0'..='9' => {
                let mut num = String::new();
                while i < chars.len() && (chars[i].is_ascii_digit() || chars[i] == '.') {
                    num.push(chars[i]);
                    i += 1;
                }
                let value: f64 = num
                    .parse()
                    .map_err(|_| format!("Bad number '{}' on line {}", num, line))?;
                tokens.push(Token { kind: TokenKind::Number(value), line });
            }

            '+' => { tokens.push(Token { kind: TokenKind::Plus, line }); i += 1; }
            '-' => { tokens.push(Token { kind: TokenKind::Minus, line }); i += 1; }
            '*' => { tokens.push(Token { kind: TokenKind::Star, line }); i += 1; }
            '/' => { tokens.push(Token { kind: TokenKind::Slash, line }); i += 1; }
            '(' => { tokens.push(Token { kind: TokenKind::LParen, line }); i += 1; }
            ')' => { tokens.push(Token { kind: TokenKind::RParen, line }); i += 1; }
            '[' => { tokens.push(Token { kind: TokenKind::LBracket, line }); i += 1; }
            ']' => { tokens.push(Token { kind: TokenKind::RBracket, line }); i += 1; }
            ',' => { tokens.push(Token { kind: TokenKind::Comma, line }); i += 1; }

            '>' => {
                if i + 1 < chars.len() && chars[i + 1] == '=' {
                    tokens.push(Token { kind: TokenKind::Ge, line });
                    i += 2;
                } else {
                    tokens.push(Token { kind: TokenKind::Gt, line });
                    i += 1;
                }
            }
            '<' => {
                if i + 1 < chars.len() && chars[i + 1] == '=' {
                    tokens.push(Token { kind: TokenKind::Le, line });
                    i += 2;
                } else {
                    tokens.push(Token { kind: TokenKind::Lt, line });
                    i += 1;
                }
            }
            '=' => {
                if i + 1 < chars.len() && chars[i + 1] == '=' {
                    tokens.push(Token { kind: TokenKind::EqEq, line });
                    i += 2;
                } else {
                    tokens.push(Token { kind: TokenKind::EqEq, line });
                    i += 1;
                }
            }
            '!' => {
                if i + 1 < chars.len() && chars[i + 1] == '=' {
                    tokens.push(Token { kind: TokenKind::NotEq, line });
                    i += 2;
                } else {
                    return Err(format!("Unexpected '!' on line {} (did you mean != ?)", line));
                }
            }

            _ if c.is_alphabetic() || c == '_' => {
                let mut word = String::new();
                while i < chars.len() && (chars[i].is_alphanumeric() || chars[i] == '_') {
                    word.push(chars[i]);
                    i += 1;
                }
                let kind = match word.to_ascii_lowercase().as_str() {
                    "set" => TokenKind::Set,
                    "say" => TokenKind::Say,
                    "if" => TokenKind::If,
                    "then" => TokenKind::Then,
                    "repeat" => TokenKind::Repeat,
                    "times" => TokenKind::Times,
                    "while" => TokenKind::While,
                    "otherwise" | "else" => TokenKind::Otherwise,
                    "end" => TokenKind::End,
                    "to" => TokenKind::To,
                    "is" => TokenKind::Is,
                    "above" => TokenKind::Above,
                    "below" => TokenKind::Below,
                    "equal" => TokenKind::Equal,
                    "at" => TokenKind::At,
                    "least" => TokenKind::Least,
                    "most" => TokenKind::Most,
                    "not" => TokenKind::Not,
                    "and" => TokenKind::And,
                    "or" => TokenKind::Or,
                    "true" => TokenKind::True,
                    "false" => TokenKind::False,

                    // v0.2 keywords
                    "ask" => TokenKind::Ask,
                    "with" => TokenKind::With,
                    "define" => TokenKind::Define,
                    "return" => TokenKind::Return,
                    "call" => TokenKind::Call,
                    "add" => TokenKind::Add,
                    "for" => TokenKind::For,
                    "each" => TokenKind::Each,
                    "in" => TokenKind::In,
                    "change" => TokenKind::Change,
                    "increase" => TokenKind::Increase,
                    "decrease" => TokenKind::Decrease,
                    "by" => TokenKind::By,
                    "between" => TokenKind::Between,
                    "greater" => TokenKind::Greater,
                    "less" => TokenKind::Less,
                    "than" => TokenKind::Than,
                    "different" => TokenKind::Different,
                    "from" => TokenKind::From,
                    "same" => TokenKind::Same,
                    "as" => TokenKind::As,
                    "of" => TokenKind::Of,
                    "uppercase" => TokenKind::Uppercase,
                    "lowercase" => TokenKind::Lowercase,
                    "length" => TokenKind::Length,
                    "first" => TokenKind::First,
                    "last" => TokenKind::Last,
                    "item" => TokenKind::Item,
                    "plus" => TokenKind::Plus,
                    "minus" => TokenKind::Minus,
                    "multiplied" => TokenKind::Multiplied,
                    "divided" => TokenKind::Divided,

                    _ => TokenKind::Ident(word),
                };
                tokens.push(Token { kind, line });
            }

            _ => return Err(format!("Unexpected character '{}' on line {}", c, line)),
        }
    }

    tokens.push(Token { kind: TokenKind::Eof, line });
    Ok(tokens)
}

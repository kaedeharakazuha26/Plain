// Complete JavaScript simulator matching Plain Language's Rust implementation:
// src/lexer.rs, src/parser.rs, src/ast.rs, src/interpreter.rs

export function tokenizePlain(source) {
  const chars = Array.from(source);
  const tokens = [];
  let i = 0;
  let line = 1;

  while (i < chars.length) {
    const ch = chars[i];

    if (ch === '\n') {
      tokens.push({ kind: 'Newline', line });
      line += 1;
      i += 1;
      continue;
    }

    if (ch === '\r' || ch === '\t' || ch === ' ') {
      i += 1;
      continue;
    }

    // Comments: # ... until newline
    if (ch === '#') {
      while (i < chars.length && chars[i] !== '\n') {
        i += 1;
      }
      continue;
    }

    // Number literals
    if (ch >= '0' && ch <= '9') {
      let numStr = '';
      while (i < chars.length && ((chars[i] >= '0' && chars[i] <= '9') || chars[i] === '.')) {
        numStr += chars[i];
        i += 1;
      }
      const val = parseFloat(numStr);
      if (isNaN(val)) {
        throw new Error(`Line ${line}: Invalid number format '${numStr}'`);
      }
      tokens.push({ kind: { Number: val }, line });
      continue;
    }

    // String literals
    if (ch === '"') {
      i += 1; // skip opening "
      let text = '';
      while (i < chars.length && chars[i] !== '"') {
        if (chars[i] === '\n') {
          line += 1;
        }
        text += chars[i];
        i += 1;
      }
      if (i >= chars.length) {
        throw new Error(`Line ${line}: Unterminated string literal`);
      }
      i += 1; // skip closing "
      tokens.push({ kind: { Text: text }, line });
      continue;
    }

    // Two-character symbols
    if (ch === '=' && chars[i + 1] === '=') {
      tokens.push({ kind: 'EqEq', line });
      i += 2;
      continue;
    }
    if (ch === '!' && chars[i + 1] === '=') {
      tokens.push({ kind: 'NotEq', line });
      i += 2;
      continue;
    }
    if (ch === '>' && chars[i + 1] === '=') {
      tokens.push({ kind: 'Ge', line });
      i += 2;
      continue;
    }
    if (ch === '<' && chars[i + 1] === '=') {
      tokens.push({ kind: 'Le', line });
      i += 2;
      continue;
    }

    // Single-character symbols
    if (ch === '+') { tokens.push({ kind: 'Plus', line }); i += 1; continue; }
    if (ch === '-') { tokens.push({ kind: 'Minus', line }); i += 1; continue; }
    if (ch === '*') { tokens.push({ kind: 'Star', line }); i += 1; continue; }
    if (ch === '/') { tokens.push({ kind: 'Slash', line }); i += 1; continue; }
    if (ch === '(') { tokens.push({ kind: 'LParen', line }); i += 1; continue; }
    if (ch === ')') { tokens.push({ kind: 'RParen', line }); i += 1; continue; }
    if (ch === '>') { tokens.push({ kind: 'Gt', line }); i += 1; continue; }
    if (ch === '<') { tokens.push({ kind: 'Lt', line }); i += 1; continue; }

    // Identifiers or keywords
    if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
      let word = '';
      while (i < chars.length && ((chars[i] >= 'a' && chars[i] <= 'z') || (chars[i] >= 'A' && chars[i] <= 'Z') || (chars[i] >= '0' && chars[i] <= '9') || chars[i] === '_')) {
        word += chars[i];
        i += 1;
      }

      switch (word.toLowerCase()) {
        case 'set': tokens.push({ kind: 'Set', line }); break;
        case 'say': tokens.push({ kind: 'Say', line }); break;
        case 'if': tokens.push({ kind: 'If', line }); break;
        case 'then': tokens.push({ kind: 'Then', line }); break;
        case 'otherwise':
        case 'else': tokens.push({ kind: 'Otherwise', line }); break;
        case 'end': tokens.push({ kind: 'End', line }); break;
        case 'repeat': tokens.push({ kind: 'Repeat', line }); break;
        case 'times': tokens.push({ kind: 'Times', line }); break;
        case 'while': tokens.push({ kind: 'While', line }); break;
        case 'to': tokens.push({ kind: 'To', line }); break;
        case 'is': tokens.push({ kind: 'Is', line }); break;
        case 'above': tokens.push({ kind: 'Above', line }); break;
        case 'below': tokens.push({ kind: 'Below', line }); break;
        case 'equal': tokens.push({ kind: 'Equal', line }); break;
        case 'at': tokens.push({ kind: 'At', line }); break;
        case 'least': tokens.push({ kind: 'Least', line }); break;
        case 'most': tokens.push({ kind: 'Most', line }); break;
        case 'not': tokens.push({ kind: 'Not', line }); break;
        case 'and': tokens.push({ kind: 'And', line }); break;
        case 'or': tokens.push({ kind: 'Or', line }); break;
        case 'true': tokens.push({ kind: 'True', line }); break;
        case 'false': tokens.push({ kind: 'False', line }); break;
        default: tokens.push({ kind: { Ident: word }, line }); break;
      }
      continue;
    }

    throw new Error(`Line ${line}: Unexpected character '${ch}'`);
  }

  tokens.push({ kind: 'Eof', line });
  return tokens;
}

export function runSimulator(source) {
  const startTime = performance.now();
  let tokens = [];
  try {
    tokens = tokenizePlain(source);
  } catch (err) {
    return {
      success: false,
      output: [],
      tokens: [],
      ast: null,
      variables: {},
      error: err.message,
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
      engine: 'js-simulator'
    };
  }

  // Token stream navigation
  let pos = 0;
  function peek() {
    return tokens[pos] || { kind: 'Eof', line: 1 };
  }
  function advance() {
    const t = peek();
    pos++;
    return t;
  }
  function skipNewlines() {
    while (peek().kind === 'Newline') {
      advance();
    }
  }

  // Parser
  function parsePrimary() {
    const tok = advance();
    const k = tok.kind;
    if (typeof k === 'object') {
      if ('Number' in k) return { Literal: { Number: k.Number } };
      if ('Text' in k) return { Literal: { Text: k.Text } };
      if ('Ident' in k) return { Variable: k.Ident };
    }
    if (k === 'True') return { Literal: { Bool: true } };
    if (k === 'False') return { Literal: { Bool: false } };
    if (k === 'LParen') {
      const expr = parseExpression();
      if (peek().kind === 'RParen') {
        advance();
      } else {
        throw new Error(`Line ${tok.line}: Expected ')'`);
      }
      return expr;
    }
    if (k === 'Not') {
      return { Not: parsePrimary() };
    }
    if (k === 'Minus') {
      return { Neg: parsePrimary() };
    }
    throw new Error(`Line ${tok.line}: Expected an expression, got ${JSON.stringify(k)}`);
  }

  function parseFactor() {
    let expr = parsePrimary();
    while (true) {
      const k = peek().kind;
      if (k === 'Star') {
        advance();
        expr = { Binary: [expr, 'Mul', parsePrimary()] };
      } else if (k === 'Slash') {
        advance();
        expr = { Binary: [expr, 'Div', parsePrimary()] };
      } else {
        break;
      }
    }
    return expr;
  }

  function parseTerm() {
    let expr = parseFactor();
    while (true) {
      const k = peek().kind;
      if (k === 'Plus') {
        advance();
        expr = { Binary: [expr, 'Add', parseFactor()] };
      } else if (k === 'Minus') {
        advance();
        expr = { Binary: [expr, 'Sub', parseFactor()] };
      } else {
        break;
      }
    }
    return expr;
  }

  function parseComparison() {
    let expr = parseTerm();
    const tok = peek();
    const k = tok.kind;

    if (k === 'Is') {
      advance();
      const nextK = peek().kind;
      if (nextK === 'Above') {
        advance();
        return { Binary: [expr, 'Gt', parseTerm()] };
      } else if (nextK === 'Below') {
        advance();
        return { Binary: [expr, 'Lt', parseTerm()] };
      } else if (nextK === 'At') {
        advance();
        const afterAt = advance().kind;
        if (afterAt === 'Least') {
          return { Binary: [expr, 'Ge', parseTerm()] };
        } else if (afterAt === 'Most') {
          return { Binary: [expr, 'Le', parseTerm()] };
        }
        throw new Error(`Line ${tok.line}: Expected 'least' or 'most' after 'is at'`);
      } else if (nextK === 'Equal') {
        advance();
        if (peek().kind === 'To') advance();
        return { Binary: [expr, 'Eq', parseTerm()] };
      } else if (nextK === 'Not') {
        advance();
        if (peek().kind === 'Equal') {
          advance();
          if (peek().kind === 'To') advance();
        }
        return { Binary: [expr, 'Ne', parseTerm()] };
      } else {
        // plain "is" means equals
        return { Binary: [expr, 'Eq', parseTerm()] };
      }
    }

    if (k === 'Gt') { advance(); return { Binary: [expr, 'Gt', parseTerm()] }; }
    if (k === 'Lt') { advance(); return { Binary: [expr, 'Lt', parseTerm()] }; }
    if (k === 'Ge') { advance(); return { Binary: [expr, 'Ge', parseTerm()] }; }
    if (k === 'Le') { advance(); return { Binary: [expr, 'Le', parseTerm()] }; }
    if (k === 'EqEq') { advance(); return { Binary: [expr, 'Eq', parseTerm()] }; }
    if (k === 'NotEq') { advance(); return { Binary: [expr, 'Ne', parseTerm()] }; }

    return expr;
  }

  function parseAnd() {
    let expr = parseComparison();
    while (peek().kind === 'And') {
      advance();
      expr = { Binary: [expr, 'And', parseComparison()] };
    }
    return expr;
  }

  function parseExpression() {
    let expr = parseAnd();
    while (peek().kind === 'Or') {
      advance();
      expr = { Binary: [expr, 'Or', parseAnd()] };
    }
    return expr;
  }

  function parseStatement() {
    skipNewlines();
    const tok = peek();
    const k = tok.kind;

    if (k === 'Set') {
      advance();
      const identTok = advance();
      if (!identTok.kind || typeof identTok.kind !== 'object' || !('Ident' in identTok.kind)) {
        throw new Error(`Line ${tok.line}: Expected variable name after 'set'`);
      }
      const name = identTok.kind.Ident;
      if (peek().kind !== 'To') {
        throw new Error(`Line ${tok.line}: Expected 'to' after variable name in set statement`);
      }
      advance();
      const value = parseExpression();
      return { Set: { name, value } };
    }

    if (k === 'Say') {
      advance();
      const expr = parseExpression();
      return { Say: { expr } };
    }

    if (k === 'If') {
      advance();
      const condition = parseExpression();
      if (peek().kind === 'Then') advance();
      const thenBody = [];
      const elseBody = [];

      skipNewlines();
      while (peek().kind !== 'End' && peek().kind !== 'Otherwise' && peek().kind !== 'Eof') {
        thenBody.push(parseStatement());
        skipNewlines();
      }

      if (peek().kind === 'Otherwise') {
        advance();
        skipNewlines();
        while (peek().kind !== 'End' && peek().kind !== 'Eof') {
          elseBody.push(parseStatement());
          skipNewlines();
        }
      }

      if (peek().kind !== 'End') {
        throw new Error(`Line ${tok.line}: Expected 'end' to close if statement`);
      }
      advance();
      return { If: { condition, then_body: thenBody, else_body: elseBody } };
    }

    if (k === 'Repeat') {
      advance();
      const times = parseExpression();
      if (peek().kind !== 'Times') {
        throw new Error(`Line ${tok.line}: Expected 'times' after repeat count`);
      }
      advance();
      const body = [];
      skipNewlines();
      while (peek().kind !== 'End' && peek().kind !== 'Eof') {
        body.push(parseStatement());
        skipNewlines();
      }
      if (peek().kind !== 'End') {
        throw new Error(`Line ${tok.line}: Expected 'end' to close repeat block`);
      }
      advance();
      return { Repeat: { times, body } };
    }

    if (k === 'While') {
      advance();
      const condition = parseExpression();
      const body = [];
      skipNewlines();
      while (peek().kind !== 'End' && peek().kind !== 'Eof') {
        body.push(parseStatement());
        skipNewlines();
      }
      if (peek().kind !== 'End') {
        throw new Error(`Line ${tok.line}: Expected 'end' to close while block`);
      }
      advance();
      return { While: { condition, body } };
    }

    throw new Error(`Line ${tok.line}: Unexpected statement starting with ${JSON.stringify(k)}`);
  }

  let ast = [];
  try {
    skipNewlines();
    while (peek().kind !== 'Eof') {
      ast.push(parseStatement());
      skipNewlines();
    }
  } catch (err) {
    return {
      success: false,
      output: [],
      tokens,
      ast: null,
      variables: {},
      error: err.message,
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
      engine: 'js-simulator'
    };
  }

  // Interpreter
  const vars = {};
  const output = [];

  function isTruthy(val) {
    if ('Bool' in val) return val.Bool;
    if ('Number' in val) return val.Number !== 0;
    if ('Text' in val) return val.Text.length > 0;
    return false;
  }

  function asNumber(val) {
    if ('Number' in val) return val.Number;
    throw new Error(`Expected a number, got ${val.Text !== undefined ? 'text' : 'true/false'}`);
  }

  function stringifyVal(val) {
    if ('Number' in val) return String(val.Number);
    if ('Text' in val) return val.Text;
    if ('Bool' in val) return String(val.Bool);
    return '';
  }

  function evalExpr(expr) {
    if ('Literal' in expr) return expr.Literal;
    if ('Variable' in expr) {
      const v = vars[expr.Variable];
      if (v === undefined) {
        throw new Error(`Unknown name '${expr.Variable}' (did you forget: set ${expr.Variable} to ...?)`);
      }
      return v;
    }
    if ('Not' in expr) {
      return { Bool: !isTruthy(evalExpr(expr.Not)) };
    }
    if ('Neg' in expr) {
      return { Number: -asNumber(evalExpr(expr.Neg)) };
    }
    if ('Binary' in expr) {
      const [left, op, right] = expr.Binary;
      if (op === 'And') {
        const l = evalExpr(left);
        if (!isTruthy(l)) return { Bool: false };
        return { Bool: isTruthy(evalExpr(right)) };
      }
      if (op === 'Or') {
        const l = evalExpr(left);
        if (isTruthy(l)) return { Bool: true };
        return { Bool: isTruthy(evalExpr(right)) };
      }
      const l = evalExpr(left);
      const r = evalExpr(right);

      if (op === 'Add') {
        if ('Text' in l || 'Text' in r) {
          return { Text: stringifyVal(l) + stringifyVal(r) };
        }
        return { Number: asNumber(l) + asNumber(r) };
      }
      if (op === 'Sub') return { Number: asNumber(l) - asNumber(r) };
      if (op === 'Mul') return { Number: asNumber(l) * asNumber(r) };
      if (op === 'Div') {
        const divisor = asNumber(r);
        if (divisor === 0) throw new Error('Division by zero');
        return { Number: asNumber(l) / divisor };
      }
      if (op === 'Eq') return { Bool: stringifyVal(l) === stringifyVal(r) };
      if (op === 'Ne') return { Bool: stringifyVal(l) !== stringifyVal(r) };
      if (op === 'Gt') return { Bool: asNumber(l) > asNumber(r) };
      if (op === 'Lt') return { Bool: asNumber(l) < asNumber(r) };
      if (op === 'Ge') return { Bool: asNumber(l) >= asNumber(r) };
      if (op === 'Le') return { Bool: asNumber(l) <= asNumber(r) };
    }
    throw new Error('Unknown expression format');
  }

  function execBlock(stmts) {
    for (const stmt of stmts) {
      execStmt(stmt);
    }
  }

  function execStmt(stmt) {
    if ('Set' in stmt) {
      const v = evalExpr(stmt.Set.value);
      vars[stmt.Set.name] = v;
      return;
    }
    if ('Say' in stmt) {
      const v = evalExpr(stmt.Say.expr);
      const lineStr = stringifyVal(v);
      if (output.length < 5000) {
        output.push(lineStr);
      } else if (output.length === 5000) {
        output.push('... [Output truncated after 5,000 lines]');
      }
      return;
    }
    if ('If' in stmt) {
      if (isTruthy(evalExpr(stmt.If.condition))) {
        execBlock(stmt.If.then_body);
      } else {
        execBlock(stmt.If.else_body);
      }
      return;
    }
    if ('Repeat' in stmt) {
      const count = Math.floor(asNumber(evalExpr(stmt.Repeat.times)));
      if (count < 0) throw new Error('repeat count cannot be negative');
      for (let i = 0; i < count; i++) {
        execBlock(stmt.Repeat.body);
      }
      return;
    }
    if ('While' in stmt) {
      let guard = 0;
      while (isTruthy(evalExpr(stmt.While.condition))) {
        execBlock(stmt.While.body);
        guard++;
        if (guard > 1000000) {
          throw new Error('while loop stopped: over 1,000,000 iterations (infinite loop?)');
        }
      }
      return;
    }
  }

  try {
    execBlock(ast);
    return {
      success: true,
      output,
      tokens,
      ast,
      variables: vars,
      error: null,
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
      engine: 'js-simulator'
    };
  } catch (err) {
    return {
      success: false,
      output,
      tokens,
      ast,
      variables: vars,
      error: err.message,
      executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100,
      engine: 'js-simulator'
    };
  }
}

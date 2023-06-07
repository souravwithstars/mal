const { MalSymbol, MalList, MalVector, MalNil, MalBool, MalMap, MalPrimitive, MalString, MalKeyword }
  = require('./types.js');

class Reader {
  constructor(tokens) {
    this.tokens = tokens;
    this.position = 0;
  }

  peek() {
    return this.tokens[this.position];
  }

  next() {
    const token = this.peek();
    this.position++;
    return token;
  }
}

const tokenize = str => {
  const re = /[\s,]*(~@|[\[\]{}()'`~^@]|"(?:\\.|[^\\"])*"?|;.*|[^\s\[\]{}('"`,;)]*)/g;

  return [...str.matchAll(re)].map(x => x[1]).slice(0, -1).filter(y => !y.startsWith(';'));
};

const read_seq = (reader, closingSymbol) => {
  reader.next();
  const ast = [];

  while (reader.peek() !== closingSymbol) {
    if (reader.peek() === undefined) throw 'unbalanced';

    ast.push(read_form(reader));
  }

  reader.next();
  return ast;
};

const read_list = reader => {
  const ast = read_seq(reader, ')');
  return new MalList(ast);
};

const read_vector = reader => {
  const ast = read_seq(reader, ']');
  return new MalVector(ast);
};

const read_map = reader => {
  const ast = read_seq(reader, '}');
  return new MalMap(ast);
};

const createMalString = (str) => {
  const value = str.replace(/\\(.)/g, (x, captured) => {
    return captured === 'n' ? '\n' : captured;
  });
  return new MalString(value);
};

const read_atom = reader => {
  const token = reader.next();

  if (token.match(/^-?[0-9]+$/)) {
    return new MalPrimitive(parseInt(token));
  }

  if (token.match(/^"(?:\\.|[^\\"])*"$/)) {
    return createMalString(token.slice(1, token.length - 1));
  }

  if (token[0] === ':') {
    return new MalKeyword(token);
  }

  if (token === 'true') {
    return new MalBool(true);
  }

  if (token === 'false') {
    return new MalBool(false);
  }

  if (token === 'nil') {
    return new MalNil(token);
  }

  return new MalSymbol(token);
};

const prependSymbol = (reader, symbolStr) => {
  reader.next();
  const symbol = new MalSymbol(symbolStr);
  const newAst = read_form(reader);
  return new MalList([symbol, newAst]);
};

const read_form = reader => {
  const token = reader.peek();
  switch (token) {
    case '(':
      return read_list(reader);
    case '[':
      return read_vector(reader);
    case '{':
      return read_map(reader);
    case ';':
      reader.next();
      return new MalNil();
    case '@':
      return prependSymbol(reader, 'deref');
    case "'":
      return prependSymbol(reader, 'quote');
    case '`':
      return prependSymbol(reader, 'quasiquote');
    case '~':
      return prependSymbol(reader, 'unquote');
    case '~@':
      return prependSymbol(reader, 'splice-unquote');
    default:
      return read_atom(reader);
  }
};

const read_str = str => {
  const tokens = tokenize(str);
  const reader = new Reader(tokens);
  return read_form(reader);
};

module.exports = { read_str, createMalString };

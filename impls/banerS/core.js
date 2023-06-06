const { MalAtom, MalList, MalBool, MalPrimitive, MalNil, MalString, MalValue } = require('./types.js');
const { operate, concatStrings } = require('./utility.js');
const { read_str } = require('./reader.js');
const fs = require('fs');

const core = {
  '+': (...args) => operate('add', ...args),
  '-': (...args) => operate('sub', ...args),
  '*': (...args) => operate('mul', ...args),
  '/': (...args) => operate('div', ...args),
  '=': (...args) => operate('equals', ...args),
  '>=': (...args) => operate('greaterEquals', ...args),
  '<=': (...args) => operate('lesserEquals', ...args),
  '>': (...args) => operate('greaterThan', ...args),
  '<': (...args) => operate('lesserThan', ...args),
  'list': (...args) => new MalList(args),
  'list?': (args) => new MalBool(args instanceof MalList),
  'empty?': (args) => new MalBool(args.value.length === 0),
  'count': (args) => {
    if (args instanceof MalNil) return new MalPrimitive(0);
    return new MalPrimitive(args.value.length);
  },
  'prn': (...args) => {
    if (args.length === 0) {
      console.log();
    } else {
      console.log(concatStrings(args, " ", false, true));
    }
    return new MalNil();
  },
  'pr-str': (...args) => {
    const result = concatStrings(args, " ", false, true);
    return new MalString(result);
  },
  'str': (...args) => {
    const result = concatStrings(args, "", true);
    return new MalValue(result);
  },
  'println': (...args) => {
    if (args.length === 0) {
      console.log();
    } else {
      console.log(concatStrings(args, " ", false, false));
    }
    return new MalNil();
  },
  'read-string': (string) => read_str(string.value),
  'slurp': (filename) => new MalString(fs.readFileSync(filename.value, 'utf8')),
  'atom': (value) => new MalAtom(value),
  'atom?': (value) => value instanceof MalAtom,
  'deref': (atom) => atom.deref(),
  'reset!': (atom, value) => atom.reset(value),
  'swap!': (atom, fn, ...args) => atom.swap(fn, args),
};

module.exports = { core };

const { MalList, MalBool, MalPrimitive, MalNil } = require('./types.js');
const { operate } = require('./utility.js');

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
  'not': (args) => {
    if (args.value === 0) return new MalBool(false);
    return new MalBool(!(EVAL(args, env).value));
  },
  'prn': (...args) => {
    if (args.length === 0) console.log();
    args.forEach(arg => console.log(arg.value));
    return new MalNil();
  }
};

module.exports = { core };

const readline = require('readline');
const { read_str } = require('./reader.js');
const { MalSymbol, MalList, MalString, MalVector, MalMap, MalBool, MalPrimitive, MalNil, MalFunction } = require('./types.js');
const { Env } = require('./env.js');
const { pr_str } = require('./printer.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const identityFn = number => new MalPrimitive(number.value);

const generalAddition = (firstNum, secondNum) =>
  new MalPrimitive(firstNum.value + secondNum.value);

const oneValueSubstraction = number => new MalPrimitive(0 - number.value);
const generalSubstraction = (firstNum, secondNum) =>
  new MalPrimitive(firstNum.value - secondNum.value);

const generalMultiplication = (firstNum, secondNum) =>
  new MalPrimitive(firstNum.value * secondNum.value);

const oneValueDivision = number => new MalPrimitive(`1/${number.value}`);
const generalDivision = (firstNum, secondNum) =>
  new MalPrimitive(firstNum.value / secondNum.value);

const oneValueEquals = _ => new MalBool(true);
const generalEquals = (firstValue, secondValue) => firstValue.value === secondValue.value;

const generalGreaterEquals = (firstValue, secondValue) =>
  firstValue.value >= secondValue.value;

const generalLesserEquals = (firstValue, secondValue) =>
  firstValue.value <= secondValue.value;

const generalGreaterThan = (firstValue, secondValue) =>
  firstValue.value > secondValue.value;

const generalLesserThan = (firstValue, secondValue) =>
  firstValue.value < secondValue.value;

const equalityCheck = (genFn, ...args) => {
  for (let i = 0; i < args.length - 1; i++) {
    if (!genFn(...args.slice(i, i + 2))) {
      return false;
    }
  }
  return true;
};

const FNMAP = {
  'add': { genFn: generalAddition, oneValueFn: identityFn },
  'sub': { genFn: generalSubstraction, oneValueFn: oneValueSubstraction },
  'mul': { genFn: generalMultiplication, oneValueFn: identityFn },
  'div': { genFn: generalDivision, oneValueFn: oneValueDivision },
  'equals': { genFn: generalEquals, oneValueFn: oneValueEquals },
  'greaterEquals': { genFn: generalGreaterEquals, oneValueFn: oneValueEquals },
  'lesserEquals': { genFn: generalLesserEquals, oneValueFn: oneValueEquals },
  'greaterThan': { genFn: generalGreaterThan, oneValueFn: oneValueEquals },
  'lesserThan': { genFn: generalLesserThan, oneValueFn: oneValueEquals }
};

const operate = (operation, initialNumber, ...args) => {
  const { genFn, oneValueFn } = FNMAP[operation];
  const equalityOp = ['equals', 'greaterEquals', 'lesserEquals', 'greaterThan', 'lesserThan'];
  if (initialNumber === undefined) {
    if (operation === 'add') return oneValueFn(new MalPrimitive(0))
    if (operation === 'mul') return oneValueFn(new MalPrimitive(1));

    throw 'Wrong Number of args [0]';
  };
  if (args.length === 0) return oneValueFn(initialNumber);

  if (equalityOp.includes(operation)) {
    return new MalBool(equalityCheck(genFn, initialNumber, ...args));
  };

  return args.reduce(genFn, initialNumber);
};

const eval_ast = (ast, env) => {
  if (ast instanceof MalSymbol) {
    return env.get(ast);
  }

  if (ast instanceof MalList) {
    const newAst = ast.value.map(x => EVAL(x, env));
    return new MalList(newAst);
  }

  if (ast instanceof MalVector) {
    const newAst = ast.value.map(x => EVAL(x, env));
    return new MalVector(newAst);
  }

  if (ast instanceof MalMap) {
    const newAst = ast.value.map((x, i) => {
      if (i % 2 === 0) return x;
      return EVAL(x, env)
    });
    return new MalMap(newAst);
  }

  if (ast instanceof MalString) {
    const newAst = EVAL(ast.value, env);
    return new MalString(newAst);
  }

  return ast;
};

const handle_def = (ast, env) => {
  env.set(ast.value[1], EVAL(ast.value[2], env));
  return env.get(ast.value[1]);
};

const handle_let = (ast, env) => {
  const [bindings, ...forms] = ast.value.slice(1);

  const newEnv = new Env(env, bindings, forms);
  for (let i = 0; i < ast.value[1].value.length; i += 2) {
    newEnv.set(ast.value[1].value[i], EVAL(ast.value[1].value[i + 1], newEnv));
  }

  const doForms = new MalList([new MalSymbol('do'), ...forms]);
  return [doForms, newEnv];
};

const handle_do = (ast, env) => {
  const forms = ast.value.slice(1);
  let result = new MalNil();
  forms.slice(0, -1).forEach(form => {
    result = EVAL(form, env);
  })
  return forms[forms.length - 1];
};

const handle_if = (ast, env) => {
  const [_, condition, ifPart, elsePart] = ast.value;

  const result = EVAL(condition, env);

  if (result.value === false || result instanceof MalNil) {
    return elsePart === undefined ? new MalNil() : elsePart;
  }

  return ifPart;
};

const handle_fn = (ast, env) => {
  const [bindings, ...fnbody] = ast.value.slice(1);
  const doForms = new MalList([new MalSymbol('do'), ...fnbody]);
  return new MalFunction(doForms, bindings, env);
};

const READ = str => read_str(str);
const EVAL = (ast, env) => {
  while (true) {
    if (!(ast instanceof MalList)) return eval_ast(ast, env);

    if (ast.isEmpty()) return ast;

    switch (ast.value[0].value) {
      case 'def!':
        return handle_def(ast, env);
      case 'let*':
        [ast, env] = handle_let(ast, env);
        break;
      case 'do':
        ast = handle_do(ast, env);
        break;
      case 'if':
        ast = handle_if(ast, env);
        break;
      case 'fn*':
        ast = handle_fn(ast, env);
        break;
      default:
        const [fn, ...args] = eval_ast(ast, env).value;
        if (fn instanceof MalFunction) {
          const binds = fn.binds;
          const oldEnv = fn.env;
          ast = fn.value;
          env = new Env(oldEnv, binds.value, args);
        } else {
          return fn.apply(null, args);
        }
    }
  }
};
const PRINT = malValue => pr_str(malValue);

const env = new Env();
env.set(new MalSymbol('+'), (...args) => operate('add', ...args));
env.set(new MalSymbol('-'), (...args) => operate('sub', ...args));
env.set(new MalSymbol('*'), (...args) => operate('mul', ...args));
env.set(new MalSymbol('/'), (...args) => operate('div', ...args));
env.set(new MalSymbol('='), (...args) => operate('equals', ...args));
env.set(new MalSymbol('>='), (...args) => operate('greaterEquals', ...args));
env.set(new MalSymbol('<='), (...args) => operate('lesserEquals', ...args));
env.set(new MalSymbol('>'), (...args) => operate('greaterThan', ...args));
env.set(new MalSymbol('<'), (...args) => operate('lesserThan', ...args));
env.set(new MalSymbol('list'), (...args) => new MalList(args));
env.set(new MalSymbol('list?'), (args) => new MalBool(args instanceof MalList));
env.set(new MalSymbol('empty?'), (args) => new MalBool(args.value.length === 0));
env.set(new MalSymbol('count'), (args) => {
  if (args instanceof MalNil) return new MalPrimitive(0);
  return new MalPrimitive(args.value.length);
});

env.set(new MalSymbol('not'), (args) => {
  if (args.value === 0) return new MalBool(false);
  return new MalBool(!(EVAL(args, env).value));
});

env.set(new MalSymbol('prn'), (...args) => {
  if (args.length === 0) console.log();
  args.forEach(arg => console.log(arg.value));
  return new MalNil();
});

const rep = str => PRINT(EVAL(READ(str), env));

const repl = () => {
  rl.question('user=> ', line => {
    try {
      console.log(rep(line));
    } catch (e) {
      console.log(e);
    }
    repl();
  });
};

repl();

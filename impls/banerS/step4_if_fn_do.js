const readline = require('readline');
const { read_str } = require('./reader.js');
const { MalSymbol, MalList, MalValue, MalVector, MalMap, MalBool, MalPrimitive, MalNil } = require('./types.js');
const { Env } = require('./env.js');
// const { pr_str } = require('./printer.js');

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

const oneValueEquals = value => new MalBool(true);
const generalEquals = (firstValue, secondValue) =>
  firstValue.value === secondValue.value;

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
    if (!genFn(...args.slice(i, i + 2))) return false;
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

  if (equalityOp.includes(operation)) return new MalBool(equalityCheck(genFn, initialNumber, ...args));

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

  return ast;
};

const handle_def = (ast, env) => {
  env.set(ast.value[1], EVAL(ast.value[2], env));
  return env.get(ast.value[1]);
};

const handle_let = (ast, env) => {
  const newEnv = new Env(env);
  for (let i = 0; i < ast.value[1].value.length; i += 2) {
    newEnv.set(ast.value[1].value[i], EVAL(ast.value[1].value[i + 1], newEnv));
  }
  return EVAL(ast.value[2], newEnv);
};

const handle_do = (ast, env) => {
  const evaluatedValues = ast.value.slice(1)
    .map(operation => EVAL(operation, env));
  return evaluatedValues[evaluatedValues.length - 1];
};

const handle_if = (ast, env) => {
  const [_, condition, ifPart, elsePart] = ast.value;
  const elsePartValue = elsePart ? EVAL(elsePart, env) : new MalNil();
  const evaluatedValue = EVAL(condition, env);
  let result;

  if (evaluatedValue instanceof MalNil || evaluatedValue instanceof MalBool) {
    result = new MalBool(evaluatedValue.value);
  } else if (evaluatedValue instanceof MalPrimitive) {
    result = new MalBool(true);
  }
  return result.value ? EVAL(ifPart, env) : elsePartValue;
};

const isCapturingPresent = list => {
  return list.some(element => element.value === '&');
};

const getIndexOfCapture = list => {
  for (let i = 0; i < list.length; i++) {
    if (list[i].value === '&') return i;
  }
};

const handle_fn = (ast, env) => {
  const [_, bindings, fnbody] = ast.value;

  return (...args) => {
    const newEnv = new Env(env);
    if (isCapturingPresent(bindings.value)) {
      const capturingIndex = getIndexOfCapture(bindings.value);
      const bindingElements = bindings.value.slice(0, capturingIndex);
      const restElements = bindings.value.slice(capturingIndex);

      bindingElements.forEach(
        (symbol, index) => newEnv.set(symbol, EVAL(args[index], newEnv)));
      newEnv.set(restElements[1],
        new MalList(EVAL(args.slice(capturingIndex), newEnv)));

      return EVAL(fnbody, newEnv);
    }

    if (bindings.value.length !== args.length)
      throw `Wrong number of args (${args.length}) passed to Function`;

    bindings.value.forEach((symbol, index) => newEnv.set(symbol, EVAL(args[index], newEnv)));
    return EVAL(fnbody, newEnv);
  }
};

const READ = str => read_str(str);
const EVAL = (ast, env) => {
  if (!(ast instanceof MalList)) return eval_ast(ast, env);

  if (ast.isEmpty()) return ast;

  switch (ast.value[0].value) {
    case 'def!':
      return handle_def(ast, env);
    case 'let*':
      return handle_let(ast, env);
    case 'do':
      return handle_do(ast, env);
    case 'if':
      return handle_if(ast, env);
    case 'fn*':
      return handle_fn(ast, env);
  }
  const [fn, ...args] = eval_ast(ast, env).value;

  return fn.apply(null, args);
};
const PRINT = malValue => malValue.pr_str();

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
env.set(new MalSymbol('count'), (args) => new MalPrimitive(args.value.length));

env.set(new MalSymbol('prn'), (...args) => {
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

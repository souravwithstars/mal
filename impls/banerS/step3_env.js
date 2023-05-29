const readline = require('readline');
const { read_str } = require('./reader.js');
const { MalSymbol, MalList, MalValue, MalVector, MalMap } = require('./types.js');
const { Env } = require('./env.js');
// const { pr_str } = require('./printer.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const identityFn = number => new MalValue(number.value);

const generalAddition = (firstNum, secondNum) =>
  new MalValue(firstNum.value + secondNum.value);

const oneValueSubstraction = number => new MalValue(0 - number.value);
const generalSubstraction = (firstNum, secondNum) =>
  new MalValue(firstNum.value - secondNum.value);

const generalMultiplication = (firstNum, secondNum) =>
  new MalValue(firstNum.value * secondNum.value);

const oneValueDivision = number => new MalValue(`1/${number.value}`);
const generalDivision = (firstNum, secondNum) =>
  new MalValue(firstNum.value / secondNum.value);

const FNMAP = {
  'add': { genFn: generalAddition, oneValueFn: identityFn },
  'sub': { genFn: generalSubstraction, oneValueFn: oneValueSubstraction },
  'mul': { genFn: generalMultiplication, oneValueFn: identityFn },
  'div': { genFn: generalDivision, oneValueFn: oneValueDivision }
};

const operate = (operation, initialNumber, ...args) => {
  const { genFn, oneValueFn } = FNMAP[operation];
  if (initialNumber === undefined) {
    if (operation === 'add') return oneValueFn(new MalValue(0))
    if (operation === 'mul') return oneValueFn(new MalValue(1));

    throw 'Wrong Number of args [0]';
  };
  if (args.length === 0) return oneValueFn(initialNumber);

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

const READ = str => read_str(str);
const EVAL = (ast, env) => {
  if (!(ast instanceof MalList)) return eval_ast(ast, env);

  if (ast.isEmpty()) return ast;

  switch (ast.value[0].value) {
    case 'def!':
      env.set(ast.value[1], EVAL(ast.value[2], env));
      return env.get(ast.value[1]);
    case 'let*':
      const newEnv = new Env(env);
      for (let i = 0; i < ast.value[1].value.length; i += 2) {
        newEnv.set(ast.value[1].value[i], EVAL(ast.value[1].value[i + 1], newEnv));
      }
      return EVAL(ast.value[2], newEnv);
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

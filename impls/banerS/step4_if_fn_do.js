const readline = require('readline');
const { read_str } = require('./reader.js');
const { MalSymbol, MalList, MalString, MalVector, MalMap, MalBool, MalNil } = require('./types.js');
const { Env } = require('./env.js');
const { pr_str } = require('./printer.js');
const { core } = require('./core.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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
  } else {
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

  const clojure = (...args) => {
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

    bindings.value.forEach((symbol, index) => newEnv.set(symbol, args[index]));
    return EVAL(fnbody, newEnv);
  };

  clojure.toString = () => '#<function>';

  return clojure;
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
const PRINT = malValue => pr_str(malValue);

const env = new Env();
Object.entries(core).forEach(([key, value]) => env.set(new MalSymbol(key), value));
env.set(new MalSymbol('not'), (args) => {
  if (args.value === 0) return new MalBool(false);
  return new MalBool(!(EVAL(args, env).value));
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

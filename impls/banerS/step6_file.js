const readline = require('readline');
const { MalSymbol, MalList, MalString, MalVector, MalMap, MalNil, MalFunction, MalBool } = require('./types.js');
const { Env } = require('./env.js');
const { core } = require('./core.js');
const { pr_str } = require('./printer.js');
const { read_str } = require('./reader.js');

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
const PRINT = malValue => pr_str(malValue, true);

const env = new Env();

const createReplEnv = () => {
  Object.entries(core).forEach(([key, value]) => env.set(new MalSymbol(key), value));
  env.set(new MalSymbol('not'), (args) => {
    if (args.value === 0) return new MalBool(false);
    return new MalBool(!(EVAL(args, env).value));
  });
  env.set(new MalSymbol('eval'), (ast) => EVAL(ast, env));
};

createReplEnv();

const rep = str => PRINT(EVAL(READ(str), env));
rep('(def! load-file (fn* (f) (eval (read-string (str "(do " (slurp f) "\nnil)")))))');

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

if (process.argv.length >= 3) {
  // const args = Array.from(process.argv).slice(3);
  rep("(load-file \"" + process.argv[2] + "\")");
  rl.close();
} else {
  repl();
}


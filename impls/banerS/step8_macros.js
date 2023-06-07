const readline = require('readline');
const { Env } = require('./env.js');
const { core } = require('./core.js');
const { pr_str } = require('./printer.js');
const { read_str } = require('./reader.js');
const {
  MalSymbol,
  MalList,
  MalString,
  MalVector,
  MalMap,
  MalNil,
  MalFunction,
  MalBool,
  MalIterable
} = require('./types.js');

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
      if (i % 2 === 0) return new MalString(x.value);
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

const isMacroCall = (ast, env) => {
  try {
    return ((ast instanceof MalList) &&
      !ast.isEmpty() &&
      (ast.value[0] instanceof MalSymbol) &&
      env.get(ast.value[0]).isMacro);
  } catch {
    return false;
  }
};

const macroExpand = (ast, env) => {
  while (isMacroCall(ast, env)) {
    const macro = env.get(ast.value[0]);
    ast = macro.apply(null, ast.value.slice(1));
  }
  return ast;
};

const handleDef = (ast, env) => {
  env.set(ast.value[1], EVAL(ast.value[2], env));
  return env.get(ast.value[1]);
};

const handleDefMacro = (ast, env) => {
  const macro = EVAL(ast.value[2], env);
  macro.isMacro = true;
  env.set(ast.value[1], macro);
  return env.get(ast.value[1]);
};

const handleLet = (ast, env) => {
  const [bindings, ...forms] = ast.value.slice(1);

  const newEnv = new Env(env, bindings.value, forms);
  for (let i = 0; i < bindings.value.length; i += 2) {
    newEnv.set(bindings.value[i], EVAL(bindings.value[i + 1], newEnv));
  }

  const doForms = new MalList([new MalSymbol('do'), ...forms]);
  return [doForms, newEnv];
};

const handleDo = (ast, env) => {
  const forms = ast.value.slice(1);
  let result = new MalNil();
  forms.slice(0, -1).forEach(form => {
    result = EVAL(form, env);
  })
  return forms[forms.length - 1];
};

const handleIf = (ast, env) => {
  const [_, condition, ifPart, elsePart] = ast.value;

  const result = EVAL(condition, env);

  if (result.value === false || result instanceof MalNil) {
    return elsePart === undefined ? new MalNil() : elsePart;
  }

  return ifPart;
};

const handleFn = (ast, env) => {
  const [bindings, ...fnbody] = ast.value.slice(1);
  const doForms = new MalList([new MalSymbol('do'), ...fnbody]);
  const fn = (...args) => {
    const newEnv = new Env(env, bindings.value, args);
    return EVAL(...fnbody, newEnv);
  };
  return new MalFunction(doForms, bindings, env, fn);
};

const READ = str => read_str(str);
const EVAL = (ast, env) => {
  while (true) {
    if (!(ast instanceof MalList)) return eval_ast(ast, env);

    if (ast.isEmpty()) return ast;

    ast = macroExpand(ast, env);

    if (!(ast instanceof MalList)) return eval_ast(ast, env);

    switch (ast.value[0].value) {
      case 'def!':
        return handleDef(ast, env);
      case 'defmacro!':
        return handleDefMacro(ast, env);
      case 'let*':
        [ast, env] = handleLet(ast, env);
        break;
      case 'do':
        ast = handleDo(ast, env);
        break;
      case 'if':
        ast = handleIf(ast, env);
        break;
      case 'quote':
        return ast.value[1];
      case 'quasiquoteexpand':
        return quasiquote(ast.value[1]);
      case 'macroexpand':
        return macroExpand(ast.value[1], env);
      case 'quasiquote':
        ast = quasiquote(ast.value[1]);
        break;
      case 'fn*':
        ast = handleFn(ast, env);
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

const quasiquote = (ast) => {
  if (ast instanceof MalList && ast.beginsWith('unquote')) return ast.value[1];

  if (ast instanceof MalSymbol || ast instanceof MalMap) return new MalList([new MalSymbol('quote'), ast]);

  if (ast instanceof MalIterable) {
    let result = new MalList([]);
    for (let i = ast.value.length - 1; i >= 0; i--) {
      const element = ast.value[i];
      if (element instanceof MalList && element.beginsWith('splice-unquote')) {
        result = new MalList([new MalSymbol('concat'), element.value[1], result]);
      } else {
        result = new MalList([new MalSymbol('cons'), quasiquote(element), result]);
      }
    }
    if (ast instanceof MalVector) return new MalList([new MalSymbol('vec'), result]);
    if (ast instanceof MalMap) return new MalList([new MalSymbol('map'), result]);

    return result;
  }

  return ast;
};

const PRINT = malValue => pr_str(malValue, true);

const env = new Env();

const createReplEnv = () => {
  Object.entries(core).forEach(([key, value]) => env.set(new MalSymbol(key), value));
  env.set(new MalSymbol('not'), (args) => {
    if (args.value === 0) return new MalBool(false);
    return new MalBool(!(EVAL(args, env).value));
  });
  env.set(new MalSymbol('*ARGV*'), new MalList([]));
  env.set(new MalSymbol('eval'), (ast) => EVAL(ast, env));
};

createReplEnv();

const rep = str => PRINT(EVAL(READ(str), env));
rep('(def! load-file (fn* (f) (eval (read-string (str "(do " (slurp f) "\nnil)")))))');
rep("(defmacro! cond (fn* (& xs) (if (> (count xs) 0) (list 'if (first xs) (if (> (count xs) 1) (nth xs 1) (throw \"odd number of forms to cond\")) (cons 'cond (rest (rest xs)))))))");

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
  const args = Array.from(process.argv).slice(3);
  const malArgs = new MalList(args.map(x => new MalString(x)));
  env.set(new MalSymbol('*ARGV*'), malArgs);
  rep('(load-file \"' + process.argv[2] + '\")');
  rl.close();
} else {
  repl();
}

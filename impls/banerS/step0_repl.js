const readline = require('readline');

const READ = _ => _;
const EVAL = _ => _;
const PRINT = _ => _;

const rep = _ => PRINT(EVAL(READ(_)));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const repl = () => {
  rl.question('user> ', line => {
    console.log(rep(line));
    repl();
  });
};

repl();

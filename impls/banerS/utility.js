const { MalBool, MalPrimitive, MalIterable } = require('./types.js');

const identityFn = number => new MalPrimitive(number.value);

const generalAddition = (firstNum, secondNum) =>
  new MalPrimitive(firstNum.value + secondNum.value);

const oneValueSubstraction = number => new MalPrimitive(0 - number.value);
const generalSubstraction = (firstNum, secondNum) =>
  new MalPrimitive(firstNum.value - secondNum.value);

const generalMultiplication = (firstNum, secondNum) =>
  new MalPrimitive(firstNum.value * secondNum.value);

const oneValueDivision = number => new MalPrimitive(1 / number.value);
const generalDivision = (firstNum, secondNum) =>
  new MalPrimitive(firstNum.value / secondNum.value);

const oneValueEquals = _ => new MalBool(true);
const generalEquals = (firstValue, secondValue) => firstValue.isEqual(secondValue);

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

const concatStrings = (args, separator, wrapRequired = false, asString = false) => {
  let result = "";
  for (let i = 0; i < args.length; i++) {
    let element;
    if (args[i] instanceof MalIterable) {
      element = concatStrings(args[i].value, " ", false, true);
    } else {
      element = asString ? args[i].pr_str() : args[i].value.toString();
    }
    result = result.concat(separator + element);
  }
  return wrapRequired ? `"${result.trim()}"` : result.trim();
};

module.exports = { operate, concatStrings };

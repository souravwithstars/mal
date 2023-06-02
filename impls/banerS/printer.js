const { MalValue } = require('./types.js');

const pr_str = malValue => {
  if (malValue instanceof MalValue) return malValue.pr_str(malValue);
  return malValue.toString();
};

module.exports = { pr_str };

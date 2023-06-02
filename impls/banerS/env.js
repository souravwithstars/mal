const { MalList } = require('./types.js');

class Env {
  #outer
  constructor(outer, binds = [], exprs = []) {
    this.#outer = outer;
    this.data = {};
    this.#setBinds(binds, exprs);
  }

  #setBinds(binds, exprs) {
    let index = 0;
    while (index < binds.length && binds[index].value !== '&') {
      this.set(binds[index], exprs[index]);
      index++;
    }

    if (index >= binds.length) return;

    this.set(binds[index + 1], new MalList(exprs.slice(index)));
  }

  set(symbol, malValue) {
    this.data[symbol.value] = malValue;
  }

  find(symbol) {
    if (this.data[symbol.value]) return this;

    if (this.#outer) return this.#outer.find(symbol);
  }

  get(symbol) {
    const env = this.find(symbol);
    if (!env) throw `${symbol.value} not found`;
    return env.data[symbol.value];
  }
}

module.exports = { Env };

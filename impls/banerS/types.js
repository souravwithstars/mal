class MalValue {
  constructor(value) {
    this.value = value;
  }

  pr_str() {
    return this.value.toString();
  }

  isEqual(otherValue) {
    if (!(otherValue instanceof MalValue)) return false;
    return otherValue.value === this.value;
  }
}

class MalSymbol extends MalValue {
  constructor(value) {
    super(value);
  }

  isEqual(otherValue) {
    if (!(otherValue instanceof MalSymbol)) return false;
    return otherValue.value === this.value;
  }
}

class MalIterable extends MalValue {
  constructor(value) {
    super(value);
  }

  isEqual(otherValue) {
    if (!(otherValue instanceof MalIterable)) return false;
    if (otherValue.value.length !== this.value.length) return false;

    for (let index = 0; index < this.value.length; index++) {
      if (!this.value[index].isEqual(otherValue.value[index])) return false;
    }

    return true;
  }
}

class MalList extends MalIterable {
  constructor(value) {
    super(value);
  }

  pr_str() {
    return '(' + this.value.map(x => x.pr_str()).join(' ') + ')';
  }

  isEmpty() {
    return this.value.length === 0;
  }
}

class MalVector extends MalIterable {
  constructor(value) {
    super(value);
  }

  pr_str() {
    return '[' + this.value.map(x => x.pr_str()).join(' ') + ']';
  }
}

class MalMap extends MalIterable {
  constructor(value) {
    super(value);
  }

  pr_str() {
    return '{' + this.value.map((x, i) => {
      if ((i % 2 !== 0) && (i !== this.value.length - 1)) {
        return x.pr_str() + ',';
      }
      return x.pr_str();
    }).join(' ') + '}';
  }
}

class MalPrimitive extends MalValue {
  constructor(value) {
    super(value);
  }

  isEqual(otherValue) {
    if (!(otherValue instanceof MalPrimitive)) return false;
    return otherValue.value === this.value;
  }
}

class MalNil extends MalPrimitive {
  constructor(value) {
    super(null);
  }

  isEqual(otherValue) {
    return otherValue instanceof MalNil;
  }

  pr_str() {
    return 'nil';
  }
}

class MalBool extends MalPrimitive {
  constructor(value) {
    super(value);
  }

  pr_str() {
    return this.value.toString();
  }

  isEqual(otherValue) {
    if (!(otherValue instanceof MalBool)) return false;
    return otherValue.value === this.value;
  }
}

class MalString extends MalValue {
  constructor(value) {
    super(value);
  }

  pr_str() {
    return this.value();
  }
}

class MalFunction extends MalValue {
  constructor(ast, binds, env) {
    super(ast);
    this.binds = binds;
    this.env = env;
  }

  pr_str() {
    return '#<Function>';
  }
}

module.exports = { MalList, MalSymbol, MalValue, MalVector, MalNil, MalBool, MalMap, MalPrimitive, MalString, MalFunction };

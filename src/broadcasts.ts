import { Block } from './block';

export class Broadcasts {
  registry: Map<string, string[]>;
  constructor() {
    this.registry = new Map();
  }

  has(key: string) {
    return this.registry.has(key);
  }

  add_stack(key: string, stack_fn: string) {
    if (!this.registry.has(key)) this.registry.set(key, []);
    const elem = this.registry.get(key) || [];
    elem.push(stack_fn);

    return `${key}.add_stack_fn(${stack_fn})`;
  }

  get_code(key: string) {
    return `${key} = Message()`;
  }

  static sanitize(key: string) {
    key = key.replace(/[^a-zA-Z0-9_]/gim, '');
    // TODO: select only valid e.g. must start with char
    // TODO: check uniqueness
    return key;
  }
  // static to_global_code() {
  // }
}

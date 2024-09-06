import { BlockValue } from './blockvalue';

export class Variables {
  static REGISTRY = {};
  static use(name, default_value = null, is_list = false) {
    if (!this.REGISTRY[name])
      this.REGISTRY[name] = { value: default_value, is_list };
  }
  static convert(name, is_list = false) {
    this.use(name, null, is_list);
    return `global_${name}`;
  }
  static to_global_code() {
    return Object.entries(this.REGISTRY).map(
      ([key, value]: [string, BlockValue | any]) =>
        `${this.convert(key)} = ${value.value || (!value.is_list ? 'None' : '[]')}`
    );
  }
}

import * as Helpers from './helpers';

export class BlockValue {
  private _value: string | number;
  private _is_dynamic: boolean;
  private _is_variable: boolean;
  private _is_string: boolean;
  constructor(
    value: string | number,
    is_dynamic = false,
    is_variable = false,
    is_string = false
  ) {
    this._value = value;
    this._is_dynamic = is_dynamic;
    this._is_variable = is_variable;
    this._is_string = is_string;
  }
  get value() {
    return this._value;
  }
  get is_dynamic() {
    return this._is_dynamic;
  }
  get is_variable() {
    return this._is_variable;
  }
  get is_numeric() {
    return (
      !this.is_dynamic && !this._is_string && typeof this.value === 'number'
    );
  }
  get is_string() {
    return this._is_string;
  }
  get raw() {
    return !this.is_string || this.is_dynamic ? this.value : `"${this.value}"`;
    //const is_string = this.is_string || typeof(this.value) !== 'number'
    //return !this.is_numeric ? this.value : `"${this.value}"`;
  }
  static is(value: any) {
    return value?.constructor === BlockValue;
  }
  static is_dynamic(value: any) {
    return BlockValue.is(value) && value._is_dynamic;
  }
  static raw(value: any) {
    return BlockValue.is(value) ? value.raw : value;
  }
  static value(value: any) {
    return BlockValue.is(value) ? value.value : value;
  }

  static num_eval(a: any, b: any = undefined, c: any = undefined): any {
    if (arguments.length === 1) {
      if (Array.isArray(a)) return this.num_eval(...(a as [any]));
      return !BlockValue.is_dynamic(a) ? BlockValue.raw(a) : a;
    } else if (arguments.length === 2) {
      if (a !== '-') return null;
      const b1 = BlockValue.num_eval(b);
      if (!BlockValue.is_dynamic(b1)) return -b1;
      else return new BlockValue(`-${BlockValue.raw(b1)}`, true);
    } else if (arguments.length === 3) {
      const a1 = BlockValue.num_eval(a);
      const c1 = BlockValue.num_eval(c);
      const allow_local =
        !BlockValue.is_dynamic(a1) && !BlockValue.is_dynamic(c1);
      if (allow_local) {
        if (b === '+')
          return new BlockValue(BlockValue.raw(a1) + BlockValue.raw(c1));
        if (b === '-')
          return new BlockValue(BlockValue.raw(a1) - BlockValue.raw(c1));
        if (b === '*')
          return new BlockValue(BlockValue.raw(a1) * BlockValue.raw(c1));
        if (b === '/')
          return new BlockValue(BlockValue.raw(a1) / BlockValue.raw(c1));
      } else {
        return new BlockValue(
          `${Helpers.get('float_safe', a1).raw} ${b} ${Helpers.get('float_safe', c1).raw}`,
          true
        );
      }
    }
    return null;
  }
}

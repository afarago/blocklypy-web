import * as Imports from './imports';
import * as Helpers from './helpers';
import { BlockValue } from './blockvalue';

export function calc_stop(value = -1) {
  Imports.use('pybricks.parameters', 'Stop');
  switch (value) {
    case 0:
      return `Stop.COAST`;
    case 1:
      return `Stop.BRAKE`;
    case 2:
      return `Stop.HOLD`;
  }
}

export function round2(value: number, ndigits = 0) {
  const mul = 10 ** ndigits;
  return Math.round(value * mul) / mul;
}

//#region old_converters
//!! to be conerted to Helper function
export function calc_comparator(value: BlockValue) {
  if (value.value === '=') return new BlockValue('==');
  else return value;
}
export function calc_hub_orientation(value: string) {
  Imports.use('pybricks.parameters', 'Side');
  return 'Side.' + BlockValue.value(value)?.replace('side', '').toUpperCase();
}

export function convert_matrix(value: string, brightness: number = 100) {
  // "9959999599555559555929992"
  value = value.replaceAll('"', '').trim();
  let idx = 0;

  const postfixFactor =
    brightness < 100 ? ` * ${round2(brightness / 100, 2)}` : '';

  // on/off pixel values only
  if (value.match(/^[09]{25}$/))
    return `Icon(0b${value.replaceAll('9', '1')})${postfixFactor}`;

  // any pixel values
  const retval = [];
  for (let y = 0; y < 5; y++) {
    const row = [];
    for (let x = 0; x < 5; x++) {
      const c = value.slice(idx++, idx);
      row.push(Helpers.get('convert_brightness', parseInt(c)).value);
    }
    retval.push(row);
  }
  return `Matrix(${JSON.stringify(retval)})${postfixFactor}`;
}
//#endregion old_converters

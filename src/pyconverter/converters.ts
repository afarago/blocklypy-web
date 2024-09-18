import { BlockValue } from './blockvalue';
import context from './context';

enum FLIPPERSTOP {
  COAST = 0,
  BRAKE = 1,
  HOLD = 2,
}
const flipperStopMap = new Map([
  [FLIPPERSTOP.COAST, 'Stop.COAST'],
  [FLIPPERSTOP.BRAKE, 'Stop.BRAKE'],
  [FLIPPERSTOP.HOLD, 'Stop.HOLD'],
]);

// enum FLIPPERORIENTATION {
//   FRONT = 0,
//   BACK = 1,
//   TOP = 2,
//   BOTTOM = 3,
//   LEFT = 4,
//   RIGHT = 5,
// }

// const flipperOrientationMap = new Map([
//   [FLIPPERORIENTATION.FRONT, 'Side.FRONT'],
//   [FLIPPERORIENTATION.BACK, 'Side.BACK'],
//   [FLIPPERORIENTATION.TOP, 'Side.TOP'],
//   [FLIPPERORIENTATION.BOTTOM, 'Side.BOTTOM'],
//   [FLIPPERORIENTATION.LEFT, 'Side.LEFT'],
//   [FLIPPERORIENTATION.RIGHT, 'Side.RIGHT'],
// ]);

enum FLIPPERCOLORS {
  BLACK = 0,
  MAGENTA = 1,
  VIOLET = 2,
  BLUE = 3,
  TURQUOISE = 4,
  GREEN = 5,
  YELLOWGREEN = 6,
  YELLOW = 7,
  ORANGE = 8,
  RED = 9,
  WHITE = 10,
}
export const flipperColorsMap = new Map([
  [FLIPPERCOLORS.BLACK, 'Color.BLACK'],
  [FLIPPERCOLORS.MAGENTA, 'Color.MAGENTA'],
  [FLIPPERCOLORS.VIOLET, 'Color.VIOLET'],
  [FLIPPERCOLORS.BLUE, 'Color.BLUE'],
  [FLIPPERCOLORS.TURQUOISE, 'Color.CYAN'],
  [FLIPPERCOLORS.GREEN, 'Color.GREEN'],
  [FLIPPERCOLORS.YELLOWGREEN, 'Color.GREEN'],
  [FLIPPERCOLORS.YELLOW, 'Color.YELLOW'],
  [FLIPPERCOLORS.ORANGE, 'Color.ORANGE'],
  [FLIPPERCOLORS.RED, 'Color.RED'],
  [FLIPPERCOLORS.WHITE, 'Color.WHITE'],
]);

enum EV3COLORS {
  NONE = 0,
  BLACK = 1,
  BLUE = 2,
  GREEN = 3,
  YELLOW = 4,
  RED = 5,
  WHITE = 6,
  BROWN = 7,
  CHANGED = -1,
}
export const ev3ColorsMap = new Map([
  [EV3COLORS.NONE, 'Color.NONE'],
  [EV3COLORS.BLACK, 'Color.BLACK'],
  [EV3COLORS.BLUE, 'Color.BLUE'],
  [EV3COLORS.GREEN, 'Color.GREEN'],
  [EV3COLORS.YELLOW, 'Color.YELLOW'],
  [EV3COLORS.RED, 'Color.RED'],
  [EV3COLORS.WHITE, 'Color.WHITE'],
  [EV3COLORS.BROWN, 'Color.BROWN'],
]);

export function calc_stop(value = -1) {
  context.imports.use('pybricks.parameters', 'Stop');

  if (flipperStopMap.has(value)) return flipperStopMap.get(value);
}

export function round2(value: number, ndigits = 0) {
  const mul = 10 ** ndigits;
  return Math.round(value * mul) / mul;
}

//#region old_converters
//!! to be conerted to Helper function
export function calc_comparator(value: BlockValue) {
  //TODO: if comparator is ==, we should use range, instead of simple comparison (e.g. 1% means x>0% or y<2%)
  // ev3classroom: "042" is used for "=<>"
  let comparator;
  switch (value.value) {
    default:
    case '<':
    case '>':
      comparator = value.value;
      break;
    case '2':
      comparator = '>';
      break;
    case '4':
      comparator = '<';
      break;
    case '0':
    case '=':
      comparator = '==';
      break;
  }
  return new BlockValue(comparator, true);
}

export function convert_matrix(value: string, brightness = 100) {
  // "9959999599555559555929992"
  value = value.replaceAll('"', '').trim();
  let idx = 0;

  const postfixFactor =
    brightness < 100 ? ` * ${round2(brightness / 100, 2)}` : '';

  // on/off pixel values only
  if (value.match(/^[09]{25}$/)) {
    context.imports.use('pybricks.parameters', 'Icon');
    return `Icon(0b${value.replaceAll('9', '1')})${postfixFactor}`;
  }

  // any pixel values
  const retval = [];
  for (let y = 0; y < 5; y++) {
    const row = [];
    for (let x = 0; x < 5; x++) {
      const c = value.slice(idx++, idx);
      row.push(
        context.helpers.use('convert_brightness')?.call(parseInt(c)).value
      );
    }
    retval.push(row);
  }

  context.imports.use('pybricks.tools', 'Matrix');
  return `Matrix(${JSON.stringify(retval)})${postfixFactor}`;
}
//#endregion old_converters

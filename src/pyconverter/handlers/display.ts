import { Block } from '../block';
import { BlockValue } from '../blockvalue';
import { convert_matrix } from '../converters';
import * as Helpers from '../helpers';
import { AWAIT_PLACEHOLDER } from '../utils';
import { BlockHandlersType, OperatorHandlersType } from './handlers';
import * as Variables from '../variables';

let global_pixel_brightness = 100;
// TODO: later on add possibility to set variable/expr for global brightness

function flipperdisplay_ledSetBrightness(block: Block) {
  const brightness = block.get_input('BRIGHTNESS');
  global_pixel_brightness = Number(brightness.value);
  return [`# setting hub icon display brightness to ${brightness.raw}%`];
}

function flipperdisplay_ledOn(block: Block) {
  const x = block.get_input('X');
  const y = block.get_input('Y');
  const brightness = block.get_input('BRIGHTNESS');
  const x1 = BlockValue.num_eval(x, '-', 1);
  const y1 = BlockValue.num_eval(y, '-', 1);
  return [
    `hub.display.pixel(${x1.raw}, ${y1.raw}, ${Helpers.get('float', brightness).raw})`,
  ];
}

function flipperdisplay_ledText(block: Block) {
  const text = block.get_input('TEXT');
  const expr = text.is_string
    ? BlockValue.raw(text)
    : Helpers.get('str', text).value;
  return [`${AWAIT_PLACEHOLDER}hub.display.text(${expr})`];
}

function flipperdisplay_ledImageFor(block: Block) {
  const value = Helpers.get('convert_time', block.get_input('VALUE'));
  const matrix = block.get_input('MATRIX');

  return [
    `hub.display.icon(${convert_matrix(matrix.value?.toString(), global_pixel_brightness)})`,
    `${AWAIT_PLACEHOLDER}wait(${value.raw})`,
    'hub.display.off()',
  ];
}

function flipperdisplay_ledImage(block: Block) {
  const matrix = block.get_input('MATRIX');
  return [
    `hub.display.icon(${convert_matrix(matrix.value?.toString(), global_pixel_brightness)})`,
  ];
}

function flipperdisplay_centerButtonLight(block: Block) {
  const color = Helpers.get('convert_color', block.get_input('COLOR'));
  return [`hub.light.on(${color.value})`];
}

function flipperdisplay_displayOff(block: Block) {
  {
    return ['hub.display.off()'];
  }
}

export default function display() {
  const blockHandlers: BlockHandlersType = {
    flipperdisplay_displayOff: flipperdisplay_displayOff,
    flipperlight_lightDisplayOff: flipperdisplay_displayOff,
    flipperdisplay_centerButtonLight: flipperdisplay_centerButtonLight,
    flipperlight_centerButtonLight: flipperdisplay_centerButtonLight,
    flipperdisplay_ledImage: flipperdisplay_ledImage,
    flipperlight_lightDisplayImageOn: flipperdisplay_ledImage,
    flipperdisplay_ledImageFor: flipperdisplay_ledImageFor,
    flipperlight_lightDisplayImageOnForTime: flipperdisplay_ledImageFor,
    flipperdisplay_ledText: flipperdisplay_ledText,
    flipperlight_lightDisplayText: flipperdisplay_ledText,
    flipperdisplay_ledOn: flipperdisplay_ledOn,
    flipperlight_lightDisplaySetPixel: flipperdisplay_ledOn,
    flipperdisplay_ledSetBrightness: flipperdisplay_ledSetBrightness,
    flipperlight_lightDisplaySetBrightness: flipperdisplay_ledSetBrightness,
  };
  const operationHandlers: OperatorHandlersType = null;

  return { blockHandlers, operationHandlers };
}

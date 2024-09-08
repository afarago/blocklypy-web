import * as Helpers from '../helpers.js';
import * as Imports from '../imports';
import { BlockHandlersType, OperatorHandlersType } from './handlers.js';
import { calc_comparator } from '../converters.js';
import { BlockValue } from '../blockvalue.js';
import { Block } from '../block.js';
import { DeviceSensor } from '../devicesensor.js';
import { debug } from '../utils.js';

// function flippermoresensors_deviceType(block: Block) {
//   // TODO get PUPDevice of the current device for the info object!
// }

function flippersensors_orientation(block: Block) {
  return Helpers.get(
    'calc_hub_orientation_back',
    new BlockValue('hub.imu.up()', true)
  );
}

function flippersensors_isorientation(block: Block) {
  const orientation = block.get_field(
    block?.opcode.includes('_is') ? 'ORIENTATION' : 'VALUE'
  )?.value;
  return new BlockValue(
    `hub.imu.up() == ${Helpers.get('calc_hub_orientation', orientation).value}`,
    true
  );
}
function flippersensors_orientationAxis(block: Block) {
  const orientation = block.get_field('AXIS')?.value?.toString();

  // TODO: get back to -180 - 180 tange
  if (orientation === 'yaw') return new BlockValue('hub.imu.heading()', true);
  else if (orientation === 'pitch')
    return new BlockValue('hub.imu.tilt()[0]', true);
  else if (orientation === 'roll')
    return new BlockValue('hub.imu.tilt()[1]', true);
}

function flippersensors_color(block: Block) {
  const port = block.get_input('PORT').value;
  const device = DeviceSensor.instance(port, 'ColorSensor');
  const d = device.devicename;

  return Helpers.get(
    'convert_color_back',
    new BlockValue(`${d}.color()`, true)
  );
}

function flippersensors_isColor(block: Block) {
  const port = block.get_input('PORT').value;
  const color1 = block.get_input(
    block?.opcode.includes('_is') ? 'VALUE' : 'OPTION'
  );
  const color = Helpers.get('convert_color', color1);

  const device = DeviceSensor.instance(port, 'ColorSensor'); //!! what if port is a variable??
  const d = device.devicename;
  return new BlockValue(`${d}.color() == ${color.value}`, true);
}

function flippersensors_reflectivity(block: Block) {
  const port = block.get_input('PORT').value;

  const device = DeviceSensor.instance(port, 'ColorSensor');
  const d = device.devicename;
  return new BlockValue(`${d}.reflection()`, true);
}

function flippersensors_isReflectivity(block: Block) {
  const port = block.get_input('PORT').value;
  const value = block.get_input('VALUE');
  const comparator = calc_comparator(block.get_field('COMPARATOR'));

  const device = DeviceSensor.instance(port, 'ColorSensor');
  const d = device.devicename;
  return new BlockValue(
    `${d}.reflection() ${comparator.value} ${Helpers.get('float_safe', value).raw}`,
    true
  );
}

function flippersensors_isPressed(block: Block) {
  const port = block.get_input('PORT').value;
  const option = block.get_field('OPTION'); // pressed, hardpressed, released, pressurechanged

  const device = DeviceSensor.instance(port, 'ForceSensor');
  const d = device.devicename;
  switch (option.value) {
    case 'pressed':
      return new BlockValue(`${d}.pressed()`, true);
    case 'released':
      return new BlockValue(`not ${d}.pressed()`, true);
    case 'hardpressed':
      return new BlockValue(`${d}.pressed(10)`, true);
    case 'pressurechanged':
      throw new Error('pressurechanged - Not implemented yet');
  }
}

function flippersensors_distance(block: Block) {
  const port = block.get_input('PORT').value;
  const unit = block.get_field('UNIT');

  const device = DeviceSensor.instance(port, 'UltrasonicSensor');
  const d = device.devicename;

  return Helpers.get(
    'convert_ussensor_distance_back',
    new BlockValue(`${d}.distance()`, true),
    unit
  );
}

function flippersensors_isDistance(block: Block) {
  const port = block.get_input('PORT').value;
  const unit = block.get_field('UNIT');
  const value = block.get_input('VALUE');

  const adjusted_value = Helpers.get(
    'convert_ussensor_distance',
    Helpers.get('float_safe', value),
    unit
  );

  const comparator = calc_comparator(block.get_field('COMPARATOR'));
  //TODO: if comparator is ==, we should use range, instead of simple comparison (e.g. 1% means x>0% or y<2%)

  const device = DeviceSensor.instance(port, 'UltrasonicSensor');
  const d = device.devicename;
  return new BlockValue(
    `${d}.distance() ${comparator.value} ${adjusted_value.raw}`,
    true
  );
}

function flippersensors_buttonIsPressed(block: Block) {
  const button = block.get_field('BUTTON')?.value;
  const event = block.get_field('EVENT')?.value; // pressed, released

  const button_enum = `Button.${button?.toString().toUpperCase()}`;
  const value = `${button_enum} in hub.buttons.pressed()`;
  return new BlockValue(event === 'pressed' ? value : `not (${value})`, true);
}

export default function sensor() {
  const blockHandlers: BlockHandlersType = {};
  const operationHandlers: OperatorHandlersType = {
    // flippermoresensors_deviceType,

    flippersensors_orientationAxis,
    flippersensors_orientation,
    flippersensors_isorientation,
    flipperevents_whenOrientation: flippersensors_isorientation,

    flippersensors_color,
    flippersensors_isColor,
    flipperevents_whenColor: flippersensors_isColor,

    flippersensors_reflectivity,
    flippersensors_isReflectivity,
    flippersensors_whenReflectivity: flippersensors_isReflectivity,

    // flippersensors_pressed,
    flippersensors_isPressed,
    flipperevents_whenPressed: flippersensors_isPressed,

    flippersensors_distance,
    flippersensors_isDistance,
    flipperevents_whenDistance: flippersensors_isDistance,

    flippersensors_buttonIsPressed,
    flipperevents_whenButton: flippersensors_buttonIsPressed,
  };

  return { blockHandlers, operationHandlers };
}

import { Block } from '../block';
import { BlockValue } from '../blockvalue';
import context from '../context';
import { calc_comparator } from '../converters';
import { DeviceOnPortBase } from '../device';
import { DeviceSensor } from '../devicesensor';
import { AWAIT_PLACEHOLDER, CONST_AUTO_PORT } from '../utils';
import { HandlersType, OperatorHandler } from './handlers';

function flippermoresensors_deviceType(block: Block) {
  const port = DeviceOnPortBase.portToString(
    block.get_input('PORT')?.toString()
  );
  return context.helpers.use('pupdevice_type').call(port);
}

function flippersensors_orientation(_block: Block) {
  return context.helpers
    .use('calc_hub_orientation_back')
    ?.call(new BlockValue('hub.imu.up()', true));
}

function flippersensors_isorientation(block: Block) {
  const orientation = block.get_field(
    block?.opcode.includes('_is') ? 'ORIENTATION' : 'VALUE'
  )?.value;
  return new BlockValue(
    `hub.imu.up() == ${context.helpers.use('calc_hub_orientation')?.call(orientation).value}`,
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
  const port = block.get_input('PORT').value?.toString();
  const device = DeviceSensor.instance(port, 'ColorSensor');
  const d = device.devicename;

  return context.helpers
    .use('convert_color_back')
    ?.call(new BlockValue(`${AWAIT_PLACEHOLDER}${d}.color()`, true));
}

function flippersensors_isColor(block: Block) {
  const port = BlockValue.toString(block.get_input('PORT'));
  const color = block.get_input(
    block?.opcode === 'flippersensors_isColor' ? 'VALUE' : 'OPTION'
  );

  return _isColor(block, port, color);
}

function horizontalevents_whenColor(block: Block) {
  const port = CONST_AUTO_PORT;
  const color = block.get_input('COLOR');

  return _isColor(block, port, color);
}

function _isColor(_: Block, port: string, color1: BlockValue) {
  const color = context.helpers.use('convert_color')?.call(color1);

  const device = DeviceSensor.instance(port, 'ColorSensor');
  const d = device.devicename;
  return new BlockValue(
    `${AWAIT_PLACEHOLDER}${d}.color() == ${color.value}`,
    true
  );
}

function flippersensors_reflectivity(block: Block) {
  const port = block.get_input('PORT').value?.toString();

  const device = DeviceSensor.instance(port, 'ColorSensor');
  const d = device.devicename;
  return new BlockValue(`${AWAIT_PLACEHOLDER}${d}.reflection()`, true);
}

function flippersensors_isReflectivity(block: Block) {
  const port = block.get_input('PORT').value?.toString();
  const value = block.get_input('VALUE');
  const comparator = calc_comparator(block.get_field('COMPARATOR'));

  const device = DeviceSensor.instance(port, 'ColorSensor');
  const d = device.devicename;
  return new BlockValue(
    `${AWAIT_PLACEHOLDER}${d}.reflection() ${comparator.value} ${context.helpers.use('float_safe')?.call(value).raw}`,
    true
  );
}

function flippersensors_isPressed(block: Block) {
  const port = BlockValue.toString(block.get_input('PORT'));
  const option = block.get_field('OPTION'); // pressed, hardpressed, released, pressurechanged

  return _isPressed(block, port, option);
}

function horizontalevents_whenPressed(block: Block) {
  const port = CONST_AUTO_PORT;
  const option = block.get_input('OPTION'); // pressed, hardpressed, released, pressurechanged

  return _isPressed(block, port, option);
}

function _isPressed(_: Block, port: string, option: BlockValue) {
  const device = DeviceSensor.instance(port, 'ForceSensor');
  const d = device.devicename;
  switch (option?.value) {
    case 'pressed':
      return new BlockValue(`${AWAIT_PLACEHOLDER}${d}.pressed()`, true);
    case 'released':
      return new BlockValue(`not ${AWAIT_PLACEHOLDER}${d}.pressed()`, true);
    case 'hardpressed':
      return new BlockValue(`${AWAIT_PLACEHOLDER}${d}.pressed(10)`, true);
    case 'pressurechanged':
      throw new Error('pressurechanged - Not implemented yet');
  }
}

function flippersensors_distance(block: Block) {
  const port = block.get_input('PORT').value?.toString();
  const unit = block.get_field('UNIT');

  const device = DeviceSensor.instance(port, 'UltrasonicSensor');
  const d = device.devicename;

  return context.helpers
    .use('convert_ussensor_distance_back')
    ?.call(new BlockValue(`${AWAIT_PLACEHOLDER}${d}.distance()`, true), unit);
}

function flippersensors_isDistance(block: Block) {
  const port = block.get_input('PORT')?.value?.toString();
  const unit = block.get_field('UNIT')?.value?.toString();
  const value = block.get_input('VALUE');
  const comparator = block.get_field('COMPARATOR');

  return _isDinstance(block, port, value, unit, comparator);
}

function horizontalevents_whenCloserThan(block: Block) {
  const port = CONST_AUTO_PORT;
  const unit = '%';
  const value = block.get_input('DISTANCE');
  const comparator = new BlockValue('<');

  return _isDinstance(block, port, value, unit, comparator);
}

function _isDinstance(
  _: Block,
  port: string,
  value: BlockValue,
  unit: string,
  comparator: BlockValue
) {
  const comparator1 = calc_comparator(comparator);
  const adjusted_value = context.helpers
    .use('convert_ussensor_distance')
    ?.call(context.helpers.use('float_safe')?.call(value), unit);

  //TODO: if comparator is ==, we should use range, instead of simple comparison (e.g. 1% means x>0% or y<2%)
  const device = DeviceSensor.instance(port, 'UltrasonicSensor');
  const d = device.devicename;
  return new BlockValue(
    `${AWAIT_PLACEHOLDER}${d}.distance() ${comparator1.value} ${adjusted_value.raw}`,
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

export default function sensor(): HandlersType {
  const blockHandlers: any = null;
  const operatorHandlers = new Map<string, OperatorHandler>([
    ['flippermoresensors_deviceType', flippermoresensors_deviceType],

    ['flippersensors_orientationAxis', flippersensors_orientationAxis],
    ['flippersensors_orientation', flippersensors_orientation],
    ['flippersensors_isorientation', flippersensors_isorientation],
    ['flipperevents_whenOrientation', flippersensors_isorientation],

    ['flippersensors_color', flippersensors_color],
    ['flippersensors_isColor', flippersensors_isColor],
    ['flipperevents_whenColor', flippersensors_isColor],
    ['horizontalevents_whenColor', horizontalevents_whenColor],

    ['flippersensors_reflectivity', flippersensors_reflectivity],
    ['flippersensors_isReflectivity', flippersensors_isReflectivity],
    ['flippersensors_whenReflectivity', flippersensors_isReflectivity],

    // ["flippersensors_pressed", flippersensors_pressed],
    ['flippersensors_isPressed', flippersensors_isPressed],
    ['flipperevents_whenPressed', flippersensors_isPressed],
    ['horizontalevents_whenPressed', horizontalevents_whenPressed],

    ['flippersensors_distance', flippersensors_distance],
    ['flippersensors_isDistance', flippersensors_isDistance],
    ['flipperevents_whenDistance', flippersensors_isDistance],
    ['horizontalevents_whenCloserThan', horizontalevents_whenCloserThan],

    ['flippersensors_buttonIsPressed', flippersensors_buttonIsPressed],
    ['flipperevents_whenButton', flippersensors_buttonIsPressed],
  ]);

  return { blockHandlers, operatorHandlers };
}

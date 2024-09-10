import helpers from '../helpers';
import {
  AWAIT_PLACEHOLDER,
  CONST_ROTATIONS,
  CONST_DEGREES,
  CONST_SECONDS,
} from '../utils';
import { BlockHandler, HandlersType, OperatorHandler } from './handlers';
import { calc_stop } from '../converters';
import { DeviceMotor } from '../devicemotor';
import { BlockValue, num_eval } from '../blockvalue';
import { Block } from '../block';

function flippermotor_motorSetSpeed(block: Block) {
  const port = block.get_input('PORT').value.toString();
  const speed = block.get_input('SPEED');

  const device = DeviceMotor.instance(port);
  // const d = device.devicename;

  const value = helpers.use('convert_speed')?.call(speed);
  device.default_speed = value;
  return [`${device.default_speed_variable} = ${value.raw}`];
}

function flippermoremotor_motorSetStopMethod(block: Block) {
  const port = block.get_input('PORT').value.toString();
  const stop = parseInt(block.get_field('STOP').value.toString()); // hold=2, break=1, coast=0
  const stop_then = calc_stop(stop);

  const device = DeviceMotor.instance(port);
  const d = device.devicename;
  device.default_then = stop_then;
  return [`# setting ${d} stop at end to ${stop_then}`];
}

function flippermotor_motorTurnForDirection(block: Block) {
  const port = block.get_input('PORT').value.toString();
  //TODO handle multiple motor mode
  const direction = block.get_input('DIRECTION'); // clockwise, counterclockwise
  const direction_sign = direction.value === 'clockwise' ? '' : '-';
  const direction_mulsign = direction.value === 'clockwise' ? +1 : -1;
  const value = block.get_input('VALUE');
  const unit = block.get_field('UNIT'); // rotations, degrees, seconds

  const device = DeviceMotor.instance(port);
  const d = device.devicename;
  const postfix_then = device.get_then() ? `, ${device.get_then()}` : '';
  if (unit.value === CONST_ROTATIONS || unit.value === CONST_DEGREES) {
    const value2 = num_eval(
      [direction_mulsign, '*', unit.value === CONST_ROTATIONS ? 360 : 1],
      '*',
      helpers.use('float_safe')?.call(value)
    );
    return [
      `${AWAIT_PLACEHOLDER}${d}.run_angle(${device.default_speed_variable}, ${value2.raw}${postfix_then})`,
    ];
  } else if (unit.value === CONST_SECONDS) {
    const value_adjusted = helpers.use('convert_time')?.call(value);
    return [
      `${AWAIT_PLACEHOLDER}${d}.run_time(${direction_sign}${device.default_speed_variable}, ${value_adjusted.raw}${postfix_then})`,
    ];
  } else {
    return null;
  }
}

function flippermotor_motorGoDirectionToPosition(block: Block) {
  const retval: string[] = [];
  const port = block.get_input('PORT').value.toString();
  const position = block.get_input('POSITION');
  const direction = block.get_field('DIRECTION').value; // clockwise, counterclockwise, shortest

  const device = DeviceMotor.instance(port);
  const d = device.devicename;
  if (direction === 'shortest') {
    // NOOP
  } else if (direction === 'clockwise') {
    const rotation_angle = `(${position.value} - ${d}.angle()) % 360`;
    retval.push(
      `${AWAIT_PLACEHOLDER}${d}.run_angle(${device.default_speed_variable}, ${rotation_angle}, Stop.NONE)`
    );
  } else if (direction === 'counterclockwise') {
    const rotation_angle = `-(360 - (${position.value} - ${d}.angle() % 360))`;
    retval.push(
      `${AWAIT_PLACEHOLDER}${d}.run_angle(${device.default_speed_variable}, ${rotation_angle}, Stop.NONE)`
    );
  }
  const postfix_then = device.get_then() ? `, ${device.get_then()}` : '';
  const value = num_eval(
    helpers.use('float_safe')?.call(position.value),
    '%',
    360
  );
  retval.push(
    `${AWAIT_PLACEHOLDER}${d}.run_target(${device.default_speed_variable}, ${value.raw}${postfix_then})`
  );

  return retval;
}

function flippermotor_motorStop(block: Block) {
  const port = block.get_input('PORT').value.toString();

  const device = DeviceMotor.instance(port);
  const d = device.devicename;
  return [`${AWAIT_PLACEHOLDER}${d}.stop()`];
}

function flippermotor_motorStartDirection(block: Block) {
  const port = block.get_input('PORT').value.toString();
  const direction = block.get_input('DIRECTION');
  const direction_sign = direction.value === 'clockwise' ? '' : '-';

  const device = DeviceMotor.instance(port);
  const d = device.devicename;
  return [
    `${AWAIT_PLACEHOLDER}${d}.run(${direction_sign}${device.default_speed_variable})`,
  ];
}

function flippermotor_absolutePosition(block: Block) {
  const port = block.get_input('PORT').value.toString();

  const device = DeviceMotor.instance(port);
  const d = device.devicename;
  return new BlockValue(`${d}.angle()`, true);
}

// function flippermoremotor_position (block: Block)
//   {
//     const port = block.get_input('PORT').value;

//     const device = DeviceMotor.instance(port);
//     const d = device.devicename;
//     return new BlockValue(`${d}.angle()`; //????
//   }
//   break;

function flippermotor_speed(block: Block) {
  const port = block.get_input('PORT').value.toString();

  const device = DeviceMotor.instance(port);
  const d = device.devicename;

  return helpers
    .use('convert_speed_back')
    ?.call(new BlockValue(`${d}.speed()`, true));
}

function flippermoremotor_power(block: Block) {
  const port = block.get_input('PORT').value.toString();

  const device = DeviceMotor.instance(port);
  const d = device.devicename;
  return new BlockValue(`${d}.load()`, true);
}

export default function display(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['flippermotor_motorSetSpeed', flippermotor_motorSetSpeed],
    ['flippermotor_motorStartDirection', flippermotor_motorStartDirection],
    ['flippermotor_motorStop', flippermotor_motorStop],
    [
      'flippermotor_motorGoDirectionToPosition',
      flippermotor_motorGoDirectionToPosition,
    ],
    ['flippermotor_motorTurnForDirection', flippermotor_motorTurnForDirection],
    [
      'flippermoremotor_motorSetStopMethod',
      flippermoremotor_motorSetStopMethod,
    ],
  ]);
  const operatorHandlers = new Map<string, OperatorHandler>([
    ['flippermotor_absolutePosition', flippermotor_absolutePosition],
    ['flippermotor_speed', flippermotor_speed],
    ['flippermoremotor_power', flippermoremotor_power],
  ]);

  return { blockHandlers, operatorHandlers };
}

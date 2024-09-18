import { Block } from '../block';
import { BlockValue, num_eval } from '../blockvalue';
import context from '../context';
import { calc_stop } from '../converters';
import { DeviceMotor } from '../devicemotor';
import {
  AWAIT_PLACEHOLDER,
  CONST_AUTO_PORT,
  CONST_DEGREES,
  CONST_ROTATIONS,
  CONST_SECONDS,
  _debug,
} from '../utils';
import { BlockHandler, HandlersType, OperatorHandler } from './handlers';

function flippermotor_motorSetSpeed(Block: Block) {
  return _motorSetSpeed(Block, true);
}

function horizontalmotor_motorSetSpeed(Block: Block) {
  return _motorSetSpeed(Block, false);
}

function _motorSetSpeed(block: Block, isFullMode: boolean) {
  const ports = isFullMode
    ? block.get_input('PORT')?.toString().split('')
    : [CONST_AUTO_PORT];
  const speed = block.get_input('SPEED');
  const value = context.helpers.use('convert_speed')?.call(speed);

  return ports.map(port => {
    const device = DeviceMotor.instance(port);
    return `${device.default_speed_variable} = ${value.raw}`;
  });
}

function flippermoremotor_motorSetStopMethod(block: Block) {
  const ports = block.get_input('PORT').value.toString().split('');
  const stop = parseInt(block.get_field('STOP').value.toString()); // hold=2, break=1, coast=0
  const stop_then = calc_stop(stop);

  return ports.map(port => {
    const device = DeviceMotor.instance(port);
    const d = device.devicename;
    device.default_then = stop_then;
    return `# setting ${d} stop at end to ${stop_then}`;
  });
}

function ev3motor_motorSetStopAction(block: Block) {
  const ports = block.get_input('PORT').value.toString().split('');
  const stop = parseInt(block.get_field('OPTION').value.toString()) * 2; // hold=1 ==> 2, coast=0
  const stop_then = calc_stop(stop);

  return ports.map(port => {
    const device = DeviceMotor.instance(port);
    const d = device.devicename;
    device.default_then = stop_then;
    return `# setting ${d} stop at end to ${stop_then}`;
  });
}

function horizontalmotor_motorTurnRotations(
  direction_mul: 1 | -1,
  block: Block
) {
  const rotations = block.get_input('ROTATIONS');

  return _flippermotor_motorTurn(
    block,
    CONST_AUTO_PORT,
    rotations,
    direction_mul,
    CONST_ROTATIONS,
    null
  );
}

function flippermotor_motorTurnForDirection(block: Block) {
  const port = BlockValue.toString(block.get_input('PORT'));

  //TODO handle multiple motor mode
  const direction =
    block.get_input('DIRECTION') ?? block.get_field('DIRECTION');
  const direction_mul = direction?.value === 'counterclockwise' ? -1 : +1;
  const value = block.get_input('VALUE');
  const unit = block.get_field('UNIT'); // rotations, degrees, seconds
  const speed0 = block.get_input('SPEED'); // ev3 classroom
  const speed = speed0
    ? context.helpers.use('convert_speed')?.call(speed0)
    : null;

  return _flippermotor_motorTurn(
    block,
    port,
    value,
    direction_mul,
    BlockValue.toString(unit),
    speed
  );
}

function _flippermotor_motorTurn(
  _: Block,
  port: string,
  value: BlockValue,
  direction_multiplier: 1 | -1,
  unit: string,
  speed: BlockValue
) {
  const device = DeviceMotor.instance(port);
  const d = device.devicename;
  const postfix_then = device.get_then() ? `, ${device.get_then()}` : '';
  if (!speed) speed = new BlockValue(device.default_speed_variable, true, true);

  if (unit === CONST_ROTATIONS || unit === CONST_DEGREES) {
    const value2 = num_eval(
      [direction_multiplier * (unit === CONST_ROTATIONS ? 360 : 1)],
      '*',
      context.helpers.use('float_safe')?.call(value)
    );
    return [
      `${AWAIT_PLACEHOLDER}${d}.run_angle(${speed.raw}, ${value2.raw}${postfix_then})`,
    ];
  } else if (unit === CONST_SECONDS) {
    const value_adjusted = context.helpers.use('convert_time')?.call(value);
    return [
      `${AWAIT_PLACEHOLDER}${d}.run_time(${direction_multiplier > 0 ? '' : '-'}${speed.raw}, ${value_adjusted.raw}${postfix_then})`,
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
    context.helpers.use('float_safe')?.call(position.value),
    '%',
    360
  );
  retval.push(
    `${AWAIT_PLACEHOLDER}${d}.run_target(${device.default_speed_variable}, ${value.raw}${postfix_then})`
  );

  return retval;
}

function motor_motorStop(block: Block) {
  const inputPort = block.get_input('PORT')?.toString();
  const ports = inputPort ? inputPort.split('') : [CONST_AUTO_PORT];

  return ports.map(port => {
    const device = DeviceMotor.instance(port);
    const d = device.devicename;

    switch (device.default_then) {
      case 'Stop.HOLD':
        return `${d}.hold()`;
      case 'Stop.COAST':
        return `${d}.stop()`;
      case 'Stop.BRAKE':
      default:
        return `${d}.brake()`;
    }
  });
}

function flippermotor_motorStartDirection(block: Block) {
  const ports = block.get_input('PORT').value.toString().split('');
  const direction =
    block.get_input('DIRECTION') ?? block.get_field('DIRECTION');
  const direction_sign = direction?.value === 'counterclockwise' ? '-' : '';
  const speed0 = block.get_input('SPEED'); // ev3 classroom

  return ports.map(port => {
    const device = DeviceMotor.instance(port);
    const d = device.devicename;

    const speed = speed0
      ? context.helpers.use('convert_speed')?.call(speed0)
      : new BlockValue(device.default_speed_variable, true, true);

    return `${d}.run(${direction_sign}${speed.raw})`;
  });
}

function flippermoremotor_motorStartPower(block: Block) {
  const ports = block.get_input('PORT')?.toString().split('');
  const power = block.get_input('POWER');

  return ports.map(port => {
    const device = DeviceMotor.instance(port);
    const d = device.devicename;
    return `${d}.dc(${power.raw})`;
  });
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

  return context.helpers
    .use('convert_speed_back')
    ?.call(new BlockValue(`${d}.speed()`, true));
}

function flippermoremotor_power(block: Block) {
  const port = block.get_input('PORT').value.toString();

  const device = DeviceMotor.instance(port);
  const d = device.devicename;
  return new BlockValue(`${d}.load()`, true);
}

export default function motor(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['flippermotor_motorSetSpeed', flippermotor_motorSetSpeed],
    ['ev3motor_motorSetSpeed', flippermotor_motorSetSpeed],
    ['horizontalmotor_motorSetSpeed', horizontalmotor_motorSetSpeed],
    ['flippermotor_motorStartDirection', flippermotor_motorStartDirection],
    ['ev3motor_motorStartSpeed', flippermotor_motorStartDirection],
    ['ev3motor_motorStart', flippermotor_motorStartDirection],
    ['flippermoremotor_motorStartPower', flippermoremotor_motorStartPower],
    ['ev3motor_motorStartPower', flippermoremotor_motorStartPower],
    ['flippermotor_motorStop', motor_motorStop],
    ['horizontalmotor_motorStop', motor_motorStop],
    ['ev3motor_motorStop', motor_motorStop],
    [
      'flippermotor_motorGoDirectionToPosition',
      flippermotor_motorGoDirectionToPosition,
    ],
    ['flippermotor_motorTurnForDirection', flippermotor_motorTurnForDirection],
    ['ev3motor_motorTurnFor', flippermotor_motorTurnForDirection],
    ['ev3motor_motorTurnForSpeed', flippermotor_motorTurnForDirection],
    [
      'horizontalmotor_motorTurnClockwiseRotations',
      horizontalmotor_motorTurnRotations.bind(this, +1),
    ],
    [
      'horizontalmotor_motorTurnCounterClockwiseRotations',
      horizontalmotor_motorTurnRotations.bind(this, -1),
    ],
    [
      'flippermoremotor_motorSetStopMethod',
      flippermoremotor_motorSetStopMethod,
    ],
    ['ev3motor_motorSetStopAction', ev3motor_motorSetStopAction],
  ]);
  const operatorHandlers = new Map<string, OperatorHandler>([
    ['flippermotor_absolutePosition', flippermotor_absolutePosition],
    ['flippermotor_speed', flippermotor_speed],
    ['ev3motor_speed', flippermotor_speed],
    ['flippermoremotor_power', flippermoremotor_power],
  ]);

  return { blockHandlers, operatorHandlers };
}

import { Block } from '../block';
import { BlockValue, num_eval } from '../blockvalue';
import { calc_stop } from '../converters';
import { DeviceDriveBase } from '../devicedrivebase';
import helpers from '../helpers';
import {
  AWAIT_PLACEHOLDER,
  CONST_CM,
  CONST_DEGREES,
  CONST_INCHES,
  CONST_ROTATIONS,
  CONST_SECONDS,
} from '../utils';
import { BlockHandler, HandlersType } from './handlers';

function _process_flippermove(
  op: string,
  unit: BlockValue,
  value: BlockValue,
  device: DeviceDriveBase,
  direction: string,
  steer?: BlockValue,
  speed?: BlockValue
) {
  const d = device.devicename;
  const postfix_then = device.get_then() ? `, ${device.get_then()}` : '';
  let direction_sign;

  //TODO: handle direction=null, steer=0... scenarios

  //=== SECONDS
  if (unit.value === CONST_SECONDS) {
    const time = helpers.use('convert_time')?.call(value);
    const stop_fn =
      device.get_then() === 'Stop.COAST'
        ? `${AWAIT_PLACEHOLDER}${d}.stop()`
        : `${AWAIT_PLACEHOLDER}${d}.brake()`;

    const retval = [];

    let steer_value = 0;
    if (direction) {
      if (direction === 'clockwise' || direction === 'counterclockwise') {
        //TODO: handle pivot turn (cw/ccw) for time
        throw new Error(
          `Steering direction ${direction} for ${op} is not yet implemented here`
        );
      }

      direction_sign =
        direction === 'forward' || direction === 'clockwise' ? '' : '-';
    } else if (steer) {
      steer_value = parseInt(steer.value.toString());
      // steer==0 is simply means 'forward'
      if (steer_value === 0) direction_sign = '';
      else
        throw new Error(
          `Steering direction ${steer.raw} for ${op} with ${unit.raw} is not yet implemented here`
        );
      //TODO: handle steering != 0 for time
    }

    const speed1 = speed ? speed.raw : device.default_speed_variable;

    retval.push(
      ...[
        `${AWAIT_PLACEHOLDER}${d}.drive(${direction_sign}${speed1}, ${steer_value})`,
        `${AWAIT_PLACEHOLDER}wait(${time.raw})`,
        `${stop_fn}`,
      ]
    );

    return retval;
  }

  //=== CM and INCHES
  let distance;
  if (unit.value === CONST_CM || unit.value === CONST_INCHES) {
    distance = helpers.use('convert_distance')?.call(value, unit);
  } else if (unit.value === CONST_ROTATIONS || unit.value === CONST_DEGREES) {
    const factor =
      device.rotation_distance * (unit.value === CONST_ROTATIONS ? 1 : 1 / 360);
    distance = num_eval(value, '*', factor);
  } else {
    throw new Error(`Unknown unit ${unit.value}`);
  }

  //== DIRECTION
  let steer_value = 0;
  if (direction) {
    //--- STRAIGHT
    if (direction === 'forward' || direction === 'back') {
      direction_sign = direction === 'forward' ? '' : '-';
      return [
        `${AWAIT_PLACEHOLDER}${d}.straight(${direction_sign}${distance.raw}${postfix_then})`,
      ];
    }
    //--- PIVOT TURN
    else if (direction === 'clockwise' || direction === 'counterclockwise') {
      direction_sign = direction === 'clockwise' ? '' : '-';
      // rot_deg = distance / (axle_track * PI)
      //TODO: use axle_track_variable
      const rot_deg = helpers
        .use('round')
        ?.call(
          num_eval([distance, '*', 360], '/', device.axle_track * Math.PI),
          2
        );
      return [
        `${AWAIT_PLACEHOLDER}${d}.turn(${direction_sign}${rot_deg.raw}${postfix_then})`,
      ];
    }
  }

  //== STEERING
  else if (steer) {
    steer_value = parseInt(steer.value.toString());
    // steer==0 is simply means 'forward'
    if (steer_value === 0) direction_sign = '';
    else
      throw new Error(
        `Steering direction ${steer.raw} for ${op} with ${unit.raw} is not yet implemented here`
      );
    //TODO: handle steering != 0 for time

    return [
      `${AWAIT_PLACEHOLDER}${d}.straight(${direction_sign}${distance.raw}${postfix_then})`,
    ];
  }
}

function flippermove_steer(block: Block) {
  const steer = block.get_input('STEERING');
  const steer_adjusted = steer; // TODO
  const value = block.get_input('VALUE');
  const unit = block.get_field('UNIT');

  const device = DeviceDriveBase.instance() as DeviceDriveBase;
  // inputs: steering, value
  return _process_flippermove(
    block.opcode,
    unit,
    value,
    device,
    null,
    steer_adjusted
  );
}

function flippermoremove_steerDistanceAtSpeed(block: Block) {
  const steer = block.get_input('STEERING');
  const steer_adjusted = steer; // TODO
  const value = block.get_input('DISTANCE');
  const unit = block.get_field('UNIT');
  const speed = helpers.use('convert_speed').call(block.get_input('SPEED'));

  const device = DeviceDriveBase.instance() as DeviceDriveBase;
  // inputs: steering, value
  return _process_flippermove(
    block.opcode,
    unit,
    value,
    device,
    null,
    steer_adjusted,
    speed
  );
}

function flippermove_startSteer(block: Block) {
  const steer = block.get_input('STEERING');
  //TODO: handle as value can stick in "straight: 0" instead of "0" when adding and removing variable
  // const steer_adjusted = steer; // TODO
  const speed = block.get_input('SPEED');

  //TODO: write a Helper for steer adjust, how to branch?
  const steer_value = parseInt(steer.value.toString());
  if (steer_value !== 0)
    throw new Error(
      `Steering direction ${steer.raw} for ${block.opcode} is not yet implemented here`
    );

  const device = DeviceDriveBase.instance() as DeviceDriveBase;
  const d = device.devicename;
  const speed1 = speed
    ? helpers.use('convert_speed').call(speed)
    : device.default_speed_variable;
  return [`${AWAIT_PLACEHOLDER}${d}.drive(${speed1}, ${steer_value})`];
}

// function flippermoremove_startSteerAtPower(block: Block) {
//   const steer = block.get_input('STEERING');
//   //TODO: handle as value can stick in "straight: 0" instead of "0" when adding and removing variable
//   // const steer_adjusted = steer; // TODO
//   const power = block.get_input('POWER');

//   //TODO: write a Helper for steer adjust, how to branch?
//   const steer_value = parseInt(steer.value.toString());
//   if (steer_value !== 0)
//     throw new Error(
//       `Steering direction ${steer.raw} for ${block.opcode} is not yet implemented here`
//     );

//   const device = DeviceDriveBase.instance() as DeviceDriveBase;
//   const dl = device.motor_left.devicename;
//   const dr = device.motor_right.devicename;
//   return [
//     `${AWAIT_PLACEHOLDER}${dl}.dc(${power})`,
//     `${AWAIT_PLACEHOLDER}${dr}.dc(${power})`,
//   ];
// }

function flippermoremove_movementSetStopMethod(block: Block) {
  const stop = parseInt(block.get_field('STOP')?.value?.toString());
  const stop_then = calc_stop(stop);

  const device = DeviceDriveBase.instance() as DeviceDriveBase;
  const d = device.devicename;
  device.default_then = stop_then;
  return [`# setting ${d} stop at end to ${stop_then}`];
}

function flippermove_movementSpeed(block: Block) {
  const speed = block.get_input('SPEED');

  const device = DeviceDriveBase.instance() as DeviceDriveBase;
  // const d = device.devicename;

  const value = helpers.use('convert_speed')?.call(speed);
  return [`${device.default_speed_variable} = ${value.raw}`];
}

function flippermove_move(block: Block) {
  const direction = block.get_input('DIRECTION');
  const value = block.get_input('VALUE');
  const unit = block.get_field('UNIT');

  const device = DeviceDriveBase.instance() as DeviceDriveBase;

  return _process_flippermove(
    block.opcode,
    unit,
    value,
    device,
    direction?.value?.toString(),
    null
  );
}

function flippermove_stopMove(_: Block) {
  const device = DeviceDriveBase.instance();
  const d = device.devicename;
  return [`${AWAIT_PLACEHOLDER}${d}.stop()`];
}

function flippermove_startMove(block: Block) {
  const direction = block.get_input('DIRECTION');
  const direction_forward = direction.value === 'forward';

  const device = DeviceDriveBase.instance() as DeviceDriveBase;
  const d = device.devicename;

  const speed = new BlockValue(
    device.default_speed_variable,
    true,
    true,
    false
  );
  return [
    `${AWAIT_PLACEHOLDER}${d}.drive(${direction_forward ? '' : '-'},${BlockValue.raw(speed)})`,
  ];
}

function flippermove_setDistance(block: Block) {
  const unit = block.get_field('UNIT');
  const distance = helpers
    .use('convert_distance')
    ?.call(block.get_input('DISTANCE'), unit).raw as number;

  const wheel_diameter = helpers.use('round')?.call(distance / Math.PI, 2).raw;
  const device = DeviceDriveBase.instance(
    null,
    wheel_diameter
  ) as DeviceDriveBase;
  // const d = device.devicename;

  device.rotation_distance = distance;
  device.wheel_diameter = wheel_diameter;
  return [
    `# setting drivebase wheel distance to ${distance}, that is wheel diameter ${wheel_diameter} mm - this will apply for the complete code`,
  ];
}

export function initMotorPairMovementPair(block?: Block, pair?: string[]) {
  const ports = block
    ? block.get_input('PAIR')?.value?.toString().split('')
    : pair;
  return DeviceDriveBase.instance(ports);
}

function flippermove_setMovementPair(block: Block) {
  const ports = block.get_input('PAIR')?.value?.toString().split('');

  // this handler is only a placeholder, initMotorPairMovementPair will only be called once in the preprocess phase
  const device = DeviceDriveBase.instance();
  return [
    `# setting drivebase motor pair to ${ports.join(', ')} - first one ${device.ports.join(', ')} is applied for the complete code`,
  ];
}

export default function motorpair(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['flippermove_setMovementPair', flippermove_setMovementPair],
    ['flippermove_setDistance', flippermove_setDistance],
    ['flippermove_startMove', flippermove_startMove],
    ['flippermove_stopMove', flippermove_stopMove],
    ['flippermove_move', flippermove_move],
    ['flippermove_movementSpeed', flippermove_movementSpeed],
    [
      'flippermoremove_movementSetStopMethod',
      flippermoremove_movementSetStopMethod,
    ],
    ['flippermove_startSteer', flippermove_startSteer],
    ['flippermoremove_startSteerAtSpeed', flippermove_startSteer],
    // ['flippermoremove_startSteerAtPower', flippermoremove_startSteerAtPower],
    ['flippermove_steer', flippermove_steer],
    [
      'flippermoremove_steerDistanceAtSpeed',
      flippermoremove_steerDistanceAtSpeed,
    ],
  ]);
  const operatorHandlers: any = null;

  return { blockHandlers, operatorHandlers };
}

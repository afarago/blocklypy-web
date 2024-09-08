import { Block } from '../block';
import { BlockValue, num_eval } from '../blockvalue';
import { calc_stop } from '../converters';
import { DeviceDriveBase } from '../devicedrivebase';
import * as Helpers from '../helpers';
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
  steer?: BlockValue
) {
  const d = device.devicename;
  const postfix_then = device.get_then() ? `, ${device.get_then()}` : '';
  let direction_sign;

  //TODO: handle direction=null, steer=0... scenarios

  //=== SECONDS
  if (unit.value === CONST_SECONDS) {
    const time = Helpers.get('convert_time', value);
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

    retval.push(
      ...[
        `${AWAIT_PLACEHOLDER}${d}.drive(${direction_sign}${device.default_speed_variable}, ${steer_value})`,
        `${AWAIT_PLACEHOLDER}wait(${time.raw})`,
        `${stop_fn}`,
      ]
    );

    return retval;
  }

  //=== CM and INCHES
  let distance;
  if (unit.value === CONST_CM || unit.value === CONST_INCHES) {
    distance = Helpers.get('convert_distance', value, unit);
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
      const rot_deg = Helpers.get(
        'round',
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

function flippermove_startSteer(block: Block) {
  const steer = block.get_input('STEERING');
  //TODO: handle as value can stick in "straight: 0" instead of "0" when adding and removing variable
  // const steer_adjusted = steer; // TODO

  //TODO: write a Helper for steer adjust, how to branch?
  const steer_value = parseInt(steer.value.toString());
  if (steer_value !== 0)
    throw new Error(
      `Steering direction ${steer.raw} for ${block.opcode} is not yet implemented here`
    );

  const device = DeviceDriveBase.instance() as DeviceDriveBase;
  const d = device.devicename;
  return [
    `${AWAIT_PLACEHOLDER}${d}.run(${device.default_speed_variable}, ${steer_value})`,
  ];
}

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

  const value = Helpers.get('convert_speed', speed);
  device.default_speed = value;
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function flippermove_stopMove(block: Block) {
  const device = DeviceDriveBase.instance();
  const d = device.devicename;
  return [`${AWAIT_PLACEHOLDER}${d}.stop()`];
}

function flippermove_startMove(block: Block) {
  const direction = block.get_input('DIRECTION');
  const direction_forward = direction.value === 'forward';

  const device = DeviceDriveBase.instance() as DeviceDriveBase;
  const d = device.devicename;

  const result = direction_forward
    ? device.default_speed
    : num_eval('-', device.default_speed);
  return [`${AWAIT_PLACEHOLDER}${d}.run(${BlockValue.raw(result)})`];
}

function flippermove_setDistance(block: Block) {
  const unit = block.get_field('UNIT');
  const distance = Helpers.get(
    'convert_distance',
    block.get_input('DISTANCE'),
    unit
  ).raw;

  const wheel_diameter = Helpers.get('round', distance / Math.PI, 2).raw;
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

function flippermove_setMovementPair(block: Block) {
  const ports = block.get_input('PAIR')?.value?.toString().split('');
  const device = DeviceDriveBase.instance(ports) as DeviceDriveBase;
  return [
    `# setting drivebase motor pair to ${device.ports} - this will apply for the complete code`,
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
    ['flippermove_steer', flippermove_steer],
  ]);
  const operatorHandlers: any = null;

  return { blockHandlers, operatorHandlers };
}

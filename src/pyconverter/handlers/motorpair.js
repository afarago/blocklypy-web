import {
  debug,
  CONST_CM,
  CONST_INCHES,
  CONST_ROTATIONS,
  CONST_DEGREES,
  CONST_SECONDS,
  AWAIT_PLACEHOLDER,
} from '../utils.js';
import { Variables } from '../variables.js';
import { Helpers } from '../helpers.js';
import { Block, BlockValue } from '../block.js';
import { DeviceMotor, DeviceDriveBase } from '../devices.js';
import { calc_stop, round2 } from '../converters.js';

function _process_flippermove(unit, value, device, direction, steer = 0) {
  const d = device.devicename;
  const postfix_then = device.get_then() ? `, ${device.get_then()}` : '';
  const direction_sign = direction === 'forward' || direction === 'clockwise' ? '' : '-';

  //TODO: handle direction=null, steer=0... scenarios

  //=== SECONDS
  if (unit.value === CONST_SECONDS) {
    const time = Helpers.get('convert_time', value);
    const stop_fn =
      device.get_then() === 'Stop.COAST' ? `${AWAIT_PLACEHOLDER}${d}.stop()` : `${AWAIT_PLACEHOLDER}${d}.brake()`;
    //TODO: handle pivot turn (cw/ccw) for time
    return [
      `${AWAIT_PLACEHOLDER}${d}.drive(${direction_sign}${device.default_speed_variable}, ${steer})`,
      `${AWAIT_PLACEHOLDER}wait(${time.raw})`,
      `${stop_fn}`,
    ];
  }

  //=== CM and INCHES
  let distance = null;
  if (unit.value === CONST_CM || unit.value === CONST_INCHES) {
    distance = Helpers.get('convert_distance', value, unit);
  } else if (unit.value === CONST_ROTATIONS || unit.value === CONST_DEGREES) {
    const factor = device.rotation_distance * (unit.value === CONST_ROTATIONS ? 1 : 1 / 360);
    distance = Helpers.get('num_eval', value, '*', factor);
  }

  //--- STRAIGHT
  if (direction === 'forward' || direction === 'back') {
    return [`${AWAIT_PLACEHOLDER}${d}.straight(${direction_sign}${distance.raw}${postfix_then})`];
  }

  //--- PIVOT TURN
  else if (direction === 'clockwise' || direction === 'counterclockwise') {
    // rot_deg = distance / (axle_track * PI)
    const direction_sign = direction === 'clockwise' ? '' : '-';
    //TODO: use axle_track_variable
    const rot_deg = Helpers.get(
      'round',
      Helpers.get('num_eval', [distance, '*', 360], '/', device.axle_track * Math.PI),
      2
    );
    return [`${AWAIT_PLACEHOLDER}${d}.turn(${direction_sign}${rot_deg.raw}${postfix_then})`];
  }
}

function flippermove_steer(block) {
  const steer = block.get_input('STEERING');
  const steer_adjusted = steer; // TODO
  const value = block.get_input('VALUE');
  const unit = block.get_field('UNIT');

  const device = DeviceDriveBase.instance();
  return _process_flippermove.call(this, unit, value, device, null, steer_adjusted);
}

function flippermove_startSteer(block) {
  const steer = block.get_input('STEERING');
  //TODO: handle as value can stick in "straight: 0" instead of "0" when adding and removing variable
  const steer_adjusted = steer; // TODO

  const device = DeviceDriveBase.instance();
  const d = device.devicename;
  return [`${AWAIT_PLACEHOLDER}${d}.run(${device.default_speed_variable}, ${steer_adjusted.raw})`];
}

function flippermoremove_movementSetStopMethod(block) {
  const stop = parseInt(block.get_field('STOP').value);
  const stop_then = calc_stop(stop);

  const device = DeviceDriveBase.instance();
  const d = device.devicename;
  device.default_then = stop_then;
  return [`# setting ${d} stop at end to ${stop_then}`];
}

function flippermove_movementSpeed(block) {
  const speed = block.get_input('SPEED');

  const device = DeviceDriveBase.instance();
  const d = device.devicename;

  const value = Helpers.get('convert_speed', speed);
  device.default_speed = value;
  return [`${device.default_speed_variable} = ${value.raw}`];
}

function flippermove_move(block) {
  const direction = block.get_input('DIRECTION');
  const value = block.get_input('VALUE');
  const unit = block.get_field('UNIT');

  const device = DeviceDriveBase.instance();

  return _process_flippermove.call(this, unit, value, device, direction.value, 0);
}

function flippermove_stopMove(block) {
  const device = DeviceDriveBase.instance();
  const d = device.devicename;
  return [`${AWAIT_PLACEHOLDER}${d}.stop()`];
}

function flippermove_startMove(block) {
  const direction = block.get_input('DIRECTION');
  const direction_forward = direction.value === 'forward';

  const device = DeviceDriveBase.instance();
  const d = device.devicename;

  //!! Helpers.get('num_eval', '-', device.default_speed)
  const result = direction_forward ? device.default_speed : Helpers.get('num_eval', '-', device.default_speed);
  return [`${AWAIT_PLACEHOLDER}${d}.run(${BlockValue.raw(result)})`];
}

function flippermove_setDistance(block) {
  const unit = block.get_field('UNIT');
  const distance = Helpers.get('convert_distance', block.get_input('DISTANCE'), unit).raw * 10;

  const wheel_diameter = Helpers.get('round', distance / Math.PI, 2).raw;
  const device = DeviceDriveBase.instance(null, wheel_diameter);
  const d = device.devicename;

  device.rotation_distance = distance;
  device.wheel_diameter = wheel_diameter;
  return [
    `# setting drivebase wheel distance to ${distance}, that is wheel diameter ${wheel_diameter} mm - this will apply for the complete code`,
  ];
}

function flippermove_setMovementPair(block) {
  const ports = block.get_input('PAIR').split('');
  const device = DeviceDriveBase.instance(ports);
  return [`# setting drivebase motor pair to ${device.ports} - this will apply for the complete code`];
}

export const Handlers = {
  flippermove_setMovementPair: flippermove_setMovementPair,
  flippermove_setDistance: flippermove_setDistance,
  flippermove_startMove: flippermove_startMove,
  flippermove_stopMove: flippermove_stopMove,
  flippermove_move: flippermove_move,
  flippermove_movementSpeed: flippermove_movementSpeed,
  flippermoremove_movementSetStopMethod: flippermoremove_movementSetStopMethod,
  flippermove_startSteer: flippermove_startSteer,
  flippermove_steer: flippermove_steer,
};

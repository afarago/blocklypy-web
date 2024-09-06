import { Block } from '../block';
import * as Broadcasts from '../broadcasts';
import * as Imports from '../imports';
import { process_stack, setAsyncFlag } from '../pyconverter';
import { AWAIT_PLACEHOLDER } from '../utils';
import * as Variables from '../variables';
import { BlockHandlersType, OperatorHandlersType } from './handlers';

function flippersensors_resetTimer(block: Block) {
  Imports.use('pybricks.tools', 'StopWatch');
  Variables.use('sw_main', 'StopWatch()');

  return ['sw_main.reset()'];
}

function flippercontrol_fork(block: Block) {
  function create_substack_fn(count: number, stack: Block[]) {
    const sub_code = process_stack(stack);
    const substack_fn = `substack${count}_fn`;
    return [substack_fn, [`def ${substack_fn}():`, ...sub_code]];
  }

  const [sub_elem_fn1, sub_elem_code1] = create_substack_fn(
    1,
    block.substacks[0]
  );
  const [sub_elem_fn2, sub_elem_code2] = create_substack_fn(
    2,
    block.substacks[1]
  );

  setAsyncFlag(true);

  return [
    ...sub_elem_code1,
    ...sub_elem_code2,
    `multitask(${sub_elem_fn1}, ${sub_elem_fn2})`,
  ];
}

function flipperdisplay_ultrasonicLightUp(block: Block) {
  const port = block.get_input('PORT').value;
  const value = block.get_input('VALUE');

  // const device = DeviceSensor.instance(port, 'UltrasonicSensor');
  // const d = device.devicename;
  const d = 'testdev'; //!!
  return [`${d}.lights.on([${value.raw?.toString().split(' ').join(', ')}])`];
}

function flippersensors_resetYaw(block: Block) {
  return ['hub.imu.reset_heading()'];
}

function event_broadcast(block: Block) {
  const message_name = Broadcasts.get_pyname(
    block.get_input('BROADCAST_INPUT')?.value?.toString()
  );
  const do_wait = block.opcode === 'event_broadcastandwait';
  return [
    `${AWAIT_PLACEHOLDER}${message_name}.broadcast_exec(${do_wait ? 'True' : 'False'})`,
  ];
}

// function handleBlock(block: Block, op: string) {
//   switch (op) {
//     case 'flippersensors_resetTimer':
//       return flippersensors_resetTimer(block);
//     case 'flippercontrol_fork':
//       return flippercontrol_fork.call(this, block);
//     case 'flipperdisplay_ultrasonicLightUp':
//     case 'flipperlight_ultrasonicLightUp':
//       return flipperdisplay_ultrasonicLightUp(block);
//     case 'flippersensors_resetYaw':
//       return flippersensors_resetYaw(block);
//     case 'event_broadcast':
//       return event_broadcast(block, op);
//     case 'event_broadcastandwait':
//       return event_broadcastandwait(block);
//   }
// }

export default function misc() {
  const blockHandlers: BlockHandlersType = {
    flippersensors_resetTimer,
    flippercontrol_fork,
    flipperdisplay_ultrasonicLightUp,
    flipperlight_ultrasonicLightUp: flipperdisplay_ultrasonicLightUp,
    flippersensors_resetYaw,
    event_broadcast,
    event_broadcastandwait: event_broadcast,
  };
  const operationHandlers: OperatorHandlersType = null;

  return { blockHandlers, operationHandlers };
}

import { Block, BlockMatchError } from '../block';
import { BlockValue } from '../blockvalue';
import { broadcasts } from '../broadcasts';
import { DeviceSensor } from '../devicesensor';
import * as Imports from '../imports';
import * as Procedures from '../procedures';
import { process_stack, setAsyncFlag } from '../pyconverter';
import { AWAIT_PLACEHOLDER } from '../utils';
import * as Variables from '../variables';
import { BlockHandler, HandlersType } from './handlers';
import { processOperation } from './operator';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const port = block.get_input('PORT')?.value?.toString();
  const value = block.get_input('VALUE');

  const device = DeviceSensor.instance(port, 'UltrasonicSensor');
  const d = device.devicename;
  return [`${d}.lights.on([${value.raw?.toString().split(' ').join(', ')}])`];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function flippersensors_resetYaw(block: Block) {
  return ['hub.imu.reset_heading()'];
}

function event_broadcast(block: Block) {
  const message_id = block.get_inputAsShadowId('BROADCAST_INPUT');
  const do_wait = block.opcode === 'event_broadcastandwait';
  const message_pyname = broadcasts.get(message_id).get_pyname();

  return [
    `${AWAIT_PLACEHOLDER}${message_pyname}.broadcast_exec(${do_wait ? 'True' : 'False'})`,
  ];
}

function procedures_call(block: Block) {
  const proccode = block._block?.mutation?.proccode;
  const procdef = Procedures.get(proccode);

  function defaultValueForType(type: string) {
    if (type === 'string') return new BlockValue('', false, false, true);
    else if (type === 'boolean') return new BlockValue('False', true);
    throw new Error(`Unknown type ${type}`);
  }

  const args = [...procdef.args.values()].map(aarg => {
    try {
      const item = block.get_input(aarg.id);
      return item ?? defaultValueForType(aarg.type);
    } catch (e) {
      if (e instanceof BlockMatchError) {
        const block2 = block.get_inputAsBlock(aarg.id);
        return processOperation(block2);
      } else {
        throw e;
      }
    }
  });

  return [
    `${AWAIT_PLACEHOLDER}${procdef.name}(${args.map(BlockValue.raw).join(', ')})`,
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

export default function misc(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['flippersensors_resetTimer', flippersensors_resetTimer],
    ['flippercontrol_fork', flippercontrol_fork],
    ['flipperdisplay_ultrasonicLightUp', flipperdisplay_ultrasonicLightUp],
    ['flipperlight_ultrasonicLightUp', flipperdisplay_ultrasonicLightUp],
    ['flippersensors_resetYaw', flippersensors_resetYaw],
    ['event_broadcast', event_broadcast],
    ['event_broadcastandwait', event_broadcast],
    ['procedures_call', procedures_call],
  ]);
  const operatorHandlers: any = null;

  return { blockHandlers, operatorHandlers };
}

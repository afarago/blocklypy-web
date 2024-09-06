import { Block } from '../block';
import * as Helpers from '../helpers';
import * as Imports from '../imports';
import * as pyconverter from '../pyconverter';
import { AWAIT_PLACEHOLDER, indent_code } from '../utils';
import { BlockHandlersType, OperatorHandlersType } from './handlers';
import { processOperation } from './operator';

function control_forever(block: Block) {
  const sub_code = pyconverter.process_stack(block.substacks[0]);

  return ['while True:', ...sub_code];
}

function control_repeat(block: Block) {
  const times = block.get_input('TIMES');
  const sub_code = pyconverter.process_stack(block.substacks[0]);

  return [
    `for _ in range(${Helpers.get('int_safe', times).raw}):`,
    ...sub_code,
  ];
}

function control_repeat_until(block: Block) {
  const condition_block = block.get_inputAsBlock('CONDITION');
  const condition_value = processOperation(condition_block);

  const sub_code = pyconverter.process_stack(block.substacks[0]);

  return [`while ${condition_value.raw}:`, ...sub_code];
}

function control_wait(block: Block) {
  const duration = Helpers.get('convert_time', block.get_input('DURATION'));

  Imports.use('pybricks.tools', 'wait');
  return [`${AWAIT_PLACEHOLDER}wait(${duration.raw})`];
}

function control_if_and_if_else(block: Block) {
  const retval = [];
  const condition_block = block.get_inputAsBlock('CONDITION');
  const condition_value = processOperation(condition_block);

  retval.push(`if ${condition_value.raw}:`);
  if (block.substacks[0]) {
    const sub_code = pyconverter.process_stack(block.substacks[0]);
    retval.push(...sub_code);
  } else {
    retval.push(...indent_code('pass'));
  }

  if (block.opcode === 'control_if_else') {
    retval.push('else:');
    const sub_code = pyconverter.process_stack(block.substacks[1]);
    retval.push(...sub_code);
  }
  return retval;
}

function control_wait_until(block: Block) {
  const condition_block = block.get_inputAsBlock('CONDITION');
  const condition_value = processOperation(condition_block);

  const sub_code = pyconverter.process_stack(null); // empty substack -> results in pass

  return [`while ${condition_value.raw}:`, ...sub_code];
}

export default function control() {
  const blockHandlers: BlockHandlersType = {
    control_forever,
    control_repeat,
    control_repeat_until,
    control_wait,
    control_if: control_if_and_if_else,
    control_if_else: control_if_and_if_else,
    control_wait_until,
  };
  const operationHandlers: OperatorHandlersType = null;

  return { blockHandlers, operationHandlers };
}

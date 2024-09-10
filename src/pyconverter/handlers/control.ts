import { Block } from '../block';
import helpers from '../helpers';
import imports from '../imports';
import * as pyconverter from '../pyconverter';
import { AWAIT_PLACEHOLDER, indent_code } from '../utils';
import { BlockHandler, HandlersType } from './handlers';
import { processOperation } from './operator';

function control_forever(block: Block) {
  const sub_code = pyconverter.process_stack(block.substacks[0]);

  return ['while True:', ...sub_code];
}

function control_repeat(block: Block) {
  const times = block.get_input('TIMES');
  const sub_code = pyconverter.process_stack(block.substacks[0]);

  return [
    `for _ in range(${helpers.use('int_safe')?.call(times).raw}):`,
    ...sub_code,
  ];
}

function control_repeat_until(block: Block) {
  const condition_block = block.get_inputAsBlock('CONDITION');
  // wait until block has a flaw, needs to have the return value from falsy to truthy
  const condition_value = processOperation(condition_block, 'True');

  const sub_code = pyconverter.process_stack(block.substacks[0]);

  return [`while not (${condition_value.raw}):`, ...sub_code];
}

function control_wait(block: Block) {
  const duration = helpers
    .use('convert_time')
    .call(block.get_input('DURATION'));

  imports.use('pybricks.tools', 'wait');
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
  // wait until block has a flaw, needs to have the return value from falsy to truthy
  const condition_value = processOperation(condition_block, 'True');

  const sub_code = pyconverter.process_stack(null); // empty substack -> results in pass

  return [`while not (${condition_value.raw}):`, ...sub_code];
}

export default function control(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['control_forever', control_forever],
    ['control_repeat', control_repeat],
    ['control_repeat_until', control_repeat_until],
    ['control_wait', control_wait],
    ['control_if', control_if_and_if_else],
    ['control_if_else', control_if_and_if_else],
    ['control_wait_until', control_wait_until],
  ]);
  const operatorHandlers: any = null;

  return { blockHandlers, operatorHandlers };
}

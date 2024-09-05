import { Helpers } from '../helpers';
import { AWAIT_PLACEHOLDER, debug, indent_code } from '../utils';
import { Block } from '../block';
import { PyConverter } from '../pyconverter';
import { BlockValue } from 'src/blockvalue';
import { Imports } from 'src/imports';

function control_forever(block: Block, parent: PyConverter) {
  const sub_code = parent.process_stack(block.substacks[0]);

  return [`while True:`, ...sub_code];
}

function control_repeat(block: Block, parent: PyConverter) {
  const times = block.get_input('TIMES');
  const sub_code = parent.process_stack(block.substacks[0]);

  return [
    `for _ in range(${Helpers.get('int_safe', times).raw}):`,
    ...sub_code,
  ];
}

function control_repeat_until(block: Block, parent: PyConverter) {
  const condition_block = block.get_input('CONDITION');
  const condition_value = new BlockValue('False', true); //!! Block.ProcessOperation(condition_block);
  const code_condition = condition_block
    ? `not (${condition_value.raw})`
    : `False`;

  const sub_code = parent.process_stack(block.substacks[0]);

  return [`while ${code_condition}:`, ...sub_code];
}

function control_wait(block: Block, parent: PyConverter) {
  const duration = Helpers.get('convert_time', block.get_input('DURATION'));

  Imports.use('pybricks.tools', 'wait');
  return [`${AWAIT_PLACEHOLDER}wait(${duration.raw})`];
}

function control_if_and_if_else(block: Block, parent: PyConverter) {
  const retval = [];
  const condition_block = block.get_input('CONDITION');
  const condition_value = new BlockValue('False', true); //!! Block.ProcessOperation(condition_block);

  retval.push(`if ${condition_value.raw}:`);
  if (block.substacks[0]) {
    const sub_code = parent.process_stack(block.substacks[0]);
    retval.push(...sub_code);
  } else {
    retval.push(indent_code('pass'));
  }

  if (block.opcode === 'control_if_else') {
    retval.push('else:');
    const sub_code = parent.process_stack(block.substacks[1]);
    retval.push(...sub_code);
  }
  return retval;
}

function control_wait_until(block: Block, parent: PyConverter) {
  const condition_block = block.get_input('CONDITION');
  const condition_value = new BlockValue('False', true); //!! Block.ProcessOperation(condition_block);
  const code_condition = condition_block
    ? `not (${condition_value.raw})`
    : 'False';
  const sub_code = parent.process_stack(null); // empty substack -> results in pass

  return [`while ${code_condition}:`, ...sub_code];
}

export const Handlers = {
  control_forever,
  control_repeat,
  control_repeat_until,
  control_wait,
  control_if: control_if_and_if_else,
  control_if_else: control_if_and_if_else,
  control_wait_until,
};

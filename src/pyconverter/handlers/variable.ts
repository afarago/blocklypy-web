import { Block } from '../block';
import { BlockValue } from '../blockvalue';
import { Helpers } from '../helpers';
import { Variables } from '../variables';
import { BlockHandlersType, OperatorHandlersType } from './handlers';

function data_setvariableto(block: Block) {
  const value = block.get_input('VALUE');
  const variable = Variables.convert(block.get_field('VARIABLE').value);

  // here variable value can be strong or number, keep it as is
  return [`${variable} = ${BlockValue.raw(value)}`];
}

function data_changevariableby(block: Block) {
  let value = block.get_input('VALUE'); // is restricted by UI to float
  const variable = Variables.convert(block.get_field('VARIABLE').value);
  if (value.is_variable) value = Helpers.get('float_safe', value);

  // here variable value must be number, convert it
  return [`${variable} = float(${variable}) + ${BlockValue.raw(value)}`];
}

function data_addtolist(block: Block) {
  //TODO: set variable type globally / initially from Variables array
  const item = block.get_input('ITEM');
  const variable = Variables.convert(block.get_field('LIST').value);

  // here variable value must be number, convert it
  return [`${variable}.append(${item})`];
}

export default function variables() {
  const blockHandlers: BlockHandlersType = {
    data_setvariableto,
    data_changevariableby,
    data_addtolist,
  };
  const operationHandlers: OperatorHandlersType = null;

  return { blockHandlers, operationHandlers };
}

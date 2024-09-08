import { Block } from '../block';
import { BlockValue, num_eval } from '../blockvalue';
import * as Variables from '../variables';
import { BlockHandler, HandlersType, OperatorHandler } from './handlers';

function _readParameters(
  block: Block,
  options: {
    variable?: boolean;
    list?: boolean;
    item?: boolean;
    index?: boolean;
    value?: boolean;
  } = {}
) {
  const item = options.item ? block.get_input('ITEM') : undefined;
  const variable = options.variable
    ? Variables.convert(block.get_field('VARIABLE').value?.toString(), false)
    : undefined;
  const list = options.list
    ? Variables.convert(block.get_field('LIST').value?.toString(), true)
    : undefined;
  const index = options.index
    ? num_eval(block.get_input('INDEX'), '-', 1, true)
    : undefined;
  const value = options.value ? block.get_input('VALUE') : undefined;

  return { variable, list, index, item, value };
}

function data_setvariableto(block: Block) {
  const { variable, value } = _readParameters(block, {
    variable: true,
    value: true,
  });

  // here variable value can be strong or number, keep it as is
  return [`${variable} = ${BlockValue.raw(value)}`];
}

function data_changevariableby(block: Block) {
  const { variable, value } = _readParameters(block, {
    variable: true,
    value: true,
  });

  const value2 = value.is_variable ? num_eval(value) : value;
  return [`${variable} = ${value2.raw} + ${value.raw}`];
}

function data_addtolist(block: Block) {
  const { list, item } = _readParameters(block, {
    list: true,
    item: true,
  });

  return [`${list}.append(${item.raw})`];
}

function data_deleteoflist(block: Block) {
  const { list, index } = _readParameters(block, {
    list: true,
    index: true,
  });

  return [`del ${list}[${index.raw}]`];
}

function data_deletealloflist(block: Block) {
  const { list } = _readParameters(block, {
    list: true,
  });

  return [`${list}.clear()`];
}

function data_insertatlist(block: Block) {
  const { list, index, item } = _readParameters(block, {
    list: true,
    index: true,
    item: true,
  });

  return [`${list}.insert(${index.raw}, ${item.raw})`];
}

function data_replaceitemoflist(block: Block) {
  const { list, index, item } = _readParameters(block, {
    list: true,
    index: true,
    item: true,
  });

  return [`${list}[${index.raw}] = ${item.raw}`];
}

function data_itemoflist(block: Block) {
  const { list, index } = _readParameters(block, {
    list: true,
    index: true,
  });

  return new BlockValue(`${list}[${index.raw}]`, true);
}

function data_itemnumoflist(block: Block) {
  const { list, item } = _readParameters(block, {
    list: true,
    item: true,
  });

  // TODO: add safe error handling
  return new BlockValue(`${list}.index(${item.raw}) + 1`, true);
}

function data_lengthoflist(block: Block) {
  const { list } = _readParameters(block, {
    list: true,
  });

  return new BlockValue(`len(${list})`, true);
}

function data_listcontainsitem(block: Block) {
  const { list, item } = _readParameters(block, {
    list: true,
    item: true,
  });

  // TODO: add safe error handling
  return new BlockValue(`(${list}.index(${item.raw}) != None)`, true);
}

export default function variables(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['data_setvariableto', data_setvariableto],
    ['data_changevariableby', data_changevariableby],
    ['data_addtolist', data_addtolist],
    ['data_deleteoflist', data_deleteoflist],
    ['data_deletealloflist', data_deletealloflist],
    ['data_insertatlist', data_insertatlist],
    ['data_replaceitemoflist', data_replaceitemoflist],
  ]);

  const operatorHandlers = new Map<string, OperatorHandler>([
    ['data_itemoflist', data_itemoflist],
    ['data_itemnumoflist', data_itemnumoflist],
    ['data_lengthoflist', data_lengthoflist],
    ['data_listcontainsitem', data_listcontainsitem],
  ]);

  return { blockHandlers, operatorHandlers };
}

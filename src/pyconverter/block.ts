import { BlockValue } from './blockvalue';
import { processOperation } from './handlers/operator';
import * as Scratch from './scratch';
import * as Variables from './variables';

// more information on scratch file format is ref:https://en.scratch-wiki.info/wiki/Scratch_File_Format
export class Block {
  _root: Scratch.ScratchTarget;
  _block: Scratch.ScratchBlock;
  _id: string;
  comment: string;
  substacks: Block[][] = [];

  constructor(
    rawblock: Scratch.ScratchBlock,
    id: string,
    root: Scratch.ScratchTarget
  ) {
    this._block = rawblock;
    this._root = root;
    this._id = id;
  }

  getById(blockId: string) {
    const rawblock = this._root.blocks[blockId];
    return rawblock ? new Block(rawblock, blockId, this._root) : null;
  }

  get root() {
    return this._root;
  }

  get opcode() {
    return this._block.opcode;
  }

  // // Custom inspect method for util.inspect and console.log
  // [util.inspect.custom](depth: number, options: util.InspectOptionsStylized) {
  //   // return {
  //   //   opcode: this._block.opcode,
  //   //   inputs: this._block.inputs,
  //   //   fields: this._block.fields,
  //   //   substacks: this.substacks,
  //   // };
  //   //return `'${this._block.opcode}', inputs: ${this._block.inputs?.toString()}, fields: ${this._block.fields?.toString()}`;
  //   return { opcode: this._block.opcode, substacks: this.substacks };
  // }

  // public toString = (): string => {
  //   return `${this._block.opcode} inputs: ${this._block.inputs?.toString()} fields: ${this._block.fields?.toString()}`;
  //   //return this._block.toString(); // substacks
  // };
  // // Add a custom toJSON method
  // toJSON() {
  //   return {
  //     opcode: this._block.opcode,
  //     inputs: this._block.inputs,
  //     fields: this._block.fields,
  //     substacks: this.substacks,
  //   };
  // }

  get_inputAsBlock(name: string): Block {
    const input = this._block.inputs[name];

    if (!input) return null;

    if (input[0] !== Scratch.ShadowState.NOSHADOW) return;
    // if (typeof input.value !== 'string') return;
    //throw new Error('Input is not a stack or blocks');

    return this.getById(input[1] as string);
  }

  get_input(name: string): BlockValue {
    try {
      const input = this._block.inputs[name];
      if (!input) return null;

      switch (input[0]) {
        case Scratch.ShadowState.SHADOW:
          {
            const is_reference = typeof input[1] === 'string';
            const is_direct_value = Array.isArray(input[1]);
            if (is_reference) {
              const block2 = this.getById(input[1] as string);
              if (!block2 || typeof block2 !== 'object') return null;

              const first_field = Object.values(block2?._block.fields)[0];
              const first_field_value = first_field[0];
              return first_field_value !== null
                ? new BlockValue(first_field_value)
                : null;
            } else if (is_direct_value) {
              const value_array = input[1] as Scratch.BlockValueArray;
              if (value_array === null) return null;

              const value_type = value_array[0]; // 4 = value, 5 = wait-duration-sec, 6 = times, 10 = string, 11 = message (name, ref) //!!
              const is_string =
                value_type === Scratch.BlockValueType.STRING ||
                value_type === Scratch.BlockValueType.BROADCAST;
              const value_value =
                value_type === Scratch.BlockValueType.STRING ||
                value_type === Scratch.BlockValueType.BROADCAST
                  ? value_array[1].toString()
                  : parseFloat(value_array[1].toString());
              return new BlockValue(value_value, false, false, is_string);
            }
          }
          break;
        case Scratch.ShadowState.NOSHADOW:
          throw new Error('Input is a blocks, use get_inputAsBlock');
        case Scratch.ShadowState.OBSCURED:
          {
            const ref = input[1];
            if (typeof ref === 'string') {
              const block2 = this.getById(ref.toString());
              const op = processOperation(block2);
              return op;
            } else if (typeof ref === 'object' && Array.isArray(ref)) {
              //!! assert(ref[0] === 12 || ref[0] === 13);
              const var_name = Variables.convert(
                ref[1].toString(),
                ref[0] === Scratch.BlockValueType.LIST
              );
              // const var_ref = ref[2]
              return new BlockValue(var_name, true, true);
            }
          }
          break;
      }
    } catch (e) {
      //!!//!!debug(e);
      return null;
    }
  }

  get_field(name: string) {
    const field = this._block.fields[name]; // "DIRECTION": [ "clockwise", null ]
    return new BlockValue(field[0], false, false, typeof field[0] !== 'number');
  }

  get_block_description() {
    const inputs_all = Object.entries(this._block.inputs).map(
      ([k, _]) => `${k.toLowerCase()}: ${this.get_input(k)?.raw}`
    );
    const fields_all = Object.entries(this._block.fields).map(
      ([k, _]) => `${k.toLowerCase()}: ${this.get_field(k)?.raw}`
    );
    return `${this.opcode}(${inputs_all.concat(fields_all).join(', ')})`;
  }

  static buildStack(block: Block): Block[] {
    const retval = [];

    while (block) {
      retval.push(block);

      const processSubstackByInput = (block: Block, name: string) => {
        if (
          !block._block.inputs ||
          !Object.prototype.hasOwnProperty.call(block._block.inputs, name)
        ) {
          return;
        }

        const substack_id = block._block.inputs[name]?.[1];
        if (!substack_id || typeof substack_id !== 'string') return;
        const substackBlock = block.getById(substack_id);
        if (substackBlock) block.substacks.push(this.buildStack(substackBlock));
      };
      processSubstackByInput(block, 'SUBSTACK');
      processSubstackByInput(block, 'SUBSTACK2');

      const nextBlock = block.getById(block._block.next);
      if (!nextBlock) break;
      block = nextBlock;
    }

    return retval;
  }
}

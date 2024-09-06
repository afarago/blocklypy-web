import { BlockValue } from './blockvalue';
import { processOperation } from './pyconverter';
import { JsonBlock } from './utils';
import { Variables } from './variables';

export class Block {
  private _root: JsonBlock;
  _block: JsonBlock;
  //_id: string;
  substacks: Block[][] = [];

  constructor(rawblock: JsonBlock, root: JsonBlock) {
    this._block = rawblock;
    this._root = root;
  }

  getById(blockId: string) {
    const rawblock = this._root.blocks[blockId];
    return rawblock ? new Block(rawblock, this._root) : null;
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

    const input_type = input[0];
    if (input_type !== 2) return undefined;
    //throw new Error('Input is not a stack or blocks');
    return this.getById(input[1]);
  }

  get_input(name: string): BlockValue {
    try {
      const input = this._block.inputs[name];

      if (!input) return null;

      const input_type = input[0];
      switch (input_type) {
        case 1:
          {
            const is_reference = typeof input[1] === 'string';
            const is_direct_value = typeof input[1] === 'object';
            if (is_reference) {
              const block2 = this.getById(input[1]);
              //!!assert(block2);
              //!!assert(typeof block2 === 'object');

              const first_field = Object.values(
                block2?._block.fields
              )[0] as any[];
              const first_field_value = first_field[0];
              return first_field_value !== null
                ? new BlockValue(first_field_value)
                : null;
            } else if (is_direct_value) {
              const value_array = input[1];
              if (value_array === null) return null;

              const value_type = value_array[0]; // 4 = value, 5 = wait-duration-sec, 6 = times, 10 = string, 11 = message (name, ref) //!!
              const is_string = value_type === 10 || value_type === 11;
              const value_value =
                value_type === 10 || value_type === 11
                  ? value_array[1]
                  : parseFloat(value_array[1]);
              return new BlockValue(value_value, false, false, is_string);
            }
          }
          break;
        case 2:
          throw new Error('Input is a stack or blocks, use get_inputAsBlock');
        case 3:
          {
            const ref = input[1];
            const ref_type = typeof ref;
            if (ref_type === 'string') {
              const block2 = this.getById(ref);
              const op = processOperation(block2);
              return op;
            } else if (ref_type === 'object') {
              //!! assert(ref[0] === 12 || ref[0] === 13);
              const var_name = Variables.convert(ref[1], ref[0] === 13);
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
        )
          return;

        const substack = block._block.inputs[name];
        if (!substack) return;
        // input {type = 2}
        const substack_id = substack[1];
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

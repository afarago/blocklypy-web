import { BlockValue } from './blockvalue';
import { processOperation } from './handlers/operator';
import { ProcedureArg, ProcedureDefinition } from './procedures';
import * as Scratch from './scratch';
import * as Variables from './variables';

export class BlockMatchError extends Error {}

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

  get_inputAsBlock(name: string, forceNoShadow = true): Block {
    const input = this._block.inputs[name];

    if (!input) return null;

    if (input[0] !== Scratch.ShadowState.NOSHADOW && forceNoShadow)
      throw new BlockMatchError('Input is not a block, use get_input');
    // if (typeof input.value !== 'string') return;
    //throw new Error('Input is not a stack or blocks');

    return this.getById(input[1] as string);
  }

  get_inputAsShadowId(name: string): string {
    const input = this._block.inputs[name];
    if (!input) return null;
    if (input[0] !== Scratch.ShadowState.SHADOW) return null;
    if (!Array.isArray(input[1])) return null;

    // "inputs": {
    //   "BROADCAST_INPUT": [
    //     1,
    //     [
    //       11,
    //       "message1",
    //       "~#$`BYkw-{5H#=8LutyJ"   // <== returns this
    //     ]
    //   ]
    // },

    return input[1][2].toString();
  }

  get_input(name: string, isPythonMode = true): BlockValue {
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

            if (block2.opcode === 'procedures_prototype') {
              return new BlockValue(block2._block.mutation.proccode);
            }

            const first_field = Object.values(block2?._block.fields)[0];
            const first_field_value = first_field[0];
            return first_field_value !== null
              ? new BlockValue(
                  first_field_value,
                  false,
                  false,
                  typeof first_field_value !== 'number'
                )
              : null;
          } else if (is_direct_value) {
            const value_array = input[1] as Scratch.BlockValueArray;
            if (value_array === null) return null;

            const value_type = value_array[0]; // 4 = value, 5 = wait-duration-sec, 6 = times, 10 = string, 11 = message (name, ref)
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
        {
          throw new BlockMatchError('Input is a blocks, use get_inputAsBlock');
          // const block2 = this.getById(input[1] as string);
          // return new BlockValue(block2?.opcode);
        }
        break;
      case Scratch.ShadowState.OBSCURED:
        {
          const ref = input[1];
          if (typeof ref === 'string') {
            const block2 = this.getById(ref.toString());

            const op = isPythonMode
              ? processOperation(block2)
              : new BlockValue(block2.get_block_description(isPythonMode));
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
  }

  has_field(name: string) {
    const field = this._block.fields[name];
    return field !== null && Array.isArray(field);
  }

  get_field(name: string) {
    const field = this.get_fieldObject(name);
    return new BlockValue(field[0], false, false, typeof field[0] !== 'number');
  }

  get_fieldObject(name: string) {
    return this._block.fields[name]; // "DIRECTION": [ "clockwise", null ]
  }

  get_block_description(isPythonMode = true): string {
    const inputs_all = Object.entries(this._block.inputs)
      ?.filter(([k, _]) => isPythonMode || !k.startsWith('SUBSTACK'))
      ?.map(([k, _]) => {
        let value;
        try {
          value = this.get_input(k, isPythonMode)?.raw;
        } catch {
          value = this.get_inputAsBlock(k).get_block_description(isPythonMode);
        }
        return `${k.toLowerCase()}: ${value}`;
      });
    const fields_all = Object.entries(this._block.fields)?.map(
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

export function extractProcedureDefinition(block: Block): ProcedureDefinition {
  const block2 = block.get_inputAsBlock('custom_block', false);
  // this is a procedures_prototype

  const proccode = block2._block.mutation.proccode;
  const blockname = Variables.sanitize(
    proccode.match(/^(.*?)(?= %[sb])|^.*/)?.[0]
  );
  const argumentnames1 = Array.from(
    JSON.parse(block2._block.mutation.argumentnames) as string[]
  ).map(e => Variables.sanitize(e));

  const argumenttypes: string[] = [];
  const argumentids: string[] = [];
  // const argumentnames2: string[] = [];
  Object.entries(block2._block.inputs).forEach(([key, v3]) => {
    const blockId3 = v3[1];
    if (typeof blockId3 !== 'string') return null;
    const block3 = block2.getById(blockId3);
    // const argname = Variables.sanitize(
    //   block3.get_field('VALUE')?.value?.toString()
    // );
    const argtype = block3.opcode.replace('argument_reporter_', '');
    const argtype_mod = argtype === 'string_number' ? 'string' : 'boolean';

    argumentids.push(key);
    argumenttypes.push(argtype_mod);
    // argumentnames2.push(argname);
  });

  return new ProcedureDefinition(
    proccode,
    blockname,
    argumentnames1.reduce((aggr, val, idx) => {
      aggr.set(val, {
        name: val,
        id: argumentids[idx],
        type: argumenttypes[idx],
      });
      return aggr;
    }, new Map<string, ProcedureArg>())
  );
}

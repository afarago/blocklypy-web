import { start } from 'repl';
import { Block } from './block';
import {
  ASYNC_PLACEHOLDER,
  AWAIT_PLACEHOLDER,
  JsonBlock,
  get_divider,
  indent_code,
} from './utils';
import { Handlers } from './handlers';
import { Imports } from './imports';
import { Broadcasts } from './broadcasts';
import { Helpers } from './helpers';
import { BlockValue } from './blockvalue';

enum StackGroupType {
  Start = 1,
  Event = 2,
  MessageEvent = 3,
  Orphan = 9,
}

interface StackGroup {
  opcode: string;
  group: StackGroupType;
  stack: Block[];
}

const SHOW_ORPHAN_CODE = false;
const DEBUG_SKIP_HELPERS = false;

export class PyConverter {
  isAsyncNeeded = false;
  broadcasts: Broadcasts = new Broadcasts();

  convert(projectData: JsonBlock) {
    const root_target = projectData.targets[1];
    // Block.ProcessOperation = process_operation.bind(this);

    // ========================
    try {
      const topLevelStacks = this.getTopLevelStacks(root_target);
      const stackGroups = this.getStackGroups(topLevelStacks);

      // switch to async if there ar multiple start stacks or any event stack
      if (!this.isAsyncNeeded)
        this.isAsyncNeeded =
          (stackGroups.get(StackGroupType.Start)?.length ?? 0) > 1 ||
          (stackGroups.get(StackGroupType.Event)?.length ?? 0) > 0 ||
          (stackGroups.get(StackGroupType.MessageEvent)?.length ?? 0) > 0 ||
          false;

      let stackCounter = 0;
      const stackCodes: string[][] = [];
      let stacks_functions = [];

      for (const [group_name, stack_group] of stackGroups.entries()) {
        if (!SHOW_ORPHAN_CODE && group_name === StackGroupType.Orphan) continue;

        for (const stack_gitem of stack_group) {
          const code: string[] = [];
          const stack = stack_gitem.stack;
          const group = stack_gitem.group;
          const head_block = stack[0];
          const next_blocks = stack.slice(1);
          if (group === StackGroupType.MessageEvent) {
            const message_name_raw = this.get_message_name(stack);
            const message_name = Broadcasts.sanitize(message_name_raw);
            if (!this.broadcasts.has(message_name)) {
              Helpers.get('class_Message');
              code.push(
                ...[
                  '',
                  get_divider(`[MESSAGE] ${message_name_raw}`, '-'),
                  this.broadcasts.get_code(message_name),
                  '',
                ]
              );
              const stack_fn = `${message_name}.main_fn`;
              stacks_functions.push(stack_fn);
            }
          }

          stackCounter++;
          code.push(
            `### [STACK] stack${stackCounter} ${head_block.get_block_description()}`
          );

          const stack_fn = `stack${stackCounter}_fn`;
          const stack_action_fn = `stack${stackCounter}_action_fn`;
          const sub_code = this.process_stack(next_blocks);

          switch (group_name) {
            case StackGroupType.Start:
              //case 'flipperevents_whenProgramStarts':
              {
                // stack action function
                code.push(`${ASYNC_PLACEHOLDER}def ${stack_fn}():`);
                code.push(...sub_code);

                stacks_functions.push(stack_fn);
              }
              break;
            case StackGroupType.Event:
              // case 'flipperevents_whenColor':
              // case 'flipperevents_whenPressed':
              // case 'flipperevents_whenDistance':
              // case 'flipperevents_whenCondition':
              // case 'flipperevents_whenOrientation':
              // case 'flipperevents_whenButton': // TODO: later separate and optimize
              // case 'flipperevents_whenTimer': // TODO: later separate and optimize
              {
                // stack action function
                code.push(`async def ${stack_action_fn}():`);
                code.push(...sub_code);
                // condition function
                const stack_cond_fn = `stack${stackCounter}_condition_fn`;
                const condition_code = new BlockValue('False', true); //Block.ProcessOperation(head_block);
                code.push(`def ${stack_cond_fn}():`);
                code.push(...indent_code([`return ` + condition_code.raw]));
                code.push(`async def ${stack_fn}():`);
                code.push(
                  ...indent_code([
                    `await ${Helpers.get('event_task', stack_cond_fn, stack_action_fn).raw}`,
                  ])
                );
                stacks_functions.push(stack_fn);
              }
              break;

            case StackGroupType.MessageEvent:
              // case 'event_whenbroadcastreceived':
              {
                const message_name = this.get_message_name(stack);

                // stack action function
                code.push(`async def ${stack_action_fn}():`);
                code.push(...sub_code);
                code.push(
                  this.broadcasts.add_stack(
                    Broadcasts.sanitize(message_name),
                    stack_action_fn
                  )
                );
              }
              break;

            default:
              {
                code.push('### this code will not be running\r\n#');
                const sub_code = this.process_stack(stack).map(
                  line => '# ' + line
                );
                code.push(...sub_code);
              }
              break;
          }

          stackCodes.push(code);
        }
      }

      // // section: setup
      // const setup_codes = [];
      // setup_codes.push('hub = PrimeHub()');
      // Imports.use('pybricks.hubs', 'PrimeHub');

      // for (const elem of Object.values(setup_devices_registry)) {
      //   elem.ensure_dependencies();
      // }

      // let remaining_items = Object.values(setup_devices_registry);
      // while (remaining_items.length) {
      //   // TODO: safeguard against circular dependency
      //   for (const [idx, elem] of Object.entries(remaining_items)) {
      //     if (
      //       elem.dependencies?.every(elem2 => !remaining_items.includes(elem2))
      //     ) {
      //       remaining_items.splice(idx, 1);

      //       const code = elem.setup_code();
      //       if (code) setup_codes.push(...code);

      //       break;
      //     }
      //   }
      // }

      // section: main program
      const main_program = () => {
        if (this.isAsyncNeeded) {
          return [
            'async def main():',
            indent_code([`await multitask(${stacks_functions.join(', ')})`])[0],
            'run_task(main())',
          ];
        } else {
          // single start stack
          return [`${stacks_functions[0]}()`];
        }
      };

      const code_sections = [
        { name: 'imports', code: Imports.to_global_code() },
        // { name: 'setup', code: setup_codes },
        // { name: 'global variables', code: Variables.to_global_code() },
        {
          name: 'helper functions',
          code: !DEBUG_SKIP_HELPERS ? Helpers.to_global_code() : [],
        },
        { name: 'program code', code: stackCodes.map(e => [...e, '']).flat() },
        { name: 'main code', code: main_program() },
      ];
      const async_replace = (line: string) => {
        return line
          .replace(ASYNC_PLACEHOLDER, this.isAsyncNeeded ? 'async ' : '')
          .replace(AWAIT_PLACEHOLDER, this.isAsyncNeeded ? 'await ' : '');
      };

      const retval2 = code_sections.map(curr =>
        curr.code.length
          ? [
              get_divider(`SECTION: ${curr.name.toUpperCase()}`, '='),
              ...curr.code.map(line => async_replace(line)),
            ].join('\r\n')
          : null
      );

      const result = retval2.filter(e => e).join('\r\n\r\n');
      return result;
    } catch (err) {
      console.log('>>', err); //!!
    }
  }

  getTopLevelStacks(root_target: JsonBlock) {
    return Object.values(root_target.blocks)
      .filter((block: any) => block.topLevel && !block.shadow)
      .map((block: any) => Block.buildStack(new Block(block, root_target)));
  }

  getStackGroups(topLevelStacks: Block[][]) {
    const retval = topLevelStacks
      .map(stack => {
        const head_block = stack[0];
        const op = head_block.opcode;
        function get_op_group(op: string) {
          if (op === 'flipperevents_whenProgramStarts')
            return StackGroupType.Start;
          else if (op.startsWith('flipperevents_when'))
            return StackGroupType.Event;
          else if (op.startsWith('event_whenbroadcastreceived'))
            return StackGroupType.MessageEvent;
          return StackGroupType.Orphan;
        }
        return {
          opcode: op,
          group: get_op_group(op),
          stack: stack,
        } as StackGroup;
      })
      .sort((a, b) => a.group.valueOf() - b.group.valueOf())
      .reduce((output, item) => {
        const key = item['group'];
        const values = output.get(key) || [];
        //if (!output.has(key)) output.set(key, []);
        values.push(item);
        output.set(key, values);
        return output;
      }, new Map<StackGroupType, StackGroup[]>());

    if (retval.get(StackGroupType.MessageEvent))
      retval
        .get(StackGroupType.MessageEvent)
        ?.sort((a: any, b: any) =>
          this.get_message_name(a.stack).localeCompare(
            this.get_message_name(b.stack)
          )
        );

    return retval;
  }

  process_stack(blocks: Block[] | null): string[] {
    const retval: string[] = [];

    if (blocks && blocks.length > 0) {
      for (const block of blocks) {
        const sub_code = this.process_code(block);
        if (sub_code !== null) retval.push(...indent_code(sub_code));
      }
    } else {
      retval.push(...indent_code('pass'));
    }

    return retval;
  }

  // order messages by msg
  get_message_name(stack: Block[]): string {
    const head_block = stack[0];
    //!!assert(head_block?.opcode === 'event_whenbroadcastreceived');
    const message_name = String(head_block.get_field('BROADCAST_OPTION').value);
    //!!stack.message_name = message_name;
    return message_name;
  }

  process_code(block: Block): string[] | null {
    const op = block.opcode;
    if (Handlers[op]) return Handlers[op](block, this);
    else return null;
  }
}

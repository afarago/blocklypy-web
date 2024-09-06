import { Block } from './block';
import * as Broadcasts from './broadcasts';
import { handlers } from './handlers/handlers';
import { processOperation } from './handlers/operator';
import * as Helpers from './helpers';
import * as Imports from './imports';
import {
  ASYNC_PLACEHOLDER,
  AWAIT_PLACEHOLDER,
  JsonBlock,
  get_divider,
  indent_code,
} from './utils';
import * as Variables from './variables';

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

let isAsyncNeeded = false;

export function convertFlipperProgramToPython(projectData: JsonBlock) {
  const root_target = projectData.targets[1];

  // ========================
  try {
    for (const varblock of Object.values(root_target.variables)) {
      if (Array.isArray(varblock)) {
        const name = varblock[0];
        Variables.use(name, null, false);
      }
    }
    for (const varblock of Object.values(root_target.lists)) {
      if (Array.isArray(varblock)) {
        const name = varblock[0];
        Variables.use(name, null, true);
      }
    }

    // ------------------------
    const topLevelStacks = getTopLevelStacks(root_target);
    const stackGroups = getStackGroups(topLevelStacks);

    // switch to async if there ar multiple start stacks or any event stack
    if (!isAsyncNeeded)
      isAsyncNeeded =
        (stackGroups.get(StackGroupType.Start)?.length ?? 0) > 1 ||
        (stackGroups.get(StackGroupType.Event)?.length ?? 0) > 0 ||
        (stackGroups.get(StackGroupType.MessageEvent)?.length ?? 0) > 0 ||
        false;

    const programStacks = getPycodeForStackGroups(stackGroups);

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

    const code_sections = [
      { name: 'imports', code: Imports.to_global_code() },
      // { name: 'setup', code: setup_codes },
      { name: 'global variables', code: Variables.to_global_code() },
      {
        name: 'helper functions',
        code: !DEBUG_SKIP_HELPERS ? Helpers.to_global_code() : [],
      },
      {
        name: 'program code',
        code: createProgramStacksCode(programStacks),
      },
      { name: 'main code', code: createMainProgramCode(programStacks) },
    ];

    const asyncReplaceFn = (line: string) => {
      return line
        .replace(ASYNC_PLACEHOLDER, isAsyncNeeded ? 'async ' : '')
        .replace(AWAIT_PLACEHOLDER, isAsyncNeeded ? 'await ' : '');
    };

    const retval2 = code_sections.map(curr =>
      curr.code.length
        ? [
            get_divider(`SECTION: ${curr.name.toUpperCase()}`, '='),
            ...curr.code.map((line: string) => asyncReplaceFn(line)),
          ].join('\r\n')
        : null
    );

    const result = retval2.filter(e => e).join('\r\n\r\n');
    return result;
  } catch (err) {
    console.error('::ERROR::', err);
  }
}

function createProgramStacksCode(programStacks: Map<string, string[]>) {
  return Array.from(programStacks.values())
    .filter(item => item)
    .map(e => [...e, ''])
    .flat();
}

function createMainProgramCode(stacks: Map<string, string[]>) {
  if (isAsyncNeeded) {
    return [
      'async def main():',
      indent_code([`await multitask(${[...stacks.keys()].join(', ')})`])[0],
      'run_task(main())',
    ];
  } else {
    // single start stack
    return [`${[...stacks.keys()][0]}()`];
  }
}

function getPycodeForStackGroups(
  stackGroups: Map<StackGroupType, StackGroup[]>
) {
  let stackCounter = 0;
  const stacks = new Map<string, string[]>();

  for (const [group_name, stack_group] of stackGroups.entries()) {
    if (!SHOW_ORPHAN_CODE && group_name === StackGroupType.Orphan) continue;

    for (const stack_gitem of stack_group) {
      const code: string[] = [];
      const stack = stack_gitem.stack;
      const group = stack_gitem.group;
      const headBlock = stack[0];
      const nextBlocks = stack.slice(1);
      if (group === StackGroupType.MessageEvent) {
        const messageNameRaw = getMessageName(stack);
        const messageName = Broadcasts.sanitize(messageNameRaw);
        if (!Broadcasts.has(messageName)) {
          Helpers.get('class_Message');
          code.push(
            ...[
              '',
              get_divider(`[MESSAGE] ${messageNameRaw}`, '-'),
              Broadcasts.get_code(messageName),
              '',
            ]
          );
          const stack_fn = `${Broadcasts.get_pyname(messageName)}.main_fn`;
          stacks.set(stack_fn, null);
        }
      }

      stackCounter++;
      code.push(
        `### [STACK: #${stackCounter}] ${headBlock.get_block_description()}`
      );

      const stack_fn = `stack${stackCounter}_fn`;
      const stack_action_fn = `stack${stackCounter}_action_fn`;
      const sub_code = process_stack(nextBlocks);

      switch (group_name) {
        case StackGroupType.Start:
          //case 'flipperevents_whenProgramStarts':
          {
            code.push(`${ASYNC_PLACEHOLDER}def ${stack_fn}():`);
            code.push(...sub_code);

            // add to stack
            stacks.set(stack_fn, code);
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
            const condition_code = processOperation(headBlock);
            code.push(`def ${stack_cond_fn}():`);
            code.push(...indent_code(['return ' + condition_code.raw]));
            code.push(`async def ${stack_fn}():`);
            code.push(
              ...indent_code([
                `await ${Helpers.get('event_task', stack_cond_fn, stack_action_fn).raw}`,
              ])
            );

            // add to stack
            stacks.set(stack_fn, code);
          }
          break;

        case StackGroupType.MessageEvent:
          // case 'event_whenbroadcastreceived':
          {
            const messageName = getMessageName(stack);

            // stack action function
            code.push(`async def ${stack_action_fn}():`);
            code.push(...sub_code);
            code.push(
              Broadcasts.add_stack(
                Broadcasts.sanitize(messageName),
                stack_action_fn
              )
            );

            // condition function already added

            // add to stack
            stacks.set(stack_fn, code);
          }
          break;

        default:
          {
            code.push('### this code will not be running\r\n#');
            const sub_code = process_stack(stack).map(line => '# ' + line);
            code.push(...sub_code);

            // add to stack
            //??
          }
          break;
      }
    }
  }
  return stacks;
}

function getTopLevelStacks(root_target: JsonBlock) {
  return Object.entries(root_target.blocks)
    .filter(([id, block]: [string, any]) => block.topLevel && !block.shadow)
    .map(([id, block]: [string, any]) => {
      return Block.buildStack(new Block(block, id, root_target));
    });
}

function getStackGroups(topLevelStacks: Block[][]) {
  const retval = topLevelStacks
    .map(stack => {
      const headBlock = stack[0];
      const op = headBlock.opcode;
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
        getMessageName(a.stack).localeCompare(getMessageName(b.stack))
      );

  return retval;
}

export function process_stack(blocks: Block[] | null): string[] {
  const retval: string[] = [];

  if (blocks && blocks.length > 0) {
    for (const block of blocks) {
      const comment = getCommentForBlock(block);
      if (comment) retval.push(...indent_code(`# ${comment}`));

      const sub_code = convertBlockToCode(block);
      if (sub_code !== null) retval.push(...indent_code(sub_code));
    }
  } else {
    retval.push(...indent_code('pass'));
  }

  return retval;
}

function getMessageName(stack: Block[]): string {
  const headBlock = stack[0];
  if (headBlock?.opcode !== 'event_whenbroadcastreceived') return null;
  const messageName = String(headBlock.get_field('BROADCAST_OPTION').value);
  return messageName;
}

function getCommentForBlock(block: Block) {
  //TODO: optimize
  const commentBlock = Array.from(Object.values(block._root.comments)).filter(
    (elem: any) => {
      return elem.blockId === block._id;
    }
  )?.[0] as any;
  const comment = commentBlock?.text;

  return comment?.replace(/[\r\n]/g, ' ');
}

function convertBlockToCode(block: Block): string[] | null {
  const op = block.opcode;
  if (handlers.blockHandlers[op]) return handlers.blockHandlers[op](block);
  else return null;
}

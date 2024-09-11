import { Block, extractProcedureDefinition } from './block';
import broadcasts from './broadcasts';
import { setup_devices_clear, setup_devices_registry } from './device';
import { handlers } from './handlers/handlers';
import { processOperation } from './handlers/operator';
import helpers, { HelperEnabledEntry } from './helpers';
import imports, { ImportRegistryEntry } from './imports';
import * as Procedures from './procedures';
import { BlockField, ScratchProject, ScratchTarget } from './scratch';
import {
  ASYNC_PLACEHOLDER,
  AWAIT_PLACEHOLDER,
  get_divider,
  indent_code,
} from './utils';
import * as Variables from './variables';
import { INDENT } from './utils';

enum StackGroupType {
  Start = 1,
  Event = 2,
  MessageEvent = 3,
  MyBlock = 4,
  Orphan = 9,
}

interface StackGroup {
  opcode: string;
  group: StackGroupType;
  stack: Block[];
}
export interface PyConverterOptions {
  debug?: {
    showOrphanCode?: boolean;
    skipHeader?: boolean;
    skipImports?: boolean;
    skipHelpers?: boolean;
    skipSetup?: boolean;
    showBlockIds?: boolean;
    showThisStackOnly?: string;
  };
}

let isAsyncNeeded = false;
export function setAsyncFlag(value: boolean) {
  isAsyncNeeded = value;
}

export function convertFlipperProgramToPython(
  projectData: ScratchProject,
  options: PyConverterOptions = {}
) {
  // ========================
  let plainCode, pyCode;
  try {
    //TODO: move to session handling
    clearCaches();

    preprocessMessages(projectData);
    preprocessProcedureDefinitions(projectData);

    const target1 = projectData.targets[1];
    // ------------------------
    const topLevelStacks = getTopLevelStacks(target1);
    plainCode = generatePlainCodeForStacks(topLevelStacks);

    // ------------------------
    for (const varblock of Object.values(target1.variables)) {
      if (Array.isArray(varblock)) {
        const name = varblock[0];
        Variables.use(name, null, false);
      }
    }
    for (const varblock of Object.values(target1.lists)) {
      if (Array.isArray(varblock)) {
        const name = varblock[0];
        Variables.use(name, null, true);
      }
    }

    const stackGroups = getStackGroups(topLevelStacks);

    // switch to async if there ar multiple start stacks or any event stack
    if (!isAsyncNeeded)
      isAsyncNeeded =
        (stackGroups.get(StackGroupType.Start)?.length ?? 0) > 1 ||
        (stackGroups.get(StackGroupType.Event)?.length ?? 0) > 0 ||
        (stackGroups.get(StackGroupType.MessageEvent)?.length ?? 0) > 0 ||
        false;

    const programStacks = getPycodeForStackGroups(stackGroups);
    const programCode = createProgramStacksCode(programStacks, options);

    const setupCode = createSetupCodes();

    const helperCode = HelperEnabledEntry.to_global_code(helpers);

    const codeSections: { name: string; code: string[]; skip?: boolean }[] = [
      {
        name: 'imports',
        code: ImportRegistryEntry.to_global_code(imports),
        skip: options?.debug?.skipImports,
      },
      { name: 'setup', code: setupCode, skip: options?.debug?.skipSetup },
      { name: 'global variables', code: Variables.to_global_code() },
      {
        name: 'helper functions',
        code: helperCode,
        skip: options?.debug?.skipHelpers,
      },
      { name: 'program code', code: programCode },
      { name: 'main code', code: createMainProgramCode(programStacks) },
    ];

    const asyncReplaceFn = (line: string) => {
      return line
        .replace(ASYNC_PLACEHOLDER, isAsyncNeeded ? 'async ' : '')
        .replace(AWAIT_PLACEHOLDER, isAsyncNeeded ? 'await ' : '');
    };

    const retval2 = codeSections
      .filter(curr => !curr.skip)
      .map(curr =>
        curr.code?.length
          ? [
              get_divider(`SECTION: ${curr.name.toUpperCase()}`, '='),
              ...curr.code.map(asyncReplaceFn),
            ].join('\r\n')
          : null
      );

    pyCode = retval2.filter(e => e).join('\r\n\r\n');
  } catch (err) {
    console.error('::ERROR::', err);
  }

  return { plaincode: plainCode, pycode: pyCode };
}

function generatePlainCodeForStacks(topLevelStacks: Block[][]) {
  const genSimpleCodeForStack = (
    blocks: Block[],
    doIndentFirst = true
  ): string[] => {
    return blocks
      ?.map((block, index) => {
        const code: string[] = [
          (!doIndentFirst || index > 0 ? INDENT : '') +
            block.get_block_description(false),
        ];
        block.substacks?.map((substack, substackindex) => {
          const substackCode = genSimpleCodeForStack(substack, false)?.map(
            line => INDENT + line
          );
          if (substackindex > 0) code.push(INDENT + '^^^');
          if (substackCode) code.push(...substackCode);
        });

        return code;
      })
      .flat();
  };
  const genSimpleCodeForStacks = (stacks: Block[][]) => {
    return stacks
      .map(stack => genSimpleCodeForStack(stack, true))
      .map(slines => [...slines, ''])
      .flat();
  };

  const code = genSimpleCodeForStacks(topLevelStacks);
  return code.join('\n');
}

function createSetupCodes() {
  const setupCodes = [];
  setupCodes.push('hub = PrimeHub()');
  imports.use('pybricks.hubs', 'PrimeHub');

  for (const elem of setup_devices_registry.values()) {
    elem.ensure_dependencies();
  }

  const remainingItems = [...setup_devices_registry.values()];
  while (remainingItems.length) {
    // TODO: safeguard against circular dependency
    for (const elem1 of remainingItems.entries()) {
      const [idx, elem] = elem1;
      if (elem.dependencies?.every(elem2 => !remainingItems.includes(elem2))) {
        remainingItems.splice(idx, 1);

        const code = elem.setup_code();
        if (code) setupCodes.push(...code);

        break;
      }
    }
  }
  return setupCodes;
}

function clearCaches() {
  broadcasts.clear();
  setup_devices_clear();
  helpers.clear();
  imports.clear();
  Variables.clear();
  Procedures.clear();
}

function preprocessMessages(projectData: ScratchProject) {
  const target0 = projectData.targets[0];
  Object.entries(target0.broadcasts).forEach(([id, name]) =>
    broadcasts.use(id, name)
  );
}

function preprocessProcedureDefinitions(projectData: ScratchProject) {
  const target1 = projectData.targets[1];
  Object.entries(target1.blocks)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    .filter(([id, sblock]) => sblock.opcode === 'procedures_definition')
    .forEach(([id, sblock]) => {
      const block = new Block(sblock, id, target1);
      const procdef = extractProcedureDefinition(block);
      Procedures.register(procdef);
    });
}

function createProgramStacksCode(
  programStacks: OutputCodeStack[],
  options: PyConverterOptions
) {
  const stacks = Array.from(programStacks.values()).filter(
    ostack => ostack.code
  );
  return stacks?.length > 0
    ? stacks
        .filter(
          ostack =>
            (!options?.debug?.showThisStackOnly ||
              ostack.id === options?.debug?.showThisStackOnly) &&
            (options?.debug?.showOrphanCode ||
              ostack.group !== StackGroupType.Orphan)
        )
        .map(ostack =>
          ostack.code.length > 0 && !ostack.isDivider
            ? [
                options.debug?.showBlockIds
                  ? `# BlockId: "${ostack.id}"`
                  : null,
                ...ostack.code,
                '',
              ]
            : [...ostack.code]
        )
        .flat()
        .filter(s1 => s1 !== null)
    : null;
}

function createMainProgramCode(ostacks: OutputCodeStack[]) {
  const startupStacks = ostacks.filter(ostack => ostack.isStartup);

  if (ostacks.length === 0 || startupStacks.length === 0)
    return [
      '# no startup stacks registered, program will not do anything',
      'pass',
    ];

  if (isAsyncNeeded) {
    // multiple start stacks
    return [
      'async def main():',
      indent_code([
        `await multitask(${[
          ...startupStacks
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(ostack => ostack.name),
        ].join(', ')})`,
      ])[0],
      'run_task(main())',
    ];
  } else {
    // single start stack
    return [`${startupStacks[0].name}()`];
  }
}

type OutputCodeStack = {
  id: string;
  code: string[];
  isStartup?: boolean;
  isDivider?: boolean;
  name?: string;
  group?: StackGroupType;
};

function getPycodeForStackGroups(
  stackGroups: Map<StackGroupType, StackGroup[]>
) {
  let stackCounter = 0;
  const aggregatedCodeStacks: OutputCodeStack[] = [];

  for (const [group_name, stack_group] of stackGroups.entries()) {
    // add a header code
    const groupNameStr = StackGroupType[group_name];
    aggregatedCodeStacks.push({
      id: null,
      code: [get_divider(`GROUP: ${groupNameStr.toUpperCase()}`, '-')],
      isStartup: false,
      isDivider: true,
      group: group_name,
    });

    let lastStackEventMessageId = null;
    const aggregatedMessageFns: string[] = [];
    for (const stack_gitem of stack_group) {
      try {
        stackCounter++;

        const code: string[] = [];
        const currentStack = stack_gitem.stack;
        const group = stack_gitem.group;
        const headBlock = currentStack[0];
        const nextBlocks = currentStack.slice(1);

        let stack_fn = `stack${stackCounter}_fn`;
        const stackActionFn = `stack${stackCounter}_action_fn`;
        let description = headBlock.get_block_description();
        let funcSignature = `${stack_fn}()`;

        const messageRecord = getMessageRecord(currentStack);
        const messageId = messageRecord?.[1];
        const messageNameRaw = messageRecord?.[0]?.toString();
        // const messageName = broadcasts.sanitize(messageNameRaw);
        const isMessageChanged = lastStackEventMessageId !== messageId;
        lastStackEventMessageId = checkAndRegisterMessage(
          currentStack,
          stackActionFn,
          lastStackEventMessageId,
          aggregatedCodeStacks,
          aggregatedMessageFns,
          false
        );

        if (group === StackGroupType.MyBlock) {
          const functionDef = extractProcedureDefinition(headBlock);
          Procedures.register(functionDef);

          stack_fn = functionDef.getPyName('myblock_');
          funcSignature = functionDef.getPyDefinition();
          description = funcSignature;
        } else if (group === StackGroupType.MessageEvent) {
          if (isMessageChanged) {
            aggregatedCodeStacks.push({
              id: null,
              code: [get_divider(`MESSAGE: ${messageNameRaw}`, '-')],
              isStartup: false,
              isDivider: true,
              group,
            });
          }
        }

        code.push(`# STACK#${stackCounter}: ${description}`);

        const sub_code = process_stack(nextBlocks);

        switch (group_name) {
          case StackGroupType.Start:
          case StackGroupType.MyBlock:
            {
              code.push(`${ASYNC_PLACEHOLDER}def ${funcSignature}:`);
              code.push(...sub_code);

              aggregatedCodeStacks.push({
                id: headBlock._id,
                code: code,
                isStartup: group_name === StackGroupType.Start,
                name: stack_fn,
                isDivider: false,
                group,
              });
            }
            break;
          case StackGroupType.Event:
            {
              // case 'flipperevents_whenButton': // TODO: later separate and optimize
              // case 'flipperevents_whenTimer': // TODO: later separate and optimize

              // stack action function
              code.push(`async def ${stackActionFn}():`);
              code.push(...sub_code);

              // condition function
              const stack_cond_fn = `stack${stackCounter}_condition_fn`;
              const condition_code = processOperation(headBlock);
              code.push(`def ${stack_cond_fn}():`);
              code.push(...indent_code(['return ' + condition_code.raw]));
              code.push(`async def ${stack_fn}():`);
              code.push(
                ...indent_code([
                  `await ${helpers.use('event_task')?.call(stack_cond_fn, stackActionFn).raw}`,
                ])
              );

              // add to stack
              aggregatedCodeStacks.push({
                id: headBlock._id,
                code: code,
                isStartup: true,
                name: stack_fn,
                group,
              });
            }
            break;

          case StackGroupType.MessageEvent:
            {
              // const messageName = getMessageName(currentStack);

              // stack action function
              code.push(`async def ${stackActionFn}():`);
              code.push(...sub_code);

              // condition function already added once on top

              // add to stack
              aggregatedCodeStacks.push({
                id: headBlock._id,
                code: code,
                isStartup: false,
                group,
              });
            }
            break;

          default:
            {
              code.push(
                '### this code has no hat block and will not be running'
              );
              const sub_code = process_stack(currentStack).map(
                line => '# ' + line
              );
              code.push(...sub_code);

              // add to stack, but not to startup
              aggregatedCodeStacks.push({
                id: headBlock._id,
                code: code,
                isStartup: false,
                group,
              });
            }
            break;
        }
      } catch (err) {
        console.error('::ERROR::', err);
      }
    }

    // dump any potential accumulated message
    checkAndRegisterMessage(
      null,
      null,
      lastStackEventMessageId,
      aggregatedCodeStacks,
      aggregatedMessageFns,
      true
    );
  }

  return aggregatedCodeStacks;
}

function checkAndRegisterMessage(
  currentStack: Block[],
  stackActionFn: string,
  lastStackEventMessageId: any,
  aggregatedCodeStacks: OutputCodeStack[],
  aggregatedMessageFns: string[],
  forceDump: boolean
) {
  const messageRecord = getMessageRecord(currentStack);
  const messageId = messageRecord?.[1];
  // const messageNameRaw = messageRecord?.[0]?.toString();
  // const messageName = BroadcastEntry.sanitize(messageNameRaw);
  if (
    aggregatedMessageFns.length &&
    (lastStackEventMessageId !== messageId || forceDump)
  ) {
    helpers.use('class_Message');

    const bco = broadcasts.get(lastStackEventMessageId);
    const message_fn = bco.get_pyname();
    aggregatedCodeStacks.push({
      id: message_fn,
      code: [bco.get_code(aggregatedMessageFns)],
      isStartup: false,
    });
    const stack_fn = `${message_fn}.main_fn`;
    aggregatedCodeStacks.push({
      id: null,
      code: null,
      isStartup: true,
      name: stack_fn,
    });

    aggregatedMessageFns.splice(0, aggregatedMessageFns.length);
    lastStackEventMessageId = messageId;
  }

  if (messageId?.length) {
    aggregatedMessageFns.push(stackActionFn);
    lastStackEventMessageId = messageId;
  }

  return lastStackEventMessageId;
}

function getTopLevelStacks(target1: ScratchTarget) {
  return Object.entries(target1.blocks)
    .filter(([, block]) => block.topLevel && !block.shadow)
    .map(([id, block]) => {
      return Block.buildStack(new Block(block, id, target1));
    });
}

function getStackGroups(topLevelStacks: Block[][]) {
  const retval = topLevelStacks
    .map(stack => {
      const headBlock = stack[0];
      const op = headBlock.opcode;
      function get_op_group(op: string) {
        if (op === 'flipperevents_whenProgramStarts') {
          return StackGroupType.Start;
        } else if (op.startsWith('flipperevents_when')) {
          return StackGroupType.Event;
        } else if (op.startsWith('event_whenbroadcastreceived')) {
          return StackGroupType.MessageEvent;
        } else if (op === 'procedures_definition') {
          return StackGroupType.MyBlock;
        } else {
          return StackGroupType.Orphan;
        }
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
        getMessageRecord(a.stack)?.[0]
          ?.toString()
          ?.localeCompare(getMessageRecord(b.stack)?.[0]?.toString())
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

function getMessageRecord(stack: Block[]): BlockField {
  const headBlock = stack?.[0];
  if (headBlock?.opcode !== 'event_whenbroadcastreceived') return null;

  // [0] is the message name, [1] is the message refid
  const messageRecord = headBlock.get_fieldObject('BROADCAST_OPTION');
  return messageRecord;
}

function getCommentForBlock(block: Block) {
  const comment = block._root.comments[block._block.comment]?.text;
  return comment?.replace(/[\r\n]/g, ' ');
}

function convertBlockToCode(block: Block): string[] | null {
  try {
    const op = block.opcode;
    if (handlers.blockHandlers.has(op))
      return handlers.blockHandlers.get(op)(block);
  } catch (e) {
    console.trace(e);
    return [
      `# error with: ${block.get_block_description()} @ ${block._id} - ${e}`,
    ];
  }

  return [`# unknown: ${block.get_block_description()}`];
}

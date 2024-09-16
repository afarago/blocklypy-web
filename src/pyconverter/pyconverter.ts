import { Block, extractProcedureDefinition } from './block';
import { DeviceOnPortBase } from './device';
import { DeviceDriveBase } from './devicedrivebase';
import { handlers } from './handlers/handlers';
import { initMotorPairMovementPair } from './handlers/motorpair';
import { processOperation } from './handlers/operator';
import { HelperEnabledRegistryPayload } from './helpers';
import { ImportRegistryPayload } from './imports';
import getContext, { newContext } from './context';
import PyConverterOptions from './pyconverteroptions';
import { BlockField, ScratchProject, ScratchTarget } from './scratch';
import {
  _debug,
  ASYNC_PLACEHOLDER,
  AWAIT_PLACEHOLDER,
  get_divider,
  INDENT,
  indent_code,
} from './utils';
import { VariableRegistryPayload } from './variables';

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

type OutputCodeStack = {
  id: string;
  code: string[];
  isStartup?: boolean;
  isDivider?: boolean;
  name?: string;
  group?: StackGroupType;
};

export default class PyConverter {
  _isAsyncNeeded = false;
  _options: PyConverterOptions;

  constructor(options: PyConverterOptions = {}) {
    this._options = options;
  }

  convert(projectData: ScratchProject) {
    // ========================
    let plainCode, pyCode;
    try {
      //TODO: move to session handling
      newContext();

      const target1 = projectData.targets[1];
      this.preprocessMessages(projectData);
      this.preprocessProcedureDefinitions(projectData);
      this.preprocessVariables(target1);

      // ------------------------
      const topLevelStacks = this.prepareTopLevelStacks(target1);

      // ------------------------
      plainCode = this.generatePlainCodeForStacks(topLevelStacks);

      // ------------------------
      const stackGroups = this.getStackGroups(topLevelStacks);
      this.preprocessStackGroups(stackGroups);

      // switch to async if there ar multiple start stacks or any event stack
      if (!this._isAsyncNeeded)
        this._isAsyncNeeded =
          (stackGroups.get(StackGroupType.Start)?.length ?? 0) > 1 ||
          (stackGroups.get(StackGroupType.Event)?.length ?? 0) > 0 ||
          (stackGroups.get(StackGroupType.MessageEvent)?.length ?? 0) > 0 ||
          false;

      const programStacks = this.getPycodeForStackGroups(stackGroups);
      const programCode = this.createProgramStacksCode(programStacks);

      const setupCode = this.createSetupCodes();

      const helperCode = HelperEnabledRegistryPayload.to_global_code(
        getContext().helpers
      );

      const mainProgramCode = this.createMainProgramCode(programStacks);

      const codeSections: { name: string; code: string[]; skip?: boolean }[] = [
        {
          name: 'getContext().imports',
          code: ImportRegistryPayload.to_global_code(getContext().imports),
          skip: this._options?.debug?.skipImports,
        },
        {
          name: 'helper functions',
          code: helperCode,
          skip: this._options?.debug?.skipHelpers,
        },
        {
          name: 'setup',
          code: setupCode,
          skip: this._options?.debug?.skipSetup,
        },
        {
          name: 'global variables',
          code: VariableRegistryPayload.to_global_code(getContext().variables),
        },
        { name: 'program code', code: programCode },
        { name: 'main code', code: mainProgramCode },
      ];

      const asyncReplaceFn = (line: string) => {
        return line
          .replaceAll(ASYNC_PLACEHOLDER, this._isAsyncNeeded ? 'async ' : '')
          .replaceAll(AWAIT_PLACEHOLDER, this._isAsyncNeeded ? 'await ' : '');
      };

      const getSectionName = (name: string, isStart: boolean) =>
        `#${isStart ? '' : 'end'}region section_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      const retval2 = codeSections
        .filter(curr => !curr.skip)
        .map(curr =>
          curr.code?.length
            ? [
                get_divider(`SECTION: ${curr.name.toUpperCase()}`, '='),
                getSectionName(curr.name, true),
                ...curr.code.map(asyncReplaceFn),
                getSectionName(curr.name, false),
              ].join('\r\n')
            : null
        );

      pyCode = retval2.filter(e => e).join('\r\n\r\n');
    } catch (err) {
      console.error('::ERROR::', err);
    }

    return { plaincode: plainCode, pycode: pyCode };
  }

  private preprocessVariables(target1: ScratchTarget) {
    for (const varblock of Object.values(target1.variables)) {
      if (Array.isArray(varblock)) {
        const name = varblock[0];
        const entry = getContext().variables.use([name, false], null, false);
        entry.generateUniqueName();
      }
    }
    for (const varblock of Object.values(target1.lists)) {
      if (Array.isArray(varblock)) {
        const name = varblock[0];
        const entry = getContext().variables.use([name, true], null, true);
        entry.generateUniqueName();
      }
    }
  }

  generatePlainCodeForStacks(topLevelStacks: Block[][]) {
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

  createSetupCodes() {
    const setupCodes = [];
    setupCodes.push('hub = PrimeHub()');
    getContext().imports.use('pybricks.hubs', 'PrimeHub');

    // ensure dependencies
    for (const elem of getContext().setup_devices_registry.values()) {
      elem.ensure_dependencies();
    }

    // process and add all devices
    const remainingItems = [...getContext().setup_devices_registry.values()];

    // anything that is connected to a port
    Array.from(remainingItems.filter(elem => elem instanceof DeviceOnPortBase))
      .sort((a: DeviceOnPortBase, b: DeviceOnPortBase) =>
        a.portString.localeCompare(b.portString)
      )
      .forEach(elem => {
        const code = elem.setup_code();
        if (code) setupCodes.push(...code);

        const idx = remainingItems.indexOf(elem);
        remainingItems.splice(idx, 1);
      });

    remainingItems
      .sort((a, b) => a.devicename.localeCompare(b.devicename))
      .forEach(elem => {
        const code = elem.setup_code();
        if (code) setupCodes.push(...code);
      });

    return setupCodes;
  }

  preprocessMessages(projectData: ScratchProject) {
    const target0 = projectData.targets[0];
    Object.entries(target0.broadcasts).forEach(([id, name]) =>
      getContext().broadcasts.use(id, name)
    );
  }

  preprocessProcedureDefinitions(projectData: ScratchProject) {
    const target1 = projectData.targets[1];
    Object.entries(target1.blocks)
      .filter(([_, sblock]) => sblock.opcode === 'procedures_definition')
      .forEach(([id, sblock]) => {
        const block = new Block(sblock, id, target1);
        const procdef = extractProcedureDefinition(block);
        getContext().procedures.use(procdef.id, procdef);
      });
  }

  createProgramStacksCode(programStacks: OutputCodeStack[]) {
    const stacks = Array.from(programStacks.values()).filter(
      ostack => ostack.code
    );
    return stacks?.length > 0
      ? stacks
          .filter(
            ostack =>
              !this._options?.debug?.showThisStackOnly ||
              ostack.id === this._options?.debug?.showThisStackOnly
            // && (this._options?.debug?.showOrphanCode || ostack.group !== StackGroupType.Orphan)
          )
          .map(ostack =>
            ostack.code.length > 0 && !ostack.isDivider
              ? [
                  this._options.debug?.showBlockIds
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

  createMainProgramCode(ostacks: OutputCodeStack[]) {
    const startupStacks = ostacks.filter(ostack => ostack.isStartup);

    if (ostacks.length === 0 || startupStacks.length === 0)
      return [
        '# no startup stacks registered, program will not do anything',
        'pass',
      ];

    if (this._isAsyncNeeded) {
      getContext().imports.use('pybricks.tools', 'multitask, run_task');

      // multiple start stacks
      return [
        'async def main():',
        indent_code([
          `await multitask(${[
            ...startupStacks.map(ostack => `${ostack.name}()`),
          ].join(', ')})`,
        ])[0],
        'run_task(main())',
      ];
    } else {
      // single start stack
      return [`${startupStacks[0].name}()`];
    }
  }

  getPycodeForStackGroups(stackGroups: Map<StackGroupType, StackGroup[]>) {
    let stackCounter = 0;
    const aggregatedCodeStacks: OutputCodeStack[] = [];

    for (const [group_name, stack_group] of stackGroups.entries()) {
      if (
        group_name === StackGroupType.Orphan &&
        !this._options?.debug?.showOrphanCode
      ) {
        continue;
      }

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

          const messageRecord = this.getMessageRecord(currentStack);
          const messageId = messageRecord?.[1];
          const messageNameRaw = messageRecord?.[0]?.toString();
          // const messageName = sanitize(messageNameRaw);
          const isMessageChanged = lastStackEventMessageId !== messageId;
          lastStackEventMessageId = this.checkAndRegisterMessage(
            currentStack,
            stackActionFn,
            lastStackEventMessageId,
            aggregatedCodeStacks,
            aggregatedMessageFns,
            false
          );

          if (group === StackGroupType.MyBlock) {
            const functionDef = extractProcedureDefinition(headBlock, true);
            //procedures.use(functionDef.id, functionDef);
            // Procedures.register(functionDef);

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

          code.push(`# STACK #${stackCounter}: ${description}`);

          const sub_code = PyConverter.process_stack(nextBlocks);

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
                    `await ${getContext().helpers.use('event_task')?.call(stack_cond_fn, stackActionFn).raw}`,
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
                if (!this._options?.debug?.showOrphanCode) continue;

                code.push(
                  '### this code has no hat block and will not be running'
                );
                const sub_code = PyConverter.process_stack(currentStack).map(
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
      this.checkAndRegisterMessage(
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

  checkAndRegisterMessage(
    currentStack: Block[],
    stackActionFn: string,
    lastStackEventMessageId: any,
    aggregatedCodeStacks: OutputCodeStack[],
    aggregatedMessageFns: string[],
    forceDump: boolean
  ) {
    const messageRecord = this.getMessageRecord(currentStack);
    const messageId = messageRecord?.[1];
    if (
      aggregatedMessageFns.length &&
      (lastStackEventMessageId !== messageId || forceDump)
    ) {
      const bco = getContext().broadcasts.get(lastStackEventMessageId);

      getContext().helpers.use('class_Message');
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
      if (!getContext().broadcasts.has(messageId)) {
        const messageName = messageRecord[0]?.toString();
        getContext().broadcasts.use(messageId, messageName);
      }
      aggregatedMessageFns.push(stackActionFn);
      lastStackEventMessageId = messageId;
    }

    return lastStackEventMessageId;
  }

  prepareTopLevelStacks(target1: ScratchTarget) {
    return Object.entries(target1.blocks)
      .filter(([, block]) => block.topLevel && !block.shadow)
      .map(([id, block]) => {
        return Block.buildStack(new Block(block, id, target1));
      });
  }

  getStackGroups(topLevelStacks: Block[][]) {
    const retval = topLevelStacks
      .map(stack => {
        const headBlock = stack[0];
        const op = headBlock.opcode;
        function get_op_group(op: string) {
          if (op.match(/(flipper|horizontal)events_whenProgramStarts/)) {
            return StackGroupType.Start;
          } else if (op.match(/(flipper|horizontal)events_when/)) {
            return StackGroupType.Event;
          } else if (
            op === 'event_whenbroadcastreceived' ||
            op === 'horizontalevents_whenBroadcast'
          ) {
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
          this.getMessageRecord(a.stack)?.[0]
            ?.toString()
            ?.localeCompare(this.getMessageRecord(b.stack)?.[0]?.toString())
        );

    return retval;
  }

  preprocessStackGroups(stackGroups: Map<StackGroupType, StackGroup[]>) {
    let motorpairFound = false;
    for (const [stack_type, stack_group] of stackGroups.entries()) {
      if (stack_type === StackGroupType.Orphan) continue;
      for (const stack of stack_group) {
        for (const block of stack.stack) {
          const op = block.opcode;
          if (op === 'flippermove_setMovementPair' && !motorpairFound) {
            initMotorPairMovementPair(block, undefined, true);
            motorpairFound = true;
            // only one/first setMovementPair is taken into account
          }
          if (op === 'flippercontrol_fork') {
            this._isAsyncNeeded = true;
          }
        }
      }
    }

    //TODO: only if no setMovementPair is used
    if (!motorpairFound) initMotorPairMovementPair(null, ['A', 'B'], false);
    const device = DeviceDriveBase.instance(
      undefined,
      undefined,
      undefined,
      false
    );
    device.ensure_dependencies();
  }

  static process_stack(blocks: Block[] | null): string[] {
    const retval: string[] = [];

    if (blocks && blocks.length > 0) {
      for (const block of blocks) {
        const comment = PyConverter.getCommentForBlock(block);
        if (comment) retval.push(...indent_code(`# ${comment}`));

        const sub_code = PyConverter.convertBlockToCode(block);
        if (sub_code !== null) retval.push(...indent_code(sub_code));
      }
    } else {
      retval.push(...indent_code('pass'));
    }

    return retval;
  }

  getMessageRecord(stack: Block[]): BlockField {
    const headBlock = stack?.[0];
    if (headBlock?.opcode === 'event_whenbroadcastreceived') {
      // [0] is the message name, [1] is the message refid
      return headBlock.get_fieldObject('BROADCAST_OPTION');
    } else if (headBlock?.opcode === 'horizontalevents_whenBroadcast') {
      // "CHOICE": [
      //   1,
      //   "zFLqW+b*f2b]lG6nUD/."
      // ]
      const eventcolor = headBlock.get_input('CHOICE')?.value?.toString();
      // let the eventcolor be the message id as well
      return [eventcolor, eventcolor];
    } else {
      return null;
    }
  }

  static getCommentForBlock(block: Block) {
    const comment = block._root.comments[block._block.comment]?.text;
    return comment?.replace(/[\r\n]/g, ' ');
  }

  static convertBlockToCode(block: Block): string[] | null {
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

    // _debug('unknown block', block.get_block_description());
    return [`# unknown: ${block.get_block_description()}`];
  }
}

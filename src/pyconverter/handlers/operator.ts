import { Block } from '../block';
import { BlockValue } from '../blockvalue';
import * as Helpers from '../helpers';
import * as Imports from '../imports';
import { debug } from '../utils';
import * as Variables from '../variables';
import { handlers, HandlersType, OperatorHandler } from './handlers';

// TODO: split operators as handlers by map

function operator_and_or(block: Block) {
  const op = block?.opcode;
  const operand1 = block?.get_inputAsBlock('OPERAND1');
  const operand2 = block?.get_inputAsBlock('OPERAND2');
  const code_condition1 = processOperation(operand1);
  const code_condition2 = processOperation(operand2);
  return new BlockValue(
    `(${code_condition1.raw}) ${op.includes('and') ? 'and' : 'or'} (${code_condition2.raw})`,
    true
  );
}

export function processOperation(
  block: Block,
  returnOnEmpty = 'None'
): BlockValue {
  if (block) {
    const op = block?.opcode;
    if (handlers.operatorHandlers.has(op))
      return handlers.operatorHandlers.get(op)(block);

    debug(`# unknown: ${block?.get_block_description()}`);
    console.trace();
  }
  return new BlockValue(returnOnEmpty, true);
}

function flipperevents_whenCondition(block: Block) {
  const block2 = block.get_inputAsBlock('CONDITION');
  return processOperation(block2);
}

function flipperevents_whenTimer(block: Block) {
  const value = Helpers.get('convert_time', block.get_input('VALUE'));

  Imports.use('pybricks.tools', 'StopWatch');
  Variables.use('sw_main', 'StopWatch()');

  return new BlockValue(`sw_main.time() > ${value.raw}`, true);
}

function flippersensors_timer() {
  Imports.use('pybricks.tools', 'StopWatch');
  Variables.use('sw_main', 'StopWatch()');

  return new BlockValue('sw_main.time()', true);
}

function flipperoperator_isInBetween(block: Block) {
  const value = Helpers.get('float_safe', block.get_input('VALUE'));
  const low = Helpers.get('float_safe', block.get_input('LOW'));
  const high = Helpers.get('float_safe', block.get_input('HIGH'));

  return new BlockValue(
    `(${low.raw} <= ${value.raw}) and (${value.raw} <= ${high.raw})`,
    true
  );
}

function operator_contains(block: Block) {
  const string1 = Helpers.get('str', block.get_input('STRING1'));
  const string2 = Helpers.get('str', block.get_input('STRING2'));

  return new BlockValue(`${string2.raw} in ${string1.raw}`, true);
}

function operator_length(block: Block) {
  const string = Helpers.get('str', block.get_input('STRING'));

  return new BlockValue(`len(${string})`, true);
}

function operator_letter_of(block: Block) {
  const string = Helpers.get('str', block.get_input('STRING'));
  const letter = Helpers.get('int_safe', block.get_input('LETTER'));

  return new BlockValue(`${string}[${letter}]`, true, false, true);
}

function operator_join(block: Block) {
  const string1 = Helpers.get('str', block.get_input('STRING1'));
  const string2 = Helpers.get('str', block.get_input('STRING2'));

  return new BlockValue(
    `"".join([${string1.raw}, ${string2.raw}])`,
    true,
    false,
    true
  );
}

function operator_random(block: Block) {
  const from = Helpers.get('float_safe', block.get_input('FROM'));
  const to = Helpers.get('float_safe', block.get_input('TO'));

  Imports.use('urandom', 'randint');
  return new BlockValue(`randint(${from}, ${to})`, true);
}

function flipperoperator_mathFunc2Params(block: Block) {
  const arg1 = Helpers.get('float_safe', block.get_input('ARG1'));
  const arg2 = Helpers.get('float_safe', block.get_input('ARG2'));
  const args = [arg1, arg2];
  const post_process_fn = (e: string) => e;
  let op2 = block.get_field('TYPE').value;

  switch (op2) {
    case 'pow':
    case 'atan2':
    case 'copysign':
      Imports.use('umath', null);
      op2 = `umath.${op2}`;
      break;
    // hypot missing
  }

  return new BlockValue(post_process_fn(`${op2}(${args.join(', ')})`), true);
}

function operator_mathop(block: Block) {
  let op2 = block.get_field('TYPE').value;
  const num = Helpers.get('float_safe', block.get_input('NUM'));
  const args = [num];
  let post_process_fn = (e: string) => e;

  Imports.use('umath', null);
  switch (op2) {
    case 'ceiling':
      op2 = 'ceil';
      break;
    case 'ln':
      op2 = 'log';
      break;
    case 'log':
      op2 = 'log';
      post_process_fn = e => `${e}/umath.log(10)`;
      break;
    case 'e ^':
      op2 = 'pow';
      args.unshift('umath.e');
      break;
    case '10 ^':
      op2 = 'pow';
      args.unshift(10);
      break;
  }

  return new BlockValue(
    post_process_fn(`umath.${op2}(${args.join(', ')})`),
    true
  );
}

function operator_round(block: Block) {
  const num = Helpers.get('float_safe', block.get_input('NUM'));

  return new BlockValue(`round(${num})`, true);
}

function operator_math_two_op(block: Block) {
  const op = block?.opcode;
  const operator = (op => {
    switch (op) {
      case 'operator_add':
        return { op: '+' };
      case 'operator_subtract':
        return { op: '-' };
      case 'operator_multiply':
        return { op: '*' };
      case 'operator_divide':
        return { op: '/', par: true };
      case 'operator_mod':
        return { op: '%', par: true, conv_fn: 'int_safe' };
      default:
        return null;
    }
  })(op);

  let num1 = block.get_input('NUM1');
  if (!num1.is_numeric)
    num1 = Helpers.get(operator.conv_fn ?? 'float_safe', num1);
  let num2 = block.get_input('NUM2');
  if (!num2.is_numeric)
    num2 = Helpers.get(operator.conv_fn ?? 'float_safe', num2);

  let num1v = BlockValue.raw(num1);
  let num2v = BlockValue.raw(num2);
  if (operator.par) {
    if (!num1.is_variable && !num1.is_numeric) num1v = `(${num1v})`;
    if (!num2.is_variable && !num2.is_numeric) num2v = `(${num2v})`;
    //!! add DataValue.is_endangered // add level of of (0=+/-,1=*/,2**,-)
  }
  return new BlockValue(`${num1v} ${operator.op} ${num2v}`, true);
}

function operator_lt_gt_eq(block: Block) {
  // this is coming as string, but helper will take care of it
  // NOTE: this can be two strings and "A" > "Apple" makes sense, yet we assume numeric comparison here...
  const op = block?.opcode;
  const operand1 = Helpers.get('float_safe', block.get_input('OPERAND1'));
  const operand2 = Helpers.get('float_safe', block.get_input('OPERAND2'));
  const comparator = (op => {
    switch (op) {
      case 'operator_equals':
        return '==';
      case 'operator_lt':
        return '<';
      case 'operator_gt':
        return '>';
    }
  })(op);

  return new BlockValue(`${operand1.raw} ${comparator} ${operand2.raw}`, true);
}

function operator_not(block: Block) {
  const operand1 = block.get_inputAsBlock('OPERAND');
  const code_condition = processOperation(operand1);
  return new BlockValue(`not (${code_condition.raw})`, true);
}

function argument_reporter_string(block: Block) {
  const value = block.get_field('VALUE');
  return new BlockValue(value.value, true, true, false);
}

export default function operations(): HandlersType {
  const blockHandlers: any = null;
  const operatorHandlers = new Map<string, OperatorHandler>([
    ['operator_or', operator_and_or],
    ['operator_and', operator_and_or],
    ['operator_not', operator_not],
    ['operator_lt', operator_lt_gt_eq],
    ['operator_gt', operator_lt_gt_eq],
    ['operator_equals', operator_lt_gt_eq],
    ['operator_add', operator_math_two_op],
    ['operator_subtract', operator_math_two_op],
    ['operator_multiply', operator_math_two_op],
    ['operator_divide', operator_math_two_op],
    ['operator_mod', operator_math_two_op],
    ['operator_round', operator_round],
    ['operator_mathop', operator_mathop],
    ['flipperoperator_mathFunc2Params', flipperoperator_mathFunc2Params],
    ['operator_random', operator_random],
    ['operator_join', operator_join],
    ['operator_letter_of', operator_letter_of],
    ['operator_length', operator_length],
    ['operator_contains', operator_contains],
    ['flipperoperator_isInBetween', flipperoperator_isInBetween],
    ['flippersensors_timer', flippersensors_timer],
    ['flipperevents_whenTimer', flipperevents_whenTimer],
    ['flipperevents_whenCondition', flipperevents_whenCondition],
    ['argument_reporter_string_number', argument_reporter_string],
    ['argument_reporter_boolean', argument_reporter_string],
  ]);

  return { blockHandlers, operatorHandlers };
}

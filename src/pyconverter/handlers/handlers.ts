import { Block } from '../block';
import { BlockValue } from '../blockvalue';
import control from './control';
import display from './display';
import operations from './operator';
import variables from './variable';
import motor from './motor';
import sensor from './sensor';
// import { Handlers as MotorHandlers } from './handlers/motor.js';
// import { Handlers as MotorPairHandlers } from './handlers/motorpair.js';
import sound from './sound';
import misc from './misc';

export interface HandlersType {
  blockHandlers: BlockHandlersType;
  operationHandlers: OperatorHandlersType;
}
// export type BlockHandlerFunction = (block: Block) => string[] | null
export interface BlockHandlersType {
  [key: string]: (block: Block) => string[] | null;
}
export interface OperatorHandlersType {
  [key: string]: (block: Block) => BlockValue | null;
}

function getHandlers(): HandlersType {
  const retval = [
    control(),
    display(),
    variables(),
    operations(),
    sound(),
    misc(),
    motor(),
    sensor(),
  ].reduce((aggr, elem) => {
    aggr.blockHandlers = { ...aggr.blockHandlers, ...elem.blockHandlers };
    aggr.operationHandlers = {
      ...aggr.operationHandlers,
      ...elem.operationHandlers,
    };
    return aggr;
  }, {} as HandlersType);
  return retval;
}
export const handlers = getHandlers();

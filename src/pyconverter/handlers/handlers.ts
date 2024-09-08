import { Block } from '../block';
import { BlockValue } from '../blockvalue';
import control from './control';
import display from './display';
import operations from './operator';
import variables from './variable';
import motor from './motor';
import motorpair from './motorpair';
import sensor from './sensor';
import sound from './sound';
import misc from './misc';

// export type BlockHandlerFunction = (block: Block) => string[] | null
export type BlockHandler = (block: Block) => string[] | null;
export type OperatorHandler = (block: Block) => BlockValue | null;
export interface HandlersType {
  blockHandlers: Map<string, BlockHandler> | null;
  operatorHandlers: Map<string, OperatorHandler> | null;
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
    motorpair(),
    sensor(),
  ].reduce(
    (aggr, elem) => {
      if (elem.blockHandlers)
        for (const [key, value] of elem.blockHandlers)
          aggr.blockHandlers.set(key, value);
      if (elem.operatorHandlers)
        for (const [key, value] of elem.operatorHandlers)
          aggr.operatorHandlers.set(key, value);
      return aggr;
    },
    {
      blockHandlers: new Map<string, BlockHandler>(),
      operatorHandlers: new Map<string, OperatorHandler>(),
    } as HandlersType
  );

  return retval;
}
export const handlers = getHandlers();

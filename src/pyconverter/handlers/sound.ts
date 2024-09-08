import { Block } from '../block';
import * as Helpers from '../helpers';
import { BlockHandlersType, OperatorHandlersType } from './handlers';

function flippersound_beepForTime(block: Block) {
  const note = block.get_input('NOTE'); // 48 = C, .. 1-8 = C
  const duration = Helpers.get('convert_time', block.get_input('DURATION'));

  return [Helpers.get('hub_speaker_flipper_play', note, duration).value];
}

export default function sound() {
  const blockHandlers: BlockHandlersType = {
    flippersound_beepForTime,
  };
  const operationHandlers: OperatorHandlersType = null;

  return { blockHandlers, operationHandlers };
}

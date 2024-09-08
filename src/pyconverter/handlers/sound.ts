import { Block } from '../block';
import * as Helpers from '../helpers';
import { BlockHandler, HandlersType } from './handlers';

function flippersound_beepForTime(block: Block) {
  const note = block.get_input('NOTE'); // 48 = C, .. 1-8 = C
  const duration = Helpers.get('convert_time', block.get_input('DURATION'));

  return [Helpers.get('hub_speaker_flipper_play', note, duration).value];
}

export default function sound(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['flippersound_beepForTime', flippersound_beepForTime],
  ]);
  const operatorHandlers: any = null;

  return { blockHandlers, operatorHandlers };
}

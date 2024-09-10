import { Block } from '../block';
import helpers from '../helpers';
import { BlockHandler, HandlersType } from './handlers';

function flippersound_beepForTime(block: Block) {
  const note = block.get_input('NOTE'); // 48 = C, .. 1-8 = C
  const duration = helpers
    .use('convert_time')
    ?.call(block.get_input('DURATION'));

  return [
    helpers
      .use('hub_speaker_flipper_play')
      ?.call(note, duration)
      .value.toString(),
  ];
}

export default function sound(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['flippersound_beepForTime', flippersound_beepForTime],
  ]);
  const operatorHandlers: any = null;

  return { blockHandlers, operatorHandlers };
}

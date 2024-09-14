import { Block } from '../block';
import helpers from '../helpers';
import imports from '../imports';
import { AWAIT_PLACEHOLDER } from '../utils';
import { BlockHandler, HandlersType } from './handlers';

function flippersound_beepForTime(block: Block) {
  const note = block.get_input('NOTE'); // 48 = C, .. 1-8 = C
  const duration = helpers
    .use('convert_time')
    ?.call(block.get_input('DURATION'));

  return [
    AWAIT_PLACEHOLDER +
      helpers
        .use('hub_speaker_flipper_play')
        ?.call(note, duration)
        .value.toString(),
  ];
}

function horizontalsound_playMusicSoundUntilDone(block: Block) {
  const note = block.get_input('SOUND'); // "1" = C4, "2" = D4, .. "8" = C5

  imports.use('urandom', 'randint');
  return [
    AWAIT_PLACEHOLDER +
      helpers.use('hub_speaker_iconblocks_play')?.call(note).value.toString(),
  ];
}

export default function sound(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['flippersound_beepForTime', flippersound_beepForTime],
    [
      'horizontalsound_playMusicSoundUntilDone',
      horizontalsound_playMusicSoundUntilDone,
    ],
  ]);
  const operatorHandlers: any = null;

  return { blockHandlers, operatorHandlers };
}

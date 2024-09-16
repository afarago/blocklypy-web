import { Block } from '../block';
import { BlockValue } from '../blockvalue';
import getContext from '../context';
import { AWAIT_PLACEHOLDER } from '../utils';
import { BlockHandler, HandlersType, OperatorHandler } from './handlers';

function flippersound_beepForTime(block: Block) {
  const note = block.get_input('NOTE'); // 48 = C, .. 1-8 = C
  const duration = getContext()
    .helpers.use('convert_time')
    ?.call(block.get_input('DURATION'));

  return [
    AWAIT_PLACEHOLDER +
      getContext()
        .helpers.use('hub_speaker_flipper_play')
        ?.call(note, duration)
        .value.toString(),
  ];
}

function horizontalsound_playMusicSoundUntilDone(block: Block) {
  const note = block.get_input('SOUND'); // "1" = C4, "2" = D4, .. "8" = C5

  getContext().imports.use('urandom', 'randint');
  return [
    AWAIT_PLACEHOLDER +
      getContext()
        .helpers.use('hub_speaker_iconblocks_play')
        ?.call(note)
        .value.toString(),
  ];
}

function sound_setvolumeto(block: Block) {
  const volume = block.get_input('VOLUME');
  return [`hub.speaker.volume(${volume.raw})`];
}

function sound_changevolumeby(block: Block) {
  const volume = block.get_input('VOLUME');
  return [
    `hub.speaker.volume(hub.speaker.volume() + ${getContext().helpers.use('int_safe').call(volume).raw})`,
  ];
}

function sound_volume(_block: Block) {
  return new BlockValue('hub.speaker.volume()', true);
}

export default function sound(): HandlersType {
  const blockHandlers = new Map<string, BlockHandler>([
    ['flippersound_beepForTime', flippersound_beepForTime],
    [
      'horizontalsound_playMusicSoundUntilDone',
      horizontalsound_playMusicSoundUntilDone,
    ],
    ['sound_setvolumeto', sound_setvolumeto],
    ['sound_changevolumeby', sound_changevolumeby],
  ]);
  const operatorHandlers = new Map<string, OperatorHandler>([
    ['sound_volume', sound_volume],
  ]);

  return { blockHandlers, operatorHandlers };
}

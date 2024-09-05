import { Block } from './block.js';

import { PyConverter } from './pyconverter.js';
import { Handlers as ControlHandlers } from './handlers/control.js';
import { Handlers as DisplayHandlers } from './handlers/display.js';
// import { Handlers as VariableHandlers } from './handlers/variable.js';
// import { Handlers as MotorHandlers } from './handlers/motor.js';
// import { Handlers as MotorPairHandlers } from './handlers/motorpair.js';
// import { Handlers as SoundHandlers } from './handlers/sound.js';

interface HandlersType {
  [key: string]: (block: Block, parent: PyConverter) => string[] | null;
}

export const Handlers: HandlersType = {
  ...ControlHandlers,
  ...DisplayHandlers,
  // ...VariableHandlers,
  // ...MotorHandlers,
  // ...MotorPairHandlers,
  // ...SoundHandlers,
};

import { BlockValue } from './blockvalue';
import { flipperColorsMap, round2 } from './converters';
import getContext from './context';
import { RegistryPayloadWithId, RegistryManager } from './registrymanager';
import { _debug, AWAIT_PLACEHOLDER, CONST_CM, CONST_INCHES } from './utils';

interface HelperFunctionDefintion {
  py_fn?: string;
  py_dependencies?: string[];
  local_fn?: (...args: any[]) => any;
  local_dynamic_fn?: (...args: any[]) => any;
  local_fn_condition?: (args: any[]) => boolean;
}

export class HelperEnabledRegistryPayload implements RegistryPayloadWithId {
  id: string;
  private isPyFnEnabled: boolean;

  constructor() {}

  call(...args: any[]): BlockValue {
    const fn_item = helperFunctionsMap.get(this.id);

    if (fn_item) {
      // check if static local conversion is available
      if (fn_item.local_fn) {
        const allow_local =
          args.every(elem => !BlockValue.is_dynamic(elem)) &&
          (!fn_item.local_fn_condition ||
            fn_item.local_fn_condition(args.map(arg => BlockValue.value(arg))));
        if (allow_local) {
          const expr = fn_item.local_fn(
            ...args.map(arg => BlockValue.value(arg))
          );
          return BlockValue.is(expr)
            ? expr
            : new BlockValue(expr, false, false, typeof expr === 'string');
        }
      }

      if (fn_item.local_dynamic_fn) {
        const expr = fn_item.local_fn(...args);
        return BlockValue.is(expr)
          ? expr
          : new BlockValue(expr, true, false, typeof expr === 'string');
      }

      if (fn_item.py_fn) {
        this.isPyFnEnabled = true;
        //!! fn_item.py_dependencies?.forEach(fn_name2 => py_register(fn_name2));
      }
    } else {
      _debug(`WARN: missing helper function called "${this.id}"`);
    }

    return new BlockValue(
      `${this.id}(${args.map(arg => BlockValue.raw(arg)).join(', ')})`,
      true
    );
  }

  static to_global_code(
    registry: RegistryManager<HelperEnabledRegistryPayload>
  ): string[] {
    const codes = Array.from(registry.entries())
      .filter(([, value]) => value.payload.isPyFnEnabled)
      .map(([key]) => {
        const fn_item = helperFunctionsMap.get(key);
        return fn_item.py_fn?.trim().split('\r\n');
      })
      .flat();

    return codes;
  }

  static createRegistry() {
    return new RegistryManager(() => new HelperEnabledRegistryPayload());
  }
}

const helperFunctionsMap = new Map<string, HelperFunctionDefintion>(
  [
    // const
    [
      'convert_time',
      {
        py_fn: `
def convert_time(sec):
    return float_safe(sec) * 1000`,
        py_dependencies: ['float_safe'],
        local_fn: sec => {
          return parseFloat(sec) * 1000;
        },
      },
    ],
    [
      'convert_speed',
      {
        py_fn: `
def convert_speed(pct):
    return float_safe(pct) * 10`,
        local_fn: speed_pct => {
          return speed_pct * 10;
        },
        py_dependencies: ['float_safe'],
        // 100 % = 1080 deg/s for the medium motor
        // 100 % = 970 deg/s for the large motor.
      },
    ],

    [
      'convert_speed_back',
      {
        py_fn: `
def convert_speed_back(deg_s):
    return float_safe(deg_s) / 10`,
        py_dependencies: ['float_safe'],
        local_fn: speed_deg_s => speed_deg_s / 10,
      },
    ],
    [
      'hub_speaker_flipper_play',
      {
        py_fn: `
def hub_speaker_flipper_play(note, duration):
    NOTES = ["C","C#","D","Eb","E","F","F#","G","G#","A","Bb","B"]
    note_abc = NOTES[note%12]
    octave = str(int(note/12))
    bpm = int(60000 / duration * 4)
    ${AWAIT_PLACEHOLDER}hub.speaker.play_notes(f"{note_abc}{octave}/1", bpm)`,
        // # const(NOTE_FREQS) = [16.35, 17.32, 18.35, 19.45, 20.60, 21.83, 23.12, 24.50, 25.96, 27.50, 29.14, 30.87]
        // # freq = NOTE_FREQS[note%12] * 2 << (int(note/12) - 1)
        // # hub.speaker.beep(freq, duration)`,
        // //TODO: local_fn:
      },
    ],
    [
      'hub_speaker_iconblocks_play',
      {
        // 12 bmp with /4 note is 0.5 sec
        py_fn: `
def hub_speaker_iconblocks_play(note):
    NOTES = ["C4","D4","E4","F4","G4","A4","B4","C5"]
    note = int(note) if note != "?" else randint(1, 8)
    note_abc = NOTES[(note-1)%8]
    bpm = 120
    ${AWAIT_PLACEHOLDER}hub.speaker.play_notes([f"{note_abc}/4"], bpm)`,
        //TODO: local_fn:
      },
    ],
    [
      'round',
      {
        // py_fn: //none needed
        local_fn: round2,
      },
    ],
    [
      'float_safe',
      {
        py_fn: `
def float_safe(value, default=0):
    try: return float(value)
    except: return default
`,
        local_fn_condition: args =>
          args.every(
            arg =>
              typeof arg === 'number' ||
              (typeof arg === 'string' && String(parseFloat(arg)) === arg)
          ),
        local_fn: value => parseFloat(value),
      },
    ],
    [
      'str',
      {
        // py_fn: //none needed
        local_fn: value => String(value),
      },
    ],
    [
      'int_safe',
      {
        py_fn: `
def int_safe(value, default=0):
    try: return int(value)
    except: return default
`,
        local_fn_condition: args =>
          args.every(
            arg =>
              typeof arg === 'number' ||
              (typeof arg === 'string' && String(parseFloat(arg)) === arg)
          ),
        local_fn: value => parseInt(value),
      },
    ],
    [
      'event_task',
      {
        py_fn: `
async def event_task(condition_fn, stack_fn):
    while True:
        while not await condition_fn(): yield
        await stack_fn()
        while await condition_fn(): yield`,
      },
    ],
    [
      'class_Message',
      {
        py_fn: `
class Message:
    def __init__(self, stack_fns):
        self.running = False
        self.signalled = False
        self.cancelling = False
        self.stack_fns = stack_fns
    async def main_fn(self):
        while True:
            while not self.signalled: yield
            self.signalled = False
            await self.action_fn()
    async def action_fn(self):
        await self.guard_single()
        if self.running:
            self.cancelling = True
            while self.running: yield
            self.cancelling = False
        try:
            self.running = True
            await multitask(self.guard_fn(), multitask(*[stack_fn() for stack_fn in self.stack_fns]), race=True)
        finally:
            self.running = False
    def guard_single(self):
        if self.running:
            self.cancelling = True
            while self.running: yield
        self.cancelling = False
    def guard_fn(self):
        while self.running and not self.cancelling: yield
    async def broadcast_exec(self, wait):
        if wait:
            await self.action_fn()
        else:
            await self.guard_single()
            self.signalled = True`,
        /*
    def add_stack_fn(self, stack_fn):
        self.stack_fns.append(stack_fn)
*/
      },
    ],
    [
      'convert_distance',
      {
        local_fn: (value, unit) => {
          switch (unit) {
            case CONST_CM:
              return round2(value * 10, 2); // cm->mm
            case CONST_INCHES:
              return round2(value * 25.4, 2); // in->mm
            default:
              return value;
          }
        },
        py_fn: `
def convert_distance(value, unit):
    if unit == "cm": return value * 10
    elif unit == "inches": return value * 25.4
    else: return value`,
      },
    ],
    [
      'convert_color',
      {
        local_fn: value => {
          // const COLORS = [
          //   'BLACK',
          //   'MAGENTA',
          //   'VIOLET',
          //   'BLUE',
          //   'CYAN',
          //   'GREEN',
          //   'GREEN',
          //   'YELLOW',
          //   'ORANGE',
          //   'RED',
          //   'WHITE',
          // ];
          const colors = Array.from(flipperColorsMap.values());
          const color_value = value in colors ? colors[value] : 'Color.NONE';

          getContext().imports.use('pybricks.parameters', 'Color');
          return color_value;
        },
        py_fn: `
def convert_color(value):
    COLORS = [Color.BLACK, Color.MAGENTA, Color.VIOLET, Color.BLUE, Color.CYAN, Color.GREEN, Color.GREEN, Color.YELLOW, Color.ORANGE, Color.RED, Color.WHITE]
    return COLORS[int_safe(value)]`,
        py_dependencies: ['int_safe'],
      },
    ],
    [
      'convert_color_back',
      {
        py_fn: `
def convert_color_back(value):
    colorMap = [${Array.from(flipperColorsMap.values())
      .map((key, value) => `${key}: ${value}`)
      .join(', ')}]
    return colorMap.index(value)`,
      },
    ],
    //!!TODO
    [
      'convert_brightness',
      {
        local_fn: value => {
          // 0-9 -> 0-100
          return Math.round((Math.min(9, Math.max(0, value)) / 9) * 100);
        },
        py_fn: `
def convert_brightness(value):
    return round(min(9, max(0, value)) / 9 * 100)`,
      },
    ],

    [
      'convert_ussensor_distance',
      {
        local_fn: (value, unit) => {
          switch (BlockValue.raw(unit)) {
            case CONST_CM:
              return value * 10; // cm->mm
            case CONST_INCHES:
              return value * 25.4; // in->mm
            case '%':
              return (2000 * BlockValue.raw(value)) / 100; // 100% = 2000mm
            default:
              return value;
          }
        },
        py_fn: `
def convert_ussensor_distance(value, unit):
    if unit == "cm": return value * 10
    elif unit == "inches": return value * 25.4
    elif unit == "%": return 2000 * value / 100
    else: return value`,
      },
    ],
    [
      'convert_ussensor_distance_back',
      {
        local_fn: (value, unit) => {
          switch (BlockValue.raw(unit)) {
            case CONST_CM:
              return value / 10; // cm->mm
            case CONST_INCHES:
              return value / 25.4; // in->mm
            case '%':
              return (BlockValue.raw(value) * 100) / 2000; // 100% = 2000mm
            default:
              return value;
          }
        },
        py_fn: `
def convert_ussensor_distance_back(value, unit):
    if unit == "cm": return value / 10
    elif unit == "inches": return value / 25.4
    elif unit == "%": return value * 100 / 2000
    else: return value`,
      },
    ],

    [
      'convert_hub_orientation',
      {
        local_fn: value =>
          'Side.' + BlockValue.value(value)?.replace('side', '').toUpperCase(),
        py_fn: `
def convert_hub_orientation(value):
    return 'Side.' + BlockValue.value(value)?.replace('side', '').toUpperCase()`,
      },
    ],
    [
      'get_pupdevices',
      {
        py_fn: `
def get_pupdevices(class_type, *args):
    for port in [Port.A,Port.B,Port.C,Port.D,Port.E,Port.F]:
        try: return class_type(port, *args)
        except: pass`,
      },
      //TODO: wip, this returns the first one - LEGO should use ALL
    ],
    [
      'pupdevice_type',
      {
        py_fn: `
def pupdevice_type(port):
    try: return PUPDevice(port).info()['id']
    except: return None`,
      },
    ],
  ]

  // num_eval: {
  //   local_fn: num_eval,
  //   local_dynamic_fn: num_eval,
  // },
);

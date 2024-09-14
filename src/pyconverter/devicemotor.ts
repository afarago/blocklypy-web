import { BlockValue } from './blockvalue';
import { DeviceOnPortBase, setup_devices_registry } from './device';
import helpers from './helpers';
import imports from './imports';
import { CONST_AUTO_PORT } from './utils';

export class DeviceMotor extends DeviceOnPortBase {
  _default_speed: BlockValue = null;
  _default_then: string = null;
  direction_cw: boolean = null;

  constructor(port: string, direction_cw: boolean) {
    super(port);
    this.direction_cw = direction_cw;
    this._default_speed = helpers.use('convert_speed')?.call(50);
    this._default_then = null;
  }
  static devicename_from_port(port: string) {
    return `motor_${port.toLowerCase()}`;
  }
  static instance(port: string, direction_cw?: boolean) {
    const devname = DeviceMotor.devicename_from_port(port);
    let elem = setup_devices_registry.get(devname) as DeviceMotor;
    if (!elem) {
      elem = new DeviceMotor(port, direction_cw);
      setup_devices_registry.set(devname, elem);
    } else {
      elem.direction_cw = direction_cw ?? elem.direction_cw;
    }
    return elem;
  }
  get_speed(value?: number) {
    return !value ? this._default_speed : value;
  }
  get_then() {
    return this._default_then;
  }
  set default_speed(value) {
    this._default_speed = value;
  }
  get default_speed() {
    return this._default_speed;
  }
  get default_speed_variable() {
    return `default_speeds[${this.devicename}]`;
  }
  set default_then(value: string) {
    this._default_then = value;
  }
  get devicename() {
    return DeviceMotor.devicename_from_port(this.port);
  }
  static isDefaultSpeedVariablesAdded = false;
  setup_code() {
    const setup_code = super.setup_code();
    const sensor_class = 'Motor';
    const args: string[] =
      this.direction_cw !== false ? [] : ['Direction.COUNTERCLOCKWISE'];

    imports.use('pybricks.parameters', 'Direction');
    imports.use('pybricks.pupdevices', sensor_class);
    if (!DeviceMotor.isDefaultSpeedVariablesAdded) {
      DeviceMotor.isDefaultSpeedVariablesAdded = true;
      setup_code.push('default_speeds = {}');
    }

    setup_code.push(
      ...[
        `${this.devicename} = ${
          this.port !== CONST_AUTO_PORT
            ? `${sensor_class}(${[this.portString].concat(args).join(', ')})`
            : `${helpers.use('get_pupdevices').call([sensor_class].concat(args).join(', ')).raw}`
        }`,
        `${this.default_speed_variable} = ${this.default_speed.raw}`,
      ]
    );
    return setup_code;
  }
}

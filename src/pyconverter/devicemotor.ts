import * as Imports from './imports';
import * as Helpers from './helpers';
import { DeviceOnPortBase, setup_devices_registry } from './device';
import { BlockValue } from './blockvalue';

export class DeviceMotor extends DeviceOnPortBase {
  _default_speed: BlockValue = null;
  _default_then: string = null;
  direction_cw: boolean = null;

  constructor(port: string, direction_cw: boolean) {
    super(port);
    this.direction_cw = direction_cw;
    this._default_speed = Helpers.get('convert_speed', 50);
    this._default_then = null;
  }
  static devicename_from_port(port: string) {
    return `motor_${port.toLowerCase()}`;
  }
  static instance(port: string, direction_cw?: boolean) {
    const devname = DeviceMotor.devicename_from_port(port);
    let elem = setup_devices_registry[devname] as DeviceMotor;
    if (!elem) {
      elem = setup_devices_registry[devname] = new DeviceMotor(
        port,
        direction_cw
      );
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
    return `${this.devicename}_default_speed`;
  }
  set default_then(value: string) {
    this._default_then = value;
  }
  get devicename() {
    return DeviceMotor.devicename_from_port(this.port);
  }
  setup_code() {
    Imports.use('pybricks.parameters', 'Direction');
    Imports.use('pybricks.pupdevices', 'Motor');
    return [
      `${this.devicename} = Motor(Port.${this.port}${this.direction_cw ? '' : ', Direction.COUNTERCLOCKWISE'})`,
      `${this.default_speed_variable} = ${this.default_speed.raw}`,
    ];
  }
}

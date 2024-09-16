import imports from './imports';
import helpers from './helpers';
import { DeviceBase, setup_devices_registry } from './device';
import { DeviceMotor } from './devicemotor';

//TODO: add wheel diameter/axle_track seeing in between
// init and use default (A,B,55.7,114), yet be ready to change and reinit objects along teh code
const DEFAULT_ROTATION_DISTANCE = 175;
const DEFAULT_WHEEL_DIAMETER = 55.7;
const DEFAULT_AXLE_TRACK = 117;
export class DeviceDriveBase extends DeviceBase {
  _ports: any;
  _wheel_diameter: any;
  _axle_track: any;
  _default_then: null;
  _rotation_distance: number;
  motor_left: any;
  motor_right: any;
  isExplicitlyUsed: boolean;
  constructor(
    ports: any,
    wheel_diameter: any,
    axle_track: any,
    isExplicitlyUsed = true
  ) {
    super();
    this._ports = ports;
    this._wheel_diameter = wheel_diameter;
    this._axle_track = axle_track;
    this._default_then = null;
    this.isExplicitlyUsed = isExplicitlyUsed; // DeviceDriveBase might be "preregistered" to default ports if not explicitely specified - we only add it if it really used later
  }
  static DEVICENAME = 'drivebase';
  static instance(
    ports?: string[] | null,
    wheel_diameter?: any,
    axle_track?: any,
    isExplicitlyUsed = true
  ) {
    let elem = setup_devices_registry.get(
      DeviceDriveBase.DEVICENAME
    ) as DeviceDriveBase;
    if (!elem) {
      elem = new DeviceDriveBase(
        ports,
        wheel_diameter,
        axle_track,
        isExplicitlyUsed
      );
      setup_devices_registry.set(DeviceDriveBase.DEVICENAME, elem);
    } else {
      elem.ports = ports ?? elem._ports;
      elem.wheel_diameter = wheel_diameter ?? elem._wheel_diameter;
      elem.axle_track = axle_track ?? elem._axle_track;
      if (!elem.isExplicitlyUsed) elem.isExplicitlyUsed = isExplicitlyUsed;
    }
    return elem;
  }
  get_then() {
    return this._default_then;
  }
  get default_speed_variable() {
    // default_speeds is anyhow added with motors
    return `default_speeds[${this.devicename}]`;
  }
  set default_then(value: any) {
    this._default_then = value;
  }
  get wheel_diameter() {
    return this._wheel_diameter ?? DEFAULT_WHEEL_DIAMETER;
  }
  set wheel_diameter(value) {
    this._wheel_diameter = value;
  }
  get rotation_distance() {
    return this._rotation_distance ?? DEFAULT_ROTATION_DISTANCE;
  }
  set rotation_distance(value: number) {
    this._rotation_distance = value;
  }
  get rotation_distance_variable() {
    return `${this.devicename}_rotation_distance`;
  }
  get axle_track() {
    return this._axle_track ?? DEFAULT_AXLE_TRACK;
  }
  set axle_track(value) {
    this._axle_track = value;
  }
  get devicename() {
    return DeviceDriveBase.DEVICENAME;
  }
  get dependencies() {
    this.ensure_dependencies();
    return [this.motor_left, this.motor_right];
  }
  get ports() {
    return this._ports || ['A', 'B'];
  }
  set ports(value) {
    this._ports = value;
  }
  setup_code() {
    if (!this.isExplicitlyUsed) return;

    const setup_code = super.setup_code();
    setup_code.push(
      ...[
        `${this.devicename} = DriveBase(${this.motor_left.devicename}, ${this.motor_right.devicename}, ${this.wheel_diameter}, ${this.axle_track})`,
        // `${this.rotation_distance_variable} = ${this.rotation_distance}`,
        `${this.default_speed_variable} = ${helpers.use('convert_speed')?.call(50).raw}`,
      ]
    );
    return setup_code;
  }
  ensure_dependencies() {
    if (!this.isExplicitlyUsed) return;

    const genMotor = (port: string, cw: boolean) => {
      const dev = DeviceMotor.instance(port, cw);
      dev.ensure_dependencies();
      return dev;
    };

    imports.use('pybricks.robotics', 'DriveBase');
    this.motor_left = genMotor(this.ports[0], false);
    this.motor_right = genMotor(this.ports[1], true);
  }
}

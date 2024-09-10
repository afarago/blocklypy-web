import * as Imports from './imports';
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
  _default_speed: any;
  _default_then: null;
  _rotation_distance: number;
  motor_left: any;
  motor_right: any;
  constructor(ports: any, wheel_diameter: any, axle_track: any) {
    super();
    this._ports = ports;
    this._wheel_diameter = wheel_diameter;
    this._axle_track = axle_track;
    this._default_speed = helpers.get('convert_speed')?.call(50);
    this._default_then = null;
  }
  static DEVICENAME = 'drivebase';
  static instance(
    ports?: string[] | null,
    wheel_diameter?: any,
    axle_track?: any
  ) {
    let elem = setup_devices_registry.get(
      DeviceDriveBase.DEVICENAME
    ) as DeviceDriveBase;
    if (!elem) {
      Imports.use('pybricks.robotics', 'DriveBase');
      elem = new DeviceDriveBase(ports, wheel_diameter, axle_track);
      setup_devices_registry.set(DeviceDriveBase.DEVICENAME, elem);
    } else {
      // TODO: init/reinit motors??
      elem.ports = ports ?? elem._ports;
      elem.wheel_diameter = wheel_diameter ?? elem._wheel_diameter;
      elem.axle_track = axle_track ?? elem._axle_track;
    }
    return elem;
  }
  get_speed(value: any) {
    return value === null ? this.default_speed : value;
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
    // const port_left = this.ports[0];
    // const port_right = this.ports[1];
    // this.motor_left = DeviceMotor.instance(port_left, false);
    // this.motor_right = DeviceMotor.instance(port_right);
    return [
      `${this.devicename} = DriveBase(${this.motor_left.devicename}, ${this.motor_right.devicename}, ${this.wheel_diameter}, ${this.axle_track})`,
      // `${this.rotation_distance_variable} = ${this.rotation_distance}`,
      `${this.default_speed_variable} = ${this.default_speed.raw}`,
    ];
  }
  ensure_dependencies() {
    const port_left = this.ports[0];
    const port_right = this.ports[1];

    this.motor_left = DeviceMotor.instance(port_left, false);
    this.motor_left.ensure_dependencies();

    this.motor_right = DeviceMotor.instance(port_right, true);
    this.motor_right.ensure_dependencies();
  }
}

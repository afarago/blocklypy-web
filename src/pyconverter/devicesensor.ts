import * as Imports from './imports';
import { DeviceOnPortBase, setup_devices_registry } from "./device";

export class DeviceSensor extends DeviceOnPortBase {
  _sensor_class = null;
  constructor(port, sensor_class) {
    super(port);
    this._sensor_class = sensor_class;
  }
  static devicename_from_port(port, sensor_class) {
    return `${sensor_class ? sensor_class.toLowerCase() : 'sensor'}_${port.toLowerCase()}`;
  }
  static instance(port, sensor_class = 'PUPDevice') {
    const devname = DeviceSensor.devicename_from_port(port, sensor_class);
    let elem = setup_devices_registry[devname];
    if (!elem) {
      Imports.use(
        sensor_class === 'PUPDevice'
          ? 'pybricks.iodevices'
          : 'pybricks.pupdevices',
        sensor_class
      );
      elem = setup_devices_registry[devname] = new DeviceSensor(
        port,
        sensor_class
      );
    } else {
      // NOOP
    }
    return elem;
  }
  get devicename() {
    return DeviceSensor.devicename_from_port(this.port, this._sensor_class);
  }
  setup_code() {
    const setup_code = `${this.devicename} = ${this._sensor_class}(Port.${this.port})`;

    return [setup_code];
  }
}

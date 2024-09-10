import imports from './imports';
import { DeviceOnPortBase, setup_devices_registry } from './device';

export class DeviceSensor extends DeviceOnPortBase {
  _sensor_class: string = null;
  constructor(port: string, sensor_class?: string) {
    super(port);
    this._sensor_class = sensor_class;
  }
  static devicename_from_port(port: string, sensor_class?: string) {
    return `${sensor_class ? sensor_class.toLowerCase() : 'sensor'}_${port.toLowerCase()}`;
  }
  static instance(port: string, sensor_class = 'PUPDevice') {
    const devname = DeviceSensor.devicename_from_port(port, sensor_class);
    let elem = setup_devices_registry.get(devname);
    if (!elem) {
      imports.use(
        sensor_class === 'PUPDevice'
          ? 'pybricks.iodevices'
          : 'pybricks.pupdevices',
        sensor_class
      );
      elem = new DeviceSensor(port, sensor_class);
      setup_devices_registry.set(devname, elem);
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

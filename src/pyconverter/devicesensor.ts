import imports from './imports';
import { DeviceOnPortBase, setup_devices_registry } from './device';
import helpers from './helpers';
import { CONST_AUTO_PORT } from './utils';

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
    const setup_code = super.setup_code();
    const sensor_class = this._sensor_class;
    const args: string[] = [];

    imports.use('pybricks.pupdevices', sensor_class);
    setup_code.push(
      ...[
        `${this.devicename} = ${
          this.port !== CONST_AUTO_PORT
            ? `${sensor_class}(${[this.portString].concat(args).join(', ')})`
            : `${helpers.use('get_pupdevices').call([sensor_class].concat(args).join(', ')).raw}`
        }`,
      ]
    );
    return setup_code;
  }
}

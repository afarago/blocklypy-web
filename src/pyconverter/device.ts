import * as Imports from './imports';
import * as Helpers from './helpers';

export const setup_devices_registry: Record<string, DeviceBase> = {};

export class DeviceBase {
  constructor() {}
  get devicename(): string | null {
    return null;
  }
  setup_code(): string[] {
    return [];
  }
  get dependencies(): DeviceBase[] {
    return [];
  }
}

export class DeviceOnPortBase extends DeviceBase {
  port: string = null;
  constructor(port: string) {
    super();
    this.port = port;
    Imports.use('pybricks.parameters', 'Port');
  }
  ensure_dependencies() {
    // NOOP
  }
}

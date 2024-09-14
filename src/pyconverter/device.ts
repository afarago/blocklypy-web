import imports from './imports';

export const setup_devices_registry = new Map<string, DeviceBase>();

export class DeviceBase {
  _ports: string[];
  _wheel_diameter: any;
  _axle_track: any;
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
  ensure_dependencies() {
    // NOOP
  }
}

export class DeviceOnPortBase extends DeviceBase {
  port: string = null;
  constructor(port: string) {
    super();
    this.port = port;
    imports.use('pybricks.parameters', 'Port');
  }
  get portString(): string {
    return `Port.${this.port}`;
  }
  setup_code(): string[] {
    return super.setup_code();
  }
}

export function setup_devices_clear() {
  //TODO: move to session handling
  setup_devices_registry.clear();
}

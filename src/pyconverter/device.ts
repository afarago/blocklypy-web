import getContext from './context';

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
  static createRegistry() {
    return new Map<string, DeviceBase>();
  }
}

export class DeviceOnPortBase extends DeviceBase {
  port: string = null;
  constructor(port: string) {
    super();
    this.port = port;
    getContext().imports.use('pybricks.parameters', 'Port');
  }
  get portString(): string {
    return DeviceOnPortBase.portToString(this.port);
  }
  static portToString(port: string): string {
    return `Port.${port}`;
  }
  setup_code(): string[] {
    return super.setup_code();
  }
}

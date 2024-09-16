import { RegistryManager } from './registrymanager';
import { sanitize } from './utils';

export class BroadcastRegistryPayload {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  get_code(functions: string[]) {
    return `${this.get_pyname()} = Message([${functions.join(', ')}])`;
  }

  get_pyname() {
    return `message_${sanitize(this.name)}`;
  }

  static createRegistry() {
    return new RegistryManager(
      (name: string) => new BroadcastRegistryPayload(name)
    );
  }
}

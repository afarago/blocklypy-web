import { RegistryManager } from './registrymanager';
import { sanitize } from './utils';

export class BroadcastEntry {
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
}

const broadcasts = new RegistryManager(
  (name: string) => new BroadcastEntry(name)
);
export default broadcasts;

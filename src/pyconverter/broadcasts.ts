import { RegistryManager } from './registrymanager';
export class BroadcastEntry {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  get_code(functions: string[]) {
    return `${this.get_pyname()} = Message([${functions.join(', ')}])`;
  }

  get_pyname() {
    return `message_${BroadcastEntry.sanitize(this.name)}`;
  }

  private static sanitize(key: string) {
    key = key
      ?.trim()
      .replace(/[ .-]/gim, '_')
      .replace(/[^a-zA-Z0-9_]/gim, '')
      .toLowerCase();
    // TODO: select only valid e.g. must start with char
    // TODO: check uniqueness
    // TODO: add prefix
    return key;
  }
}

const broadcasts = new RegistryManager<BroadcastEntry>(
  name => new BroadcastEntry(name)
);
export default broadcasts;

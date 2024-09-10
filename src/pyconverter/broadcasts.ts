import { RegistryEntry, RegistryManager } from './registrymanager';
export class BroadcastEntry extends RegistryEntry {
  name: string;
  code: string[];

  constructor(id: string, name: string = null, code: string[] = []) {
    super(id);
    this.name = name;
    this.code = code;
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

export const broadcasts = new RegistryManager<BroadcastEntry>(
  (id, name) => new BroadcastEntry(id, name)
);

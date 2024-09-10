export class RegistryEntry {
  id: string;
  constructor(id: string) {
    this.id = id;
  }
}

export class RegistryManager<T extends RegistryEntry> {
  private registry = new Map<string, T>();
  private factory: (...args: any[]) => T;

  constructor(factory: (...args: any[]) => T) {
    this.factory = factory;
  }

  get(id: string): T {
    return this.registry.get(id);
  }

  has(key: string) {
    return this.registry.has(key);
  }
  use(id: string, name: string): T {
    if (!this.registry.has(id)) {
      //const entry = new T(id);
      const entry = this.factory(id, name);
      // entry.id = id;
      this.registry.set(id, entry);
      return entry as T;
    } else {
      return this.registry.get(id) as T;
    }
  }

  clear() {
    this.registry.clear();
  }
}

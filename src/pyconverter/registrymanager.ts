class RegistryEntry<T> {
  id: string;
  payload: T;
  constructor(id: string, payload: T) {
    this.id = id;
    this.payload = payload;
  }
}

export class RegistryManager<T> {
  private registry = new Map<string, RegistryEntry<T>>();
  private factory: (...args: any[]) => T;

  constructor(factory: (...args: any[]) => T) {
    this.factory = factory;
  }

  get(id: string): T {
    return this.registry.get(id)?.payload;
  }

  has(id: string) {
    return this.registry.has(id);
  }

  use(id: string, ...args: any[]): T {
    if (!this.registry.has(id)) {
      const payload = this.factory(...args);
      const entry = new RegistryEntry<T>(id, payload);
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

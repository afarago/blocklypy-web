class RegistryEntry<T> {
  id: string;
  payload: T;
  constructor(id: string, payload: T) {
    this.id = id;
    this.payload = payload;
  }
}

export interface RegistryEntryWithUse {
  use(...args: any[]): void;
}
export interface RegistryEntryWithId {
  id: string;
}

function isRegistryEntryWithUse(obj: any): obj is RegistryEntryWithUse {
  return obj && typeof obj.use === 'function';
}
function isRegistryEntryWithId(obj: any): obj is RegistryEntryWithId {
  return obj;
}

export class RegistryManager<T> {
  private registry = new Map<string, RegistryEntry<T>>();
  private factory: (...args: any[]) => T;

  constructor(factory?: (...args: any[]) => T) {
    this.factory = factory;
  }

  get(id: string): T {
    return this.registry.get(id)?.payload;
  }

  has(id: string): boolean {
    return this.registry.has(id);
  }

  use(id: string, ...args: any[]): T {
    let entry: RegistryEntry<T> = this.registry.get(id);
    if (!entry) {
      const payload =
        typeof this.factory === 'function' ? this.factory(...args) : args[0];
      if (isRegistryEntryWithId(payload)) payload.id = id;
      entry = new RegistryEntry<T>(id, payload);
      this.registry.set(id, entry);
    } else {
      if (entry.payload && isRegistryEntryWithUse(entry.payload)) {
        entry.payload.use(...args);
      }
    }
    return entry.payload;
  }

  entries(): [string, RegistryEntry<T>][] {
    return [...this.registry.entries()];
  }
  values(): RegistryEntry<T>[] {
    return [...this.registry.values()];
  }
  payloads(): T[] {
    return [...this.registry.values()].map(elem => elem.payload);
  }
  keys(): string[] {
    return [...this.registry.keys()];
  }

  clear(): void {
    this.registry.clear();
  }
}

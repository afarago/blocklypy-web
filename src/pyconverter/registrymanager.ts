type RegistryEntryIdType = string | any[];
class RegistryEntry<T> {
  id: string;
  payload: T;
  constructor(id: RegistryEntryIdType, payload: T) {
    this.id = RegistryEntry.idToString(id);
    this.payload = payload;
  }
  static idToString(id: RegistryEntryIdType) {
    return typeof id === 'string' ? id : JSON.stringify(id);
  }
}
export interface RegistryEntryWithUse {
  use(...args: any[]): void;
}
export interface RegistryEntryWithId {
  id: RegistryEntryIdType;
}
export interface RegistryEntryWithParent<T> {
  parent: RegistryManager<T>;
}

function isRegistryEntryWithUse(obj: any): obj is RegistryEntryWithUse {
  return obj && typeof obj.use === 'function';
}
function isRegistryEntryWithId(obj: any): obj is RegistryEntryWithId {
  return obj;
}
function isRegistryEntryWithParent<T>(
  obj: any
): obj is RegistryEntryWithParent<T> {
  return obj;
}

export class RegistryManager<T> {
  private registry = new Map<string, RegistryEntry<T>>();
  private factory: (...args: any[]) => T;

  constructor(factory?: (...args: any[]) => T) {
    this.factory = factory;
  }

  get(id: RegistryEntryIdType): T {
    return this.registry.get(RegistryEntry.idToString(id))?.payload;
  }

  has(id: RegistryEntryIdType): boolean {
    return this.registry.has(RegistryEntry.idToString(id));
  }

  use(id: RegistryEntryIdType, ...args: any[]): T {
    let entry: RegistryEntry<T> = this.registry.get(
      RegistryEntry.idToString(id)
    );
    if (!entry) {
      const payload =
        typeof this.factory === 'function' ? this.factory(...args) : args[0];
      if (isRegistryEntryWithId(payload)) payload.id = id;
      if (isRegistryEntryWithParent(payload)) payload.parent = this;
      entry = new RegistryEntry<T>(id, payload);
      this.registry.set(RegistryEntry.idToString(id), entry);
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
  clear(): void {
    this.registry.clear();
  }
}

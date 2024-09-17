import { RegistryManager, RegistryPayloadWithUse } from './registrymanager';
export class ImportRegistryPayload implements RegistryPayloadWithUse {
  importedItems: Set<string> = new Set();
  constructor(...importedItems: string[]) {
    this.use(importedItems);
  }

  use(...importedItems: any[]) {
    importedItems.forEach(elem => {
      if (elem !== undefined && elem !== null) this.importedItems.add(elem);
    });
  }

  static to_global_code(
    registry: RegistryManager<ImportRegistryPayload>
  ): string[] {
    return Array.from(
      registry
        .entries()
        .sort(([akey, _aval]: [string, any], [bkey, _bval]: [string, any]) =>
          akey.localeCompare(bkey)
        )
    ).map(([key, value]) =>
      value?.payload?.importedItems.size > 0
        ? `from ${key} import ` +
          Array.from(value?.payload?.importedItems.keys()).join(', ')
        : `import ${key}`
    );
  }

  static createRegistry() {
    return new RegistryManager(
      (...args: any[]) => new ImportRegistryPayload(...args)
    );
  }
}

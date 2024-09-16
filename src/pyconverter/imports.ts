import { RegistryPayloadWithUse, RegistryManager } from './registrymanager';
export class ImportRegistryPayload implements RegistryPayloadWithUse {
  importedItems: Set<string> = new Set();
  constructor(...importedItems: string[]) {
    this.use(importedItems);
  }

  use(...importedItems: any[]) {
    importedItems.forEach(elem => this.importedItems.add(elem));
  }

  static to_global_code(
    registry: RegistryManager<ImportRegistryPayload>
  ): string[] {
    return Array.from(registry.entries()).map(([key, value]) =>
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

import { RegistryEntryWithUse, RegistryManager } from './registrymanager';
export class ImportRegistryEntry implements RegistryEntryWithUse {
  importedItems: Set<string> = new Set();
  constructor(...importedItems: string[]) {
    // debug('>>>> ImportRegistryEntry.constructor', importedItems);
    importedItems.forEach(elem => this.importedItems.add(elem));
  }

  use(...importedItems: any[]) {
    // debug('>>>> ImportEntry.use', this.importedItems, importedItems);
    importedItems.forEach(elem => this.importedItems.add(elem));
  }

  // export function use(module: string, item: string) {
  //   if (!registry.has(module)) registry.set(module, new Set());
  //   if (item) registry.get(module).add(item);
  // }

  static to_global_code(
    registry: RegistryManager<ImportRegistryEntry>
  ): string[] {
    return Array.from(registry.entries()).map(([key, value]) =>
      value?.payload?.importedItems.size > 0
        ? `from ${key} import ` +
          Array.from(value?.payload?.importedItems.keys()).join(', ')
        : `import ${key}`
    );
  }
}

const imports = new RegistryManager(
  (...args: any[]) => new ImportRegistryEntry(...args)
);
export default imports;

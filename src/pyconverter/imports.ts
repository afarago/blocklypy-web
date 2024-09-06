export class Imports {
  static REGISTRY = new Map<string, Set<string>>();

  static use(module: string, item: string) {
    if (!this.REGISTRY.has(module)) this.REGISTRY.set(module, new Set());
    if (item) this.REGISTRY.get(module).add(item);
  }

  static to_global_code() {
    return Array.from(this.REGISTRY.entries()).map(([key, items]) =>
      items.size > 0
        ? `from ${key} import ` + Array.from(items.keys()).join(', ')
        : `import ${key}`
    );
  }
}

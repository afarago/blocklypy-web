export class Imports {
  static REGISTRY = {};

  static use(module: string, item: string) {
    if (!this.REGISTRY[module]) this.REGISTRY[module] = new Set([]);
    if (item) this.REGISTRY[module].add(item);
  }

  static to_global_code() {
    return Object.entries(this.REGISTRY).map(([key, items]: [any, any]) =>
      items.size > 0
        ? `from ${key} import ` + Array.from(items.keys()).join(', ')
        : `import ${key}`
    );
  }
}

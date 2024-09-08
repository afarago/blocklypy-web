const registry = new Map<string, Set<string>>();

export function use(module: string, item: string) {
  if (!registry.has(module)) registry.set(module, new Set());
  if (item) registry.get(module).add(item);
}

export function to_global_code() {
  return Array.from(registry.entries()).map(([key, items]) =>
    items.size > 0
      ? `from ${key} import ` + Array.from(items.keys()).join(', ')
      : `import ${key}`
  );
}

export function clear() {
  //TODO: move to session handling
  registry.clear();
}

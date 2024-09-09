export type ProcedureArg = { name: string; id: string; type: string };
export class ProcedureDefinition {
  id: string;
  name: string;
  args: Map<string, ProcedureArg>;

  constructor(id: string, name: string, args: Map<string, ProcedureArg>) {
    this.id = id;
    this.name = name;
    this.args = args;
  }

  getPyName(functionPrefix?: string) {
    return `${functionPrefix ?? ''}${this.name}`;
  }

  getPyDefinition(functionPrefix?: string) {
    const signature_params = [...this.args.values()].map(
      elem => `${elem.name}: ${elem.type}`
    );

    return `${this.getPyName(functionPrefix)}(${signature_params.join(', ')})`;
  }
}

export const registry = new Map<string, ProcedureDefinition>();

export function register(input: ProcedureDefinition) {
  const elem = registry.get(input.id);
  if (!elem) registry.set(input.id, input);

  return elem;
}

export function get(key: string) {
  return registry.get(key);
}

export function sanitize(key: string) {
  // TODO: select only valid e.g. must start with char
  key = key
    .trim()
    .replace(/[ .-]/gim, '_')
    .replace(/[^a-zA-Z0-9_]/gim, '')
    .toLowerCase();
  return key;
}

export function clear() {
  //TODO: move to session handling
  registry.clear();
}

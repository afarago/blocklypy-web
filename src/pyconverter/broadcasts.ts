const registry = new Map<string, string[]>();

export function has(key: string) {
  return registry.has(key);
}

export function add_stack(key: string, stack_fn: string) {
  if (!registry.has(key)) registry.set(key, []);
  const elem = registry.get(key) || [];
  elem.push(stack_fn);

  return `${get_pyname(key)}.add_stack_fn(${stack_fn})`;
}

export function get_code(key: string) {
  return `${get_pyname(key)} = Message()`;
}

export function get_pyname(key: string) {
  return `message_${key}`;
}

export function sanitize(key: string) {
  key = key.replace(/[^a-zA-Z0-9_]/gim, '').toLowerCase();
  // TODO: select only valid e.g. must start with char
  // TODO: check uniqueness
  // TODO: add prefix
  return key;
}

// static to_global_code() {
// }

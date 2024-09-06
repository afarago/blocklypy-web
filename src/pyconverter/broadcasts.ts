type Entry = {
  id: string;
  name: string;
  pyname: string;
  code: string[];
};
const registry = new Map<string, Entry>();
//TODO: rebase registry for id instead of name

export function has(key: string) {
  return registry.has(key);
}

export function use(id: string, key: string) {
  if (!registry.has(key))
    registry.set(key, { id, name: key, pyname: sanitize(key), code: [] });
  return registry.get(key);
}

export function add_stack(id: string, key: string, stack_fn: string) {
  const entry = use(id, key);
  entry.code.push(stack_fn);

  return `${get_pyname(key)}.add_stack_fn(${stack_fn})`;
}

export function get_code(key: string) {
  return `${get_pyname(key)} = Message()`;
}

export function get_pyname(key: string) {
  return `message_${key}`;
}

export function sanitize(key: string) {
  key = key
    .trim()
    .replace(/[ .-]/gim, '_')
    .replace(/[^a-zA-Z0-9_]/gim, '')
    .toLowerCase();
  // TODO: select only valid e.g. must start with char
  // TODO: check uniqueness
  // TODO: add prefix
  return key;
}

// static to_global_code() {
// }

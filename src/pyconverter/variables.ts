import { BlockValue } from './blockvalue';

type VariableRegistryType = {
  value: string | BlockValue;
  is_list: boolean;
  py_name_base: string;
  py_name_unique: string;
};

const registry = new Map<string, VariableRegistryType>();

// function isUnique(name: string) {
//   return ![...registry.values()].some(
//     item => item.py_name_unique === name
//   );
// }

export function use(
  name: string,
  default_value: string | BlockValue = null,
  is_list = false
) {
  let elem = registry.get(name);
  if (!elem) {
    const py_name_base = `global_${sanitize(name)}`;
    const py_name_unique = ((py_name_base: string) => {
      const duplicatesCount = [...registry.values()].filter(
        item =>
          item.py_name_base === py_name_base ||
          item.py_name_unique === py_name_base
      ).length;
      // TODO: might have clash, e.g list and var name are the same, but also others
      return !duplicatesCount
        ? py_name_base
        : `${py_name_base}_x${duplicatesCount + 1}`;
    })(py_name_base);

    elem = {
      value: default_value,
      is_list,
      py_name_base,
      py_name_unique,
    };
    registry.set(name, elem);
  }
  return elem.py_name_unique;
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

export function convert(name: string, is_list = false) {
  return use(name, null, is_list);
}

export function to_global_code() {
  return Array.from(registry.entries()).map(
    ([key, value]: [string, VariableRegistryType]) =>
      `${convert(key)} = ${value.value || (!value.is_list ? 'None' : '[]')}`
  );
}

export function clear() {
  //TODO: move to session handling
  registry.clear();
}

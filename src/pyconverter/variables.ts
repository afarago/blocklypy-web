import { BlockValue } from './blockvalue';
import {
  RegistryEntryWithId,
  RegistryEntryWithParent,
  RegistryManager,
} from './registrymanager';
import { _debug, sanitize } from './utils';

type VariableRegistryEntryIdType = string | [string, boolean];
export class VariableRegistryEntry
  implements
    RegistryEntryWithId,
    RegistryEntryWithParent<VariableRegistryEntry>
{
  id: VariableRegistryEntryIdType; //id=name: string;
  value: string | BlockValue;
  is_list: boolean;
  py_name_base: string;
  py_name_unique: string;
  parent: RegistryManager<VariableRegistryEntry>;

  constructor(value: string | BlockValue, is_list: boolean) {
    this.value = value;
    this.is_list = is_list;
  }

  generateUniqueName() {
    const name = typeof this.id === 'string' ? this.id : this.id[0];
    this.py_name_base = `global_${sanitize(name)}`;
    this.py_name_unique = ((py_name_base: string) => {
      const duplicatesCount = [...this.parent.values()].filter(
        item =>
          item.payload.py_name_base === py_name_base ||
          item.payload.py_name_unique === py_name_base
      ).length;
      // TODO: might have clash, e.g list and var name are the same, but also others
      return duplicatesCount <= 1
        ? py_name_base
        : `${py_name_base}_${duplicatesCount}`;
    })(this.py_name_base);
  }

  static to_global_code(registry: RegistryManager<VariableRegistryEntry>) {
    return Array.from(registry.entries()).map(
      ([_, value]) =>
        `${value.payload.py_name_unique} = ${value.payload.value || (!value.payload.is_list ? 'None' : '[]')}`
    );
  }
}

const variables = new RegistryManager<VariableRegistryEntry>(
  (value: string | BlockValue, is_list: boolean) =>
    new VariableRegistryEntry(value, is_list)
);
export default variables;

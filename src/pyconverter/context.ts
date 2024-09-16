import { RegistryManager } from './registrymanager';
import { ImportRegistryPayload } from './imports';
import { BroadcastRegistryPayload } from './broadcasts';
import { VariableRegistryPayload } from './variables';
import { ProcedureRegistryPayload } from './procedures';
import { HelperEnabledRegistryPayload } from './helpers';
import { DeviceBase } from './device';
import { _debug } from './utils';

export class GlobalContext {
  imports: RegistryManager<ImportRegistryPayload>;
  broadcasts: RegistryManager<BroadcastRegistryPayload>;
  variables: RegistryManager<VariableRegistryPayload>;
  procedures: RegistryManager<ProcedureRegistryPayload>;
  helpers: RegistryManager<HelperEnabledRegistryPayload>;
  setup_devices_registry: Map<string, DeviceBase>;

  constructor() {
    this.imports = ImportRegistryPayload.createRegistry();
    this.broadcasts = BroadcastRegistryPayload.createRegistry();
    this.variables = VariableRegistryPayload.createRegistry();
    this.procedures = ProcedureRegistryPayload.createRegistry();
    this.helpers = HelperEnabledRegistryPayload.createRegistry();
    this.setup_devices_registry = DeviceBase.createRegistry();
  }
}

let context: GlobalContext = undefined;
export function newContext() {
  context = new GlobalContext();
  return context;
}
export default function getContext() {
  return context;
}

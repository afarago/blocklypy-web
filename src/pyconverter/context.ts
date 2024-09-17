import { RegistryManager } from './registrymanager';
import { ImportRegistryPayload } from './imports';
import { BroadcastRegistryPayload } from './broadcasts';
import { VariableRegistryPayload } from './variables';
import { ProcedureRegistryPayload } from './procedures';
import { HelperEnabledRegistryPayload } from './helpers';
import { DeviceBase } from './device';
import { _debug } from './utils';

interface Context {
  imports: RegistryManager<ImportRegistryPayload>;
  broadcasts: RegistryManager<BroadcastRegistryPayload>;
  variables: RegistryManager<VariableRegistryPayload>;
  procedures: RegistryManager<ProcedureRegistryPayload>;
  helpers: RegistryManager<HelperEnabledRegistryPayload>;
  setup_devices_registry: Map<string, DeviceBase>;
}

export class GlobalContext implements Context {
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
export class GlobalContextManager {
  _contextProxyFn: () => Context | undefined;
  _defaultContext: Context;

  constructor() {
    // default single threaded context generator, prone to clashes in multi-threaded environments
    this._contextProxyFn = () => {
      if (!this._defaultContext) this._defaultContext = this.createContext();
      return this._defaultContext;
    };
  }

  init(contextProxyFn?: () => Context | undefined) {
    this._contextProxyFn = contextProxyFn;
  }

  createContext(): Context {
    return new GlobalContext();
  }

  _getContext(): Context {
    return this._contextProxyFn();
  }
  get imports() {
    return this._getContext().imports;
  }
  get broadcasts() {
    return this._getContext().broadcasts;
  }
  get variables() {
    return this._getContext().variables;
  }
  get procedures() {
    return this._getContext().procedures;
  }
  get helpers() {
    return this._getContext().helpers;
  }
  get setup_devices_registry() {
    return this._getContext().setup_devices_registry;
  }
}

const context = new GlobalContextManager();
export default context;

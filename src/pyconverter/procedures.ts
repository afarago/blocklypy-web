import { RegistryEntryWithId, RegistryManager } from './registrymanager';
import { _debug } from './utils';

export type ProcedureArg = { name: string; id: string; type: string };
export class ProcedureDefinition implements RegistryEntryWithId {
  id: string;
  name: string;
  blockid: string;
  args: Map<string, ProcedureArg>;

  constructor(
    id: string,
    name: string,
    blockid: string,
    args: Map<string, ProcedureArg>
  ) {
    this.id = id; // "proccode" field
    this.blockid = blockid;
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

  // static getArgDefByArgBlockId(id: string) {
  //   for (const proc of proceduresRegistry.values()) {
  //     for (const arg of proc.payload.args.values()) {
  //       if (arg.id === id) return arg;
  //     }
  //   }
  // }
}

const procedures = new RegistryManager<ProcedureDefinition>();
export default procedures;

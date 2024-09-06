export enum BlockValueType {
  NUMBER = 4,
  POSITIVENUMBER = 5,
  POSITIVEINTEGER = 6,
  INTEGER = 7,
  ANGLE = 8,
  COLOR = 9,
  STRING = 10,
  BROADCAST = 11,
  VARIABLE = 12,
  LIST = 13,
}
export type ScratchBlock = {
  opcode: string;
  next: string | null;
  parent: string | null;
  inputs: { [name: string]: BlockInput };
  fields: { [name: string]: BlockField };
  shadow: boolean;
  topLevel: boolean;
  x?: number;
  y?: number;
  comment?: string;
  mutation?: any;
};
export enum ShadowState {
  SHADOW = 1,
  NOSHADOW = 2,
  OBSCURED = 3,
}
export type BlockValueArray =
  | [
      (
        | BlockValueType.NUMBER
        | BlockValueType.POSITIVENUMBER
        | BlockValueType.POSITIVEINTEGER
        | BlockValueType.INTEGER
        | BlockValueType.ANGLE
      ),
      number | string,
      string | number,
      number,
    ]
  | [BlockValueType.COLOR | BlockValueType.STRING, string]
  | [
      BlockValueType.BROADCAST | BlockValueType.VARIABLE | BlockValueType.LIST,
      string,
      string,
    ];

type BlockValueDesciptor = string | BlockValueArray;
export type BlockInput = [
  shadowState: ShadowState,
  value: BlockValueDesciptor,
  obscuredValue: BlockValueDesciptor,
];
export type BlockField = [value: string | number | boolean, reference: string];

export type ScratchProject = {
  targets: ScratchTarget[];
  //monitors: any[];
  extensions: string[];
  meta: string[];
};
export type ScratchTarget = {
  isStage: boolean;
  name: string;
  variables: { [id: string]: [string, any, boolean?] };
  lists: { [id: string]: [string, any[]] };
  broadcasts: { [id: string]: string };
  blocks: { [id: string]: ScratchBlock }; // Define the block type based on your specific requirements
  comments: { [id: string]: any }; // Define the comment type based on your specific requirements
  currentCostume: number;
  costumes: any[]; // Define the costume type based on your specific requirements
  sounds: any[]; // Define the sound type based on your specific requirements
  layerOrder: number;
  volume: number;
};

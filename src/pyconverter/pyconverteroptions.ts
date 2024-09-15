export default interface PyConverterOptions {
  debug?: {
    showOrphanCode?: boolean;
    skipHeader?: boolean;
    skipImports?: boolean;
    skipHelpers?: boolean;
    skipSetup?: boolean;
    showBlockIds?: boolean;
    showThisStackOnly?: string;
  };
}

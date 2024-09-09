import getCurrentLine from 'get-current-line';

export const INDENT = '    ';
export const ASYNC_PLACEHOLDER = '$$ASYNC$$';
export const AWAIT_PLACEHOLDER = '$$AWAIT$$';
export const CONST_CM = 'cm';
export const CONST_INCHES = 'inches';
export const CONST_ROTATIONS = 'rotations';
export const CONST_DEGREES = 'degrees';
export const CONST_SECONDS = 'seconds';

export function get_divider(text: string, fillchar = '-', width = 80) {
  // # ------------------------------ python example ------------------------------ #
  const len = width - text.length - 6;
  return `# ${fillchar.repeat(Math.floor(len / 2))} ${text} ${fillchar.repeat(Math.ceil(len / 2))} #`;
}

export function debug(...args: any[]) {
  const prefix = getCurrentLine
    ? (() => {
        const line = getCurrentLine({ frames: +3 });
        return `at ${line?.method} (${line?.file}:${line?.line}:${line?.char})`;
      })()
    : '';
  console.log('::DEBUG::', ...args, prefix);
}

export function indent_code(value: string | string[]) {
  if (Array.isArray(value)) return value.map(line => INDENT + line);
  else return [INDENT + value];
}

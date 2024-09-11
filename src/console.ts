import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertFlipperProjectToPython } from './pyconverter/projectconverter';
import { PyConverterOptions } from './pyconverter/pyconverter';

try {
  // const __FILE__ = path.join(__dirname, '2/proj1.llsp3');
  // const __FILE__ = 'C:/Users/attil/Documents/LEGO MINDSTORMS/test1.lms';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  let __FILE__ =
    process.argv?.slice(2)?.find(elem => !elem.startsWith('-')) ?? '';
  if (__FILE__?.length === 0) {
    __FILE__ = path.join(__dirname, '../testdata/test2.lms');
  }
  console.log('::FILE::', __FILE__);

  // 'c:/Users/i066492/OneDrive - SAP SE/Documents/user_afarago/9_Personal/@EzAz/2024/fll/innovacio_projekt.lms';
  const file = fs.readFileSync(__FILE__);

  // const retval = await converter.convert(file);
  // console.log(retval);
  const option: PyConverterOptions = {
    debug: {
      skipHeader: true,
      skipHelpers: true,
      skipImports: true,
      skipSetup: true,
      // showOrphanCode: true,
      // showBlockIds: true,
      // showThisStackOnly: 'Y09;djV%E2_0:AMn^hOT',
    },
  };
  convertFlipperProjectToPython(file, option).then(retval => {
    const DEBUG_WRITE_PROJECT_JSON = !false;
    if (DEBUG_WRITE_PROJECT_JSON) {
      // write a project.json to the local dir for debug
      const data_pretty = JSON.stringify(retval.project, null, 2);
      fs.writeFileSync(
        path.join(__dirname, '..', 'temp', 'project.json'),
        data_pretty
      );
    }
    console.log(retval.pycode);
  }, null);
} catch (err) {
  console.error('::ERROR::', err);
}

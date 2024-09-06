import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertFlipperProjectToPython } from './pyconverter/projectconverter';

try {
  // const __FILE__ = path.join(__dirname, '2/proj1.llsp3');
  // const __FILE__ = 'C:/Users/attil/Documents/LEGO MINDSTORMS/test1.lms';
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  const __FILE__ = path.join(
    __dirname,
    //'testdata/test1.llsp3'
    '../testdata/test2.lms'
    //path.join(__dirname, 'testdata/test2.lms'
  );
  const file = fs.readFileSync(__FILE__);

  // const retval = await converter.convert(file);
  // console.log(retval);
  convertFlipperProjectToPython(file).then(retval => {
    // write a project.json to the local dir for debug
    // const data_pretty = JSON.stringify(retval.projectJson, null, 2);
    // fs.writeFileSync(
    //   path.join(__dirname, '..', 'temp', 'project.json'),
    //   data_pretty
    // );

    console.log(retval.pycode);
  });
} catch (err) {
  console.error('::ERROR::', err);
}

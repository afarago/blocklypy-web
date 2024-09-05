import { default as fs } from 'fs';
import { fileURLToPath } from 'url';
import { ProjectConverter } from './projectconverter';
import path from 'path';

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

  const converter = new ProjectConverter();
  const retval = await converter.convert(file);
  console.log(retval);
} catch (err) {
  console.log('>>', err); //!!
}

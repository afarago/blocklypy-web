import express from 'express';
import fileUpload, { UploadedFile } from 'express-fileupload';
import { Request, Response } from 'express';
import { convertFlipperProjectToPython } from './pyconverter/projectconverter';
import { _debug } from './pyconverter/utils';

const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

// Middleware to handle file uploads
app.use(fileUpload());

// GET route
// POST route for file upload
export const handleFileUpload = async (req: Request, res: Response) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).send('No files were uploaded.');
  }

  try {
    const file = req?.files?.file as UploadedFile;
    const fileData = file.data as Buffer;
    const retval = await convertFlipperProjectToPython(fileData, {});
    _debug('::FILE::', file.name);

    const format = req.query['format'];
    switch (format) {
      case 'json':
        return res.send(retval);
      default:
      case 'py':
        return res.send(retval.pycode);
      case 'plain':
        return res.send(retval.plaincode);
      case 'svg':
        return res.send(retval.svg);
    }
  } catch (err) {
    return res.status(400).send(err);
    //res.status(500).send('Error processing the zip file.');
  }
};
app.post('/upload', handleFileUpload);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;

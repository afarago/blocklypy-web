import express from 'express';
import fileUpload from 'express-fileupload';
import { handleFileUpload } from './handlers';

const app = express();
const port = 3000;

// Middleware to parse JSON
app.use(express.json());

// Middleware to handle file uploads
app.use(fileUpload());

// GET route
// POST route for file upload
app.post('/upload', handleFileUpload);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

export default app;

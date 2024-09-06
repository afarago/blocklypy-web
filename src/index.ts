import { ProjectConverter } from './pyconverter/projectconverter';

function handleFileUpload(file: File) {
  const reader = new FileReader();
  reader.addEventListener('load', event => {
    const input = event.target.result as ArrayBuffer;
    const converter = new ProjectConverter();
    converter.convert(input).then((output: string) => {
      const outputArea = document.getElementById('output');
      outputArea.innerText = output;
    });
  });
  reader.readAsArrayBuffer(file);
}

const dropArea = document.getElementById('upload-area');
dropArea.addEventListener('dragover', event => {
  event.stopPropagation();
  event.preventDefault();
  // Style the drag-and-drop as a "copy file" operation.
  event.dataTransfer.dropEffect = 'copy';
});

dropArea.addEventListener('drop', event => {
  event.stopPropagation();
  event.preventDefault();
  const fileList = event.dataTransfer.files;
  // console.log(fileList);
  handleFileUpload(fileList[0]);
});

const fileSelector = document.getElementById('file-selector');
fileSelector.addEventListener('change', event => {
  const target = event.target as HTMLInputElement;
  handleFileUpload(target.files[0]);
});

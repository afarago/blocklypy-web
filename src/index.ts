import { convertFlipperProjectToPython } from './pyconverter/projectconverter';

function handleFileUpload(file: File) {
  const reader = new FileReader();
  reader.addEventListener('load', event => {
    const input = event.target.result as ArrayBuffer;
    convertFlipperProjectToPython(input).then(retval => {
      // const outputArea = document.getElementById('preview_code');
      // outputArea.innerText = retval.pycode;
      $('#preview_svg').html(retval.svg);
      $('#preview_code').html(retval.pycode);

      const slotid = retval.projectInfo.slotIndex;
      const sloturl = `img/cat${slotid}.svg#dsmIcon`;
      $('#svg_program_use').attr('href', sloturl).attr('xlink:href', sloturl);

      $('#tab_dummy').addClass('d-none');
      $('#tabs_main').removeClass('d-none');
    });
  });
  reader.readAsArrayBuffer(file);
}

const dropArea = $('#maincontainer');
dropArea.on('dragover', event => {
  event.stopPropagation();
  event.preventDefault();
  dropArea.addClass('drop-active');
  event.originalEvent.dataTransfer.dropEffect = 'copy';
});
dropArea.on('dragleave', event => {
  event.stopPropagation();
  event.preventDefault();
  dropArea.removeClass('drop-active');
});
dropArea.on('drop', event => {
  event.stopPropagation();
  event.preventDefault();
  dropArea.removeClass('drop-active');
  const fileList = event.originalEvent.dataTransfer.files;
  // console.log(fileList);
  handleFileUpload(fileList[0]);
});

const fileSelector = $('#file-selector');
fileSelector.on('change', event => {
  const target = event.target as HTMLInputElement;
  handleFileUpload(target.files[0]);
});

const copyButton = $('#copy-button');
copyButton.on('click', event => {
  event.stopPropagation();
  event.preventDefault();

  const content = $('#preview_code').text();
  navigator.clipboard.writeText(content);

  copyButton.addClass('success ');
  copyButton.children().toggleClass('bi-clipboard-check bi-copy');
  setTimeout(() => {
    copyButton.removeClass('success');
    copyButton.children().toggleClass('bi-clipboard-check bi-copy');
  }, 2000);
});

import context from './pyconverter/context';
import { convertFlipperProjectToPython } from './pyconverter/projectconverter';
// import Split from 'split.js';
//import $ from 'jquery';
// import 'jqueryui';

function handleFileUpload(file: File) {
  file.arrayBuffer().then(async input => {
    const options = {};

    const contextData = context.createContext();
    context.init(() => contextData);
    convertFlipperProjectToPython(input, options).then(retval => {
      // const outputArea = document.getElementById('preview-code');
      // outputArea.innerText = retval.pycode;
      $('#preview-svg').html(retval.svg);
      $('#preview-svg-map').html(retval.svg).removeClass('d-none');
      $('#preview-pycode').html(retval.pycode);
      $('#preview-pseudocode').html(retval.plaincode);

      const slotid = retval.projectInfo.slotIndex;
      const sloturl = `img/cat${slotid}.svg#dsmIcon`;
      $('#svg-program-use').attr('href', sloturl).attr('xlink:href', sloturl);

      $('#tab-dummy').addClass('d-none');
      $('#tabs-main').removeClass('d-none');
      updateMapVisibility();
    });
  });
}

$('.example-content-button').on('click', event => {
  const path = event.target.dataset.file;
  fetch(path)
    .then(async data => {
      const data2 = await data.blob();
      const file = new File([data2], 'sample.llsp3');
      handleFileUpload(file);
    })
    .catch((error: any) => {
      console.error('>>> error', error);
    });
});

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

  ($('#file-selector').get(0) as HTMLInputElement).files = fileList;

  handleFileUpload(fileList[0]);
});

const fileSelector = $('#file-selector');
fileSelector.on('change', event => {
  const target = event.target as HTMLInputElement;
  handleFileUpload(target.files[0]);
});

$('.copy-button').on('click', event => {
  console.log('copy-button');
  event.stopPropagation();
  event.preventDefault();

  const copyButton = $(event.target.parentElement);
  const dataTarget = $(event.target.parentElement).data('target');
  const content = $('#' + dataTarget).text();
  // const content = $('#preview-pycode').text();
  // TODO: data-target
  navigator.clipboard.writeText(content);

  copyButton.addClass('success');
  copyButton.children().toggleClass('bi-clipboard-check bi-copy');
  setTimeout(() => {
    copyButton.removeClass('success');
    copyButton.children().toggleClass('bi-clipboard-check bi-copy');
  }, 2000);
});

$("a[data-bs-toggle='tab']").on('shown.bs.tab', _ => {
  updateMapVisibility();
});

function updateMapVisibility() {
  const visible = $("a[data-bs-toggle='tab'].active").attr('id') !== 'svg';
  $('#preview-svg-map').toggleClass('d-none', !visible);
}

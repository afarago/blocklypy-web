import JSZip from 'jszip';
import { convertFlipperProgramToPython } from './pyconverter';

const DEBUG_SKIP_HEADER = !false;

export async function convertFlipperProjectToPython(
  filedata: ArrayBuffer | Buffer
) {
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(filedata);
  if (!zipContent) throw 'Error loading the zip file.';

  // ========================
  const manifestFile = zipContent.file('manifest.json');
  if (!manifestFile) throw 'No manifest.json file found in the zip file.';
  const manifestContent = await manifestFile.async('string');
  const projectInfo = JSON.parse(manifestContent);
  if (projectInfo.type !== 'word-blocks')
    throw `File type should be word-blocks instead of "${projectInfo.type}"`;
  const projectComment = extractHeadComment(projectInfo);

  // ========================
  const scratch_file = await zipContent.file('scratch.sb3');
  if (!scratch_file) throw new Error('Missing scratch.sb3');
  const scratch_data = (await scratch_file?.async(
    'arraybuffer'
  )) as ArrayBuffer;
  const sb3zip = await zip.loadAsync(scratch_data);
  const projectFile = sb3zip.file('project.json');
  if (!projectFile) throw new Error('Missing project.json');

  const projectData = await projectFile.async('text');
  const projectJson = JSON.parse(projectData);

  const projectCode = convertFlipperProgramToPython(projectJson);

  // ========================
  const sections = [
    DEBUG_SKIP_HEADER ? null : projectComment,
    projectCode,
  ].filter(elem => elem);
  const retval = sections.join('\n');
  return { pycode: retval, projectJson };
}

function extractHeadComment(projectInfo: any) {
  return `
"""
Project:    ${projectInfo.name}
Slot:       ${projectInfo.slotIndex}
Created:    ${projectInfo.created}
Last saved: ${projectInfo.lastsaved}

"""
`;
}

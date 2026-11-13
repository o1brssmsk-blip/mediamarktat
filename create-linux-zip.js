const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createZip() {
  const outputFilePath = path.join(require('os').homedir(), 'Desktop', 'albert_heijn_cpanel_build_linux_final.zip');
  console.log('Starting zip creation to:', outputFilePath);
  
  const output = fs.createWriteStream(outputFilePath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  return new Promise((resolve, reject) => {
    output.on('close', function() {
      console.log('Compression complete. Total bytes:', archive.pointer());
      resolve();
    });

    archive.on('error', function(err) {
      console.error('Archiver error:', err);
      reject(err);
    });

    archive.pipe(output);

    console.log('Adding Next standalone output...');
    archive.directory('.next/standalone/', '.next/standalone');

    console.log('Adding public into standalone...');
    archive.directory('public/', '.next/standalone/public');

    console.log('Adding .next/static into standalone...');
    archive.directory('.next/static/', '.next/standalone/.next/static');

    console.log('Finalizing archive...');
    archive.finalize();
  });
}

createZip().then(() => console.log('Done!')).catch(console.error);

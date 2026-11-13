const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

async function createZip() {
  const outputFilePath = path.join(
    require('os').homedir(),
    'Desktop',
    'albert_heijn_cpanel_source.zip',
  );

  const output = fs.createWriteStream(outputFilePath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', function () {
      resolve(outputFilePath);
    });

    archive.on('error', function (err) {
      reject(err);
    });

    archive.pipe(output);

    archive.directory('src/', 'src');
    archive.directory('public/', 'public');

    archive.file('package.json', { name: 'package.json' });
    archive.file('package-lock.json', { name: 'package-lock.json' });
    archive.file('next.config.ts', { name: 'next.config.ts' });
    archive.file('tsconfig.json', { name: 'tsconfig.json' });
    archive.file('postcss.config.mjs', { name: 'postcss.config.mjs' });
    archive.file('server.js', { name: 'server.js' });
    archive.file('.npmrc', { name: '.npmrc' });

    archive.finalize();
  });
}

createZip()
  .then((filePath) => console.log('Zip created:', filePath))
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });

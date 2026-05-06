import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import unzipper from 'unzipper';

export const compressFile = async (inputPath: string, outputPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => resolve(outputPath));
    archive.on('error', reject);

    archive.pipe(output);
    archive.file(inputPath, { name: path.basename(inputPath) });
    archive.finalize();
  });
};

export const decompressFile = async (inputPath: string, outputDir: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    fs.createReadStream(inputPath)
      .pipe(unzipper.Extract({ path: outputDir }))
      .on('close', () => resolve(outputDir))
      .on('error', reject);
  });
};

export const shouldCompress = (fileSize: number): boolean => {
  return fileSize > 500 * 1024 * 1024; // 500MB
};
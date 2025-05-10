import fs from 'fs';

function checkFileExists(filePath) {
  try {
    // Check if this file exists
    fs.accessSync(filePath, fs.constants.F_OK);
    return true;
  } catch (err) {
    return false;
  }
}

// Example usage:
const filePath = 'myFile.txt';
if (checkFileExists(filePath)) {
  console.log(`${filePath} exists`);
} else {
  console.log(`${filePath} does not exist`);
}


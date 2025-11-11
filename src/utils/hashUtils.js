const crypto = require('crypto');
const fs = require('fs');

/**
 * Calculate SHA256 hash of a file
 * @param {string} filepath - Path to the file
 * @returns {Promise<string>} - Promise that resolves to the hash
 */
function calculateFileHash(filepath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filepath);
    
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Verify file integrity by comparing hashes
 * @param {string} filepath - Path to the file
 * @param {string} expectedHash - Expected hash value
 * @returns {Promise<boolean>} - Promise that resolves to true if hashes match
 */
async function verifyFileHash(filepath, expectedHash) {
  try {
    const actualHash = await calculateFileHash(filepath);
    return actualHash === expectedHash;
  } catch (error) {
    throw new Error(`Failed to verify file hash: ${error.message}`);
  }
}

module.exports = {
  calculateFileHash,
  verifyFileHash
};

const sanitizeFilename = require('sanitize-filename');

function normalizeFilename(originalName) {
  if (!originalName) {
    return 'unnamed-file';
  }

  let decoded = originalName;

  try {
    const buffer = Buffer.from(originalName, 'binary');
    const utf8 = buffer.toString('utf8');
    const reencoded = Buffer.from(utf8, 'utf8').toString('binary');

    if (reencoded === originalName) {
      decoded = utf8;
    }
  } catch (error) {
    decoded = originalName;
  }

  const cleaned = sanitizeFilename(decoded, { replacement: '_' });
  return cleaned || 'unnamed-file';
}

module.exports = {
  normalizeFilename,
};

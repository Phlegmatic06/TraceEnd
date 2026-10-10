import path from 'path';

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'vendor',
  'dist',
  'build',
  '.next',
  '.cache',
  '__pycache__',
  'venv',
  'env',
  '.venv',
  'coverage',
  '.tox',
  'target',
]);

const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.bmp', '.tiff',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  // Archives
  '.zip', '.tar', '.gz', '.tgz', '.rar', '.7z', '.bz2',
  // Executables / Compiled
  '.exe', '.dll', '.so', '.dylib', '.class', '.jar', '.war', '.ear',
  '.pyc', '.pyo', '.pyd', '.o', '.a', '.lib',
  // Audio / Video
  '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.wav', '.ogg',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  // Databases
  '.sqlite', '.db', '.sqlite3',
  // Others
  '.DS_Store', '.min.js', '.min.css'
]);

/**
 * Determines if a file should be skipped based on its path.
 * Filters out common dependencies, build artifacts, and binary files.
 */
export function shouldSkipFile(filePath: string): boolean {
  const parts = filePath.split('/');
  
  // Check directories
  for (const part of parts) {
    if (SKIP_DIRS.has(part)) {
      return true;
    }
  }

  // Check extensions
  const ext = path.extname(filePath).toLowerCase();
  if (BINARY_EXTENSIONS.has(ext)) {
    return true;
  }

  // Exact file matches (e.g. package-lock.json can be huge and rarely contains manually added secrets)
  const basename = path.basename(filePath);
  if (basename === 'package-lock.json' || basename === 'yarn.lock' || basename === 'pnpm-lock.yaml') {
    return true;
  }

  return false;
}

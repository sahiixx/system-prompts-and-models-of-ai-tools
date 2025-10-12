const fs = require('fs');
const { promises: fsp } = fs;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { performance } = require('perf_hooks');

const {
  formatBytes,
  formatDuration,
  percentile,
  formatDate
} = require('./formatters');
const { renderFilePage } = require('./templates/filePage');
const { renderIndexPage } = require('./templates/indexPage');

const SITE_DIR = path.join(__dirname, '..');
const ROOT_DIR = path.join(SITE_DIR, '..');
const DIST_DIR = path.join(SITE_DIR, 'dist');
const FILES_DIR = path.join(DIST_DIR, 'files');
const REPORT_PATH = path.join(SITE_DIR, 'build-report.json');

const INCLUDED_EXTENSIONS = new Set(['.txt', '.json', '.md', '.mdx', '.yaml', '.yml']);
const EXCLUDED_DIRECTORIES = new Set(['.git', 'node_modules', 'site/dist', 'site', 'assets', 'dist']);

function createDirectoryNode(name, relativePath, depth) {
  return {
    name,
    relativePath,
    depth,
    files: [],
    children: new Map(),
    totalFiles: 0,
    totalBytes: 0,
    totalLines: 0
  };
}

function createStats() {
  const directories = new Map();
  directories.set('Root', { directory: 'Root', files: 0, totalBytes: 0 });

  return {
    totalFiles: 0,
    totalDirectories: 0,
    totalSize: 0,
    extensionStats: new Map(),
    directories,
    files: [],
    minFile: null,
    maxFile: null,
    newestFile: null,
    oldestFile: null
  };
}

function shouldExclude(relativePath) {
  if (!relativePath || relativePath === '.') {
    return false;
  }

  const normalized = relativePath.split(path.sep).join('/');
  return Array.from(EXCLUDED_DIRECTORIES).some(entry => normalized === entry || normalized.startsWith(`${entry}/`));
}

function ensureDirectoryNode(rootNode, segments) {
  let node = rootNode;
  let pathAccumulator = node.depth === 0 ? '' : rootNode.relativePath;

  for (const segment of segments) {
    if (!segment) {
      continue;
    }

    pathAccumulator = pathAccumulator ? `${pathAccumulator}/${segment}` : segment;

    if (!node.children.has(segment)) {
      node.children.set(segment, createDirectoryNode(segment, pathAccumulator, node.depth + 1));
    }

    node = node.children.get(segment);
  }

  return node;
}

function finalizeTreeMetrics(node) {
  let totalFiles = 0;
  let totalBytes = 0;
  let totalLines = 0;

  for (const file of node.files) {
    totalFiles += 1;
    totalBytes += file.size;
    totalLines += file.lineCount || 0;
  }

  for (const child of node.children.values()) {
    const childTotals = finalizeTreeMetrics(child);
    totalFiles += childTotals.totalFiles;
    totalBytes += childTotals.totalBytes;
    totalLines += childTotals.totalLines;
  }

  node.totalFiles = totalFiles;
  node.totalBytes = totalBytes;
  node.totalLines = totalLines;
  node.totalSizeHuman = formatBytes(totalBytes);

  return { totalFiles, totalBytes, totalLines };
}

function createSizeHistogram(files) {
  if (!files.length) {
    return [];
  }

  const thresholds = [512, 1024, 2048, 4096, 16384, 65536, 262144, 1048576, 4194304, Infinity];
  const buckets = thresholds.map(() => ({ count: 0, totalBytes: 0 }));

  for (const file of files) {
    const size = file.size;
    let bucketIndex = thresholds.findIndex(limit => size <= limit);
    if (bucketIndex === -1) {
      bucketIndex = thresholds.length - 1;
    }
    buckets[bucketIndex].count += 1;
    buckets[bucketIndex].totalBytes += size;
  }

  return buckets
    .map((bucket, index) => {
      if (!bucket.count) {
        return null;
      }
      const upper = thresholds[index];
      const lower = index === 0 ? 0 : thresholds[index - 1] + 1;
      const label = upper === Infinity
        ? `${formatBytes(lower)}+`
        : `${formatBytes(lower)} – ${formatBytes(upper)}`;

      return {
        label,
        count: bucket.count,
        totalBytes: bucket.totalBytes
      };
    })
    .filter(Boolean);
}

function createDirectoryOverview(stats) {
  const directories = Array.from(stats.directories.values()).map(entry => ({
    ...entry,
    averageFileSize: entry.files ? entry.totalBytes / entry.files : 0
  }));

  directories.sort((a, b) => b.totalBytes - a.totalBytes || b.files - a.files);

  return directories.slice(0, 12).map(entry => ({
    directory: entry.directory,
    files: entry.files,
    totalBytes: entry.totalBytes,
    totalSizeHuman: formatBytes(entry.totalBytes),
    averageFileSizeBytes: Math.round(entry.averageFileSize),
    averageFileSizeHuman: formatBytes(entry.averageFileSize),
    sizeSharePercent: stats.totalSize ? (entry.totalBytes / stats.totalSize) * 100 : 0
  }));
}

function createExtensionOverview(stats) {
  const extensions = Array.from(stats.extensionStats.values()).map(entry => ({
    ...entry,
    averageSize: entry.files ? entry.totalBytes / entry.files : 0
  }));

  extensions.sort((a, b) => b.totalBytes - a.totalBytes || b.files - a.files);

  return extensions.map(entry => ({
    extension: entry.extension,
    files: entry.files,
    totalBytes: entry.totalBytes,
    totalSizeHuman: formatBytes(entry.totalBytes),
    averageFileSizeBytes: Math.round(entry.averageSize),
    averageFileSizeHuman: formatBytes(entry.averageSize),
    sizeSharePercent: stats.totalSize ? (entry.totalBytes / stats.totalSize) * 100 : 0
  }));
}

function computeLineMetrics(files) {
  const withLineCounts = files.filter(file => Number.isFinite(file.lineCount));
  if (!withLineCounts.length) {
    return {
      totalLines: 0,
      averageLines: 0,
      medianLines: 0,
      p90Lines: 0,
      p99Lines: 0
    };
  }

  const lineCounts = withLineCounts.map(file => file.lineCount).sort((a, b) => a - b);
  const totalLines = lineCounts.reduce((sum, value) => sum + value, 0);
  const averageLines = totalLines / withLineCounts.length;

  return {
    totalLines,
    averageLines,
    medianLines: percentile(lineCounts, 50),
    p90Lines: percentile(lineCounts, 90),
    p99Lines: percentile(lineCounts, 99)
  };
}

function computeSizeMetrics(files, stats) {
  if (!files.length) {
    return {
      median: 0,
      p75: 0,
      p90: 0,
      p95: 0,
      p99: 0,
      average: 0
    };
  }

  const sizes = files.map(file => file.size).sort((a, b) => a - b);
  const totalSize = sizes.reduce((sum, value) => sum + value, 0);

  return {
    median: percentile(sizes, 50),
    p75: percentile(sizes, 75),
    p90: percentile(sizes, 90),
    p95: percentile(sizes, 95),
    p99: percentile(sizes, 99),
    average: stats.totalFiles ? totalSize / stats.totalFiles : 0
  };
}

async function ensureCleanDirectory(directory) {
  await fsp.rm(directory, { recursive: true, force: true });
  await fsp.mkdir(directory, { recursive: true });
}

async function scanRepository() {
  const stats = createStats();
  const rootNode = createDirectoryNode('Root', '.', 0);
  const stack = [ROOT_DIR];

  while (stack.length) {
    const currentDirectory = stack.pop();
    const relativeDir = path.relative(ROOT_DIR, currentDirectory) || '.';

    if (relativeDir !== '.' && shouldExclude(relativeDir)) {
      continue;
    }

    const segments = relativeDir === '.' ? [] : relativeDir.split(path.sep);
    const directoryNode = ensureDirectoryNode(rootNode, segments);

    const entries = await fsp.readdir(currentDirectory, { withFileTypes: true });
    const fileTasks = [];

    for (const entry of entries) {
      if (entry.name === '.DS_Store') {
        continue;
      }

      const fullPath = path.join(currentDirectory, entry.name);
      const relativePath = path.relative(ROOT_DIR, fullPath);

      if (shouldExclude(relativePath)) {
        continue;
      }

      if (entry.isDirectory()) {
        stats.totalDirectories += 1;
        stack.push(fullPath);
        ensureDirectoryNode(directoryNode, [entry.name]);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const extension = path.extname(entry.name).toLowerCase();
      if (!INCLUDED_EXTENSIONS.has(extension)) {
        continue;
      }

      fileTasks.push(
        fsp.stat(fullPath).then(fileStat => {
          const normalizedPath = relativePath.split(path.sep).join('/');
          const directoryName = path.dirname(normalizedPath) === '.' ? 'Root' : path.dirname(normalizedPath);
          const fileRecord = {
            id: crypto.createHash('sha1').update(normalizedPath).digest('hex'),
            name: entry.name,
            relativePath: normalizedPath,
            fullPath,
            directory: directoryName,
            extension,
            size: fileStat.size,
            modifiedAt: fileStat.mtime.toISOString(),
            createdAt: fileStat.birthtime.toISOString(),
            lineCount: undefined,
            language: undefined
          };

          stats.totalFiles += 1;
          stats.totalSize += fileStat.size;
          stats.files.push(fileRecord);
          directoryNode.files.push(fileRecord);

          if (!stats.extensionStats.has(extension)) {
            stats.extensionStats.set(extension, {
              extension,
              files: 0,
              totalBytes: 0
            });
          }

          const extensionEntry = stats.extensionStats.get(extension);
          extensionEntry.files += 1;
          extensionEntry.totalBytes += fileStat.size;

          if (!stats.directories.has(directoryName)) {
            stats.directories.set(directoryName, {
              directory: directoryName,
              files: 0,
              totalBytes: 0
            });
          }

          const directoryEntry = stats.directories.get(directoryName);
          directoryEntry.files += 1;
          directoryEntry.totalBytes += fileStat.size;

          if (!stats.minFile || fileStat.size < stats.minFile.size) {
            stats.minFile = {
              path: normalizedPath,
              size: fileStat.size,
              sizeHuman: formatBytes(fileStat.size)
            };
          }

          if (!stats.maxFile || fileStat.size > stats.maxFile.size) {
            stats.maxFile = {
              path: normalizedPath,
              size: fileStat.size,
              sizeHuman: formatBytes(fileStat.size)
            };
          }

          if (!stats.newestFile || fileStat.mtime > new Date(stats.newestFile.modifiedAt)) {
            stats.newestFile = {
              path: normalizedPath,
              modifiedAt: fileRecord.modifiedAt,
              human: formatDate(fileRecord.modifiedAt)
            };
          }

          if (!stats.oldestFile || fileStat.mtime < new Date(stats.oldestFile.modifiedAt)) {
            stats.oldestFile = {
              path: normalizedPath,
              modifiedAt: fileRecord.modifiedAt,
              human: formatDate(fileRecord.modifiedAt)
            };
          }
        })
      );
    }

    if (fileTasks.length) {
      await Promise.all(fileTasks);
    }
  }

  return { stats, rootNode };
}

async function processWithConcurrency(items, limit, handler) {
  let index = 0;
  const workerCount = Math.min(limit, items.length || 1);
  const workers = Array.from({ length: workerCount }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      // eslint-disable-next-line no-await-in-loop
      await handler(items[currentIndex], currentIndex);
    }
  });
  await Promise.all(workers);
}

function detectLanguage(extension) {
  switch (extension) {
    case '.json':
      return 'json';
    case '.md':
    case '.mdx':
      return 'markdown';
    case '.yaml':
    case '.yml':
      return 'yaml';
    case '.txt':
      return 'plaintext';
    default:
      return 'plaintext';
  }
}

async function generateFilePages(files) {
  const concurrency = Math.min(12, Math.max(4, os.cpus()?.length || 4));
  let generated = 0;

  await processWithConcurrency(files, concurrency, async file => {
    try {
      const content = await fsp.readFile(file.fullPath, 'utf8');
      const lineCount = content.split(/\r?\n/).length;
      file.lineCount = lineCount;
      file.language = detectLanguage(file.extension);

      const html = renderFilePage(file, content);
      const outputPath = path.join(FILES_DIR, `${file.id}.html`);
      await fsp.writeFile(outputPath, html, 'utf8');
      generated += 1;
    } catch (error) {
      console.warn(`⚠️  Failed to render ${file.relativePath}: ${error.message}`);
    }
  });

  return { generatedPages: generated };
}

function createSearchIndex(files) {
  return files.map(file => ({
    id: file.id,
    path: file.relativePath,
    pathLower: file.relativePath.toLowerCase(),
    extension: file.extension || 'unknown',
    sizeHuman: formatBytes(file.size),
    lines: Number.isFinite(file.lineCount) ? file.lineCount.toLocaleString() : null
  }));
}

function createReport({ stats, generatedPages, durationMs }) {
  const sizeMetrics = computeSizeMetrics(stats.files, stats);
  const lineMetrics = computeLineMetrics(stats.files);
  const sizeDistribution = createSizeHistogram(stats.files);
  const largestFiles = stats.files
    .slice()
    .sort((a, b) => b.size - a.size)
    .slice(0, 20)
    .map(file => ({
      path: file.relativePath,
      bytes: file.size,
      sizeHuman: formatBytes(file.size),
      lines: file.lineCount
    }));

  const filesPerSecond = durationMs ? stats.totalFiles / (durationMs / 1000) : stats.totalFiles;
  const bytesPerSecond = durationMs ? stats.totalSize / (durationMs / 1000) : stats.totalSize;
  const averageFilesPerDirectory = stats.totalDirectories
    ? stats.totalFiles / stats.totalDirectories
    : stats.totalFiles;

  return {
    generatedAt: new Date().toISOString(),
    generatedHuman: formatDate(new Date().toISOString()),
    runtime: {
      node: process.version,
      platform: `${process.platform} ${os.release()}`
    },
    rootDirectory: path.relative(ROOT_DIR, ROOT_DIR) || '.',
    outputDirectory: path.relative(ROOT_DIR, DIST_DIR) || '.',
    includedExtensions: Array.from(INCLUDED_EXTENSIONS.values()),
    excludedDirectories: Array.from(EXCLUDED_DIRECTORIES.values()),
    totalFiles: stats.totalFiles,
    totalDirectories: stats.totalDirectories,
    totalSizeBytes: stats.totalSize,
    totalSizeHuman: formatBytes(stats.totalSize),
    averageFileSizeBytes: Math.round(sizeMetrics.average),
    averageFileSizeHuman: formatBytes(sizeMetrics.average),
    averageFilesPerDirectory,
    durationMs,
    durationHuman: formatDuration(durationMs),
    generatedPages,
    filesPerSecond,
    bytesPerSecond,
    sizeMetrics,
    lineMetrics,
    extensionBreakdown: createExtensionOverview(stats),
    largestDirectories: createDirectoryOverview(stats),
    largestFiles,
    sizeDistribution,
    minFile: stats.minFile,
    maxFile: stats.maxFile,
    newestFile: stats.newestFile,
    oldestFile: stats.oldestFile
  };
}

async function writeIndex(report, rootNode, files) {
  const searchIndex = createSearchIndex(files);
  const html = renderIndexPage({ report, rootNode, searchIndex });
  await fsp.writeFile(path.join(DIST_DIR, 'index.html'), html, 'utf8');
}

async function writeReport(report) {
  await fsp.writeFile(REPORT_PATH, JSON.stringify(report, null, 2));
}

async function run() {
  const start = performance.now();
  console.log('🚀 Starting build...');

  await ensureCleanDirectory(DIST_DIR);
  await fsp.mkdir(FILES_DIR, { recursive: true });

  console.log('📂 Scanning repository...');
  const { stats, rootNode } = await scanRepository();
  console.log(`   • Indexed ${stats.totalFiles.toLocaleString()} files across ${stats.totalDirectories.toLocaleString()} directories`);

  console.log('📝 Rendering pages...');
  const { generatedPages } = await generateFilePages(stats.files);
  console.log(`   • Generated ${generatedPages.toLocaleString()} HTML pages`);

  finalizeTreeMetrics(rootNode);

  const durationMs = Math.round(performance.now() - start);
  const report = createReport({ stats, generatedPages, durationMs });

  console.log('📄 Writing index and analytics...');
  await writeIndex(report, rootNode, stats.files);
  await writeReport(report);

  console.log(`✨ Build completed in ${formatDuration(durationMs)}.`);
  console.log(`📁 Output directory: ${DIST_DIR}`);
}

module.exports = { run };

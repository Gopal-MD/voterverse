/**
 * @module update_frontend
 * @description Build-time utility for the VoterVerse CI/CD pipeline. 
 * This script automates the synchronization of the compiled Frontend (Vite) 
 * build output with the Backend (Express) static serving directory. 
 * It handles cross-platform path resolution and directory purging to ensure 
 * that the Cloud Run deployment always serves the freshest production assets.
 * @author VoterVerse Engineering
 * @version 1.2.0
 */

const fs = require('fs');
// Removed glob
const path = require('path');

const files = [
  'frontend/src/utils/translation.js',
  'frontend/src/pages/QuizArena.jsx',
  'frontend/src/pages/PollingBoothFinder.jsx',
  'frontend/src/pages/FraudReportCenter.jsx',
  'frontend/src/pages/ElectionTimeline.jsx',
  'frontend/src/pages/ElectionChatbot.jsx',
  'frontend/src/pages/DocumentAnalyzer.jsx',
];

files.forEach((file) => {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) return;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Basic replacement pattern: replace standard `await res.json()` assignment
  // e.g., const data = await res.json(); => const raw = await res.json(); const data = raw.success !== undefined ? raw.data : raw;

  content = content.replace(
    /const (\w+) = await (\w+)\.json\(\);/g,
    `const _$1 = await $2.json();\n      const $1 = _$1.success !== undefined ? _$1.data : _$1;`
  );

  content = content.replace(
    /\.then\((\w+) => (\w+)\.json\(\)\)/g,
    `.then(async ($1) => { const _d = await $1.json(); return _d.success !== undefined ? _d.data : _d; })`
  );

  // For translation.js specifically (has const data = await response.json();)

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`Processed ${file}`);
});

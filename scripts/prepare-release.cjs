const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const manifest = require('./runtime-manifest.json');
const root = path.resolve(__dirname, '..');

function prepareRelease(destination) {
  const dist = path.join(root, 'SwettyPuppies_Frontend/dist');
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('Compila primero el frontend: npm run build.');
  const target = path.resolve(destination);
  if (target === root || fs.existsSync(target)) throw new Error('El destino debe ser una carpeta nueva. No se sobrescriben entregas existentes.');
  const files = [];
  function collect(relative, backend = true) {
    const source = path.join(root, relative);
    const info = fs.lstatSync(source);
    if (info.isSymbolicLink()) throw new Error(`Enlace no permitido en la entrega: ${relative}`);
    if (info.isDirectory()) {
      for (const name of fs.readdirSync(source)) collect(path.join(relative, name), backend);
    } else if (!backend || /\.(js|cjs|json)$/.test(relative)) {
      files.push(relative);
    }
  }
  for (const directory of manifest.modules) collect(directory);
  collect('SwettyPuppies_Frontend/dist', false);
  files.push(...manifest.files);
  // La lista permitida impide incluir .env, backups, pruebas, logs o node_modules.
  for (const file of files) {
    if (/(^|[/\\])\.env(?:$|\.)|\.(?:gz|backup|log|map)$|(^|[/\\])(?:node_modules|temp|tests|\.git)([/\\]|$)/i.test(file)) {
      throw new Error(`Archivo no permitido: ${file}`);
    }
  }
  fs.mkdirSync(target, { recursive: true });
  const checksums = {};
  for (const file of [...new Set(files)].sort()) {
    const data = fs.readFileSync(path.join(root, file));
    const output = path.join(target, file);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, data, { flag: 'wx' });
    checksums[file.replace(/\\/g, '/')] = createHash('sha256').update(data).digest('hex');
  }
  fs.writeFileSync(path.join(target, 'release-manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), files: checksums }, null, 2) + '\n');
  return { directory: target, files: Object.keys(checksums).length };
}

if (require.main === module) {
  const directory = process.argv[2] || path.join(root, 'release', `sweety-puppies-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  try { console.log(JSON.stringify(prepareRelease(directory), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { prepareRelease };

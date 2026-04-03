const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const bucketName = process.env.BUCKET_NAME || 'imagenes';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL y SUPABASE_KEY son requeridas para usar Supabase Storage');
}

const supabase = createClient(supabaseUrl, supabaseKey);

function sanitizeFileName(value) {
  return String(value || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

function buildStoragePath(folder, originalName) {
  const extension = path.extname(originalName || '').toLowerCase() || '.jpg';
  const baseName = sanitizeFileName(path.basename(originalName || 'archivo', extension)) || 'archivo';
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${extension}`;
  return `${folder}/${uniqueName}`;
}

async function uploadBufferToSupabase({ buffer, originalName, mimeType, folder }) {
  const filePath = buildStoragePath(folder, originalName);

  const { error } = await supabase.storage.from(bucketName).upload(filePath, buffer, {
    contentType: mimeType || 'application/octet-stream',
    cacheControl: '3600',
    upsert: false
  });

  if (error) {
    throw new Error(error.message || 'No se pudo subir el archivo a Supabase Storage');
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);

  return {
    path: filePath,
    publicUrl: data.publicUrl
  };
}

function getStoragePathFromPublicUrl(publicUrl) {
  if (!publicUrl) {
    return null;
  }

  const marker = `/storage/v1/object/public/${bucketName}/`;
  const markerIndex = publicUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return publicUrl.slice(markerIndex + marker.length);
}

async function deleteByPublicUrl(publicUrl) {
  const storagePath = getStoragePathFromPublicUrl(publicUrl);

  if (!storagePath) {
    return;
  }

  const { error } = await supabase.storage.from(bucketName).remove([storagePath]);

  if (error) {
    throw new Error(error.message || 'No se pudo eliminar el archivo de Supabase Storage');
  }
}

module.exports = {
  uploadBufferToSupabase,
  deleteByPublicUrl
};

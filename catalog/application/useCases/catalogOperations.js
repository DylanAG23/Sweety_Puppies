const rules = require('../../../shared/store/rules');
function operations({ repository, storage }) {
  const admin = (user) => repository.admin(user);
  return {
    async categories(user, isAdmin = false) {
      if (isAdmin) await admin(user);
      return { categorias: await repository.categories(isAdmin) };
    },
    async products(user, q = {}, isAdmin = false) {
      if (isAdmin) await admin(user);
      const f = {
        q: q.q ? rules.text(q.q, 100) : '',
        categoria: q.categoria ? rules.uuid(q.categoria) : null,
        id: q.id ? rules.uuid(q.id) : null,
        page: rules.integer(q.page ?? 1, 1, 100000),
        limit: rules.integer(q.limit ?? 24, 1, 100),
        orden: q.orden,
        disponibilidad: q.disponibilidad
      };
      if (q.min !== undefined && q.min !== '') f.min = rules.integer(q.min);
      if (q.max !== undefined && q.max !== '') f.max = rules.integer(q.max);
      return repository.products(f, isAdmin);
    },
    async saveCategory(user, id, b) {
      await admin(user);
      return {
        categoria: await repository.saveCategory(id ? rules.uuid(id) : null, {
          nombre: rules.text(b.nombre, 100),
          descripcion: rules.text(b.descripcion ?? '', 2000, false),
          orden: rules.integer(b.orden ?? 0),
          activo: rules.boolean(b.activo ?? true)
        })
      };
    },
    async deleteCategory(user, id) {
      await admin(user);
      await repository.deleteCategory(rules.uuid(id));
      return { message: 'Categoría eliminada' };
    },
    async saveProduct(user, id, b) {
      await admin(user);
      return {
        producto: await repository.saveProduct(id ? rules.uuid(id) : null, {
          categoria_id: rules.uuid(b.categoria_id),
          referencia: rules.text(b.referencia, 50),
          nombre: rules.text(b.nombre, 150),
          descripcion_corta: rules.text(b.descripcion_corta ?? '', 255, false),
          descripcion: rules.text(b.descripcion ?? '', 10000, false),
          precio: rules.integer(b.precio, 1),
          activo: rules.boolean(b.activo ?? true)
        })
      };
    },
    async deleteProduct(user, id) {
      await admin(user);
      const images = await repository.deleteProduct(rules.uuid(id));
      let warnings = 0;
      for (const i of images) {
        try {
          await storage.deleteByPublicUrl(i.url);
        } catch {
          warnings++;
        }
      }
      return {
        message: 'Producto eliminado',
        warning: warnings
          ? 'Algunos archivos requieren limpieza en Storage'
          : null
      };
    },
    async upload(user, id, file) {
      await admin(user);
      rules.uuid(id);
      if (!file || !['image/jpeg', 'image/png'].includes(file.mimetype))
        rules.fail('Selecciona una imagen JPG o PNG, máximo 2 MB');
      const asset = await storage.uploadBufferToSupabase({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        folder: 'productos/' + id
      });
      try {
        return { imagen: await repository.addImage(id, asset.publicUrl) };
      } catch (e) {
        await storage.deleteByPublicUrl(asset.publicUrl).catch(() => {});
        throw e;
      }
    },
    async removeImage(user, id, image) {
      await admin(user);
      const url = await repository.removeImage(
        rules.uuid(id),
        rules.uuid(image)
      );
      let warning = null;
      try {
        await storage.deleteByPublicUrl(url);
      } catch {
        warning = 'Registro eliminado; el archivo requiere limpieza en Storage';
      }
      return { message: 'Imagen eliminada', warning };
    },
    async reorder(user, id, body) {
      await admin(user);
      if (!Array.isArray(body.ids))
        rules.fail('Selecciona el orden de imágenes');
      await repository.reorderImages(rules.uuid(id), body.ids.map(rules.uuid));
      return { message: 'Orden actualizado' };
    }
  };
}
module.exports = { operations };

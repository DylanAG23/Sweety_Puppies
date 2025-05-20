const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

// Endpoint para obtener el reporte diario de citas
router.get('/reportes/citas-diarias', async (req, res) => {
  const { fecha } = req.query; // formato YYYY-MM-DD
  
  // Validación de parámetros
  if (!fecha) {
    console.error('Error: No se proporcionó el parámetro fecha');
    return res.status(400).json({ error: 'Se requiere el parámetro fecha (formato YYYY-MM-DD)' });
  }
  
  try {
    // Logging para depuración
    console.log(`Generando reporte para fecha: ${fecha}`);
    
    // Consultamos las citas del día con sus servicios y detalles relacionados
    const citas = await client.query(`
      SELECT c.id_cita, c.fecha, c.hora, c.observaciones, 
             s.id_servicio, s.nombre AS nombre_servicio, s.precio,
             m.nombre AS nombre_mascota, 
             cl.cedula, cl.nombre AS nombre_cliente
      FROM citas c
      JOIN servicios s ON c.id_servicio = s.id_servicio
      JOIN mascotas m ON c.id_mascota = m.id_mascota
      JOIN clientes cl ON m.cedula_cliente = cl.cedula
      WHERE DATE(c.fecha) = ?
      ORDER BY c.hora ASC
    `, [fecha]);
    
    // Logging para depuración
    console.log(`Se encontraron ${citas.length} citas para la fecha ${fecha}`);
    console.log('Datos de citas:', JSON.stringify(citas).substring(0, 300) + '...');
    
    // Verificamos que la estructura de datos sea correcta
    // para evitar problemas con valores nulos o undefined
    const citasFormateadas = citas.map(cita => ({
      id_cita: cita.id_cita,
      fecha: cita.fecha,
      hora: cita.hora,
      observaciones: cita.observaciones || '',
      id_servicio: cita.id_servicio,
      nombre_servicio: cita.nombre_servicio || '(Sin especificar)',
      precio: parseFloat(cita.precio || 0),
      nombre_mascota: cita.nombre_mascota || '(Sin especificar)',
      cedula: cita.cedula,
      nombre_cliente: cita.nombre_cliente || '(Sin especificar)'
    }));
    
    // Calculamos los totales
    const totalCitas = citasFormateadas.length;
    const totalIngresos = citasFormateadas.reduce((sum, cita) => sum + cita.precio, 0);
    
    console.log(`Total de citas: ${totalCitas}, Total de ingresos: ${totalIngresos}`);
    
    // Respuesta para el cliente
    const respuesta = {
      fecha,
      citas: citasFormateadas,
      totalCitas,
      totalIngresos
    };
    
    console.log('Enviando respuesta al cliente');
    res.json(respuesta);
  } catch (error) {
    console.error('Error al generar reporte diario:', error);
    console.error('Detalles del error:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({ 
      error: 'Error al generar el reporte de citas diarias',
      mensaje: error.message 
    });
  }
});

module.exports = router;
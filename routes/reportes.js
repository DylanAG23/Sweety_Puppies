const express = require('express');
const router = express.Router();
const client = require('../baseDatos');

// Endpoint para obtener el reporte diario de citas
router.get('/citas-diarias', async (req, res) => {
  const { fecha } = req.query; // formato YYYY-MM-DD
  
  if (!fecha) {
    return res.status(400).json({ error: 'Se requiere el parámetro fecha (formato YYYY-MM-DD)' });
  }
  
  try {
    console.log(`Generando reporte para fecha: ${fecha}`);
    
    // Consultamos las citas del día con sus servicios y detalles relacionados
    const result = await client.query(`
      SELECT c.id_cita, c.fecha, c.hora, c.observaciones, 
             s.id_servicio, s.nombre AS nombre_servicio, s.precio,
             m.nombre AS nombre_mascota, 
             cl.cedula, cl.nombre AS nombre_cliente
      FROM citas c
      JOIN servicios s ON c.id_servicio = s.id_servicio
      JOIN mascotas m ON c.id_mascota = m.id_mascota
      JOIN clientes cl ON m.cedula_cliente = cl.cedula
      WHERE DATE(c.fecha) = $1
      ORDER BY c.hora ASC
    `, [fecha]);
    
    const citasFormateadas = result.rows.map(cita => ({
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
    
    const totalCitas = citasFormateadas.length;
    const totalIngresos = citasFormateadas.reduce((sum, cita) => sum + cita.precio, 0);
    
    res.json({
      fecha,
      citas: citasFormateadas,
      totalCitas,
      totalIngresos
    });
  } catch (error) {
    console.error('Error al generar reporte diario:', error);
    res.status(500).json({ 
      error: 'Error al generar el reporte de citas diarias',
      mensaje: error.message 
    });
  }
});

// Endpoint para estadísticas de servicios más populares
router.get('/servicios-populares', async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  
  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ 
      error: 'Se requieren los parámetros fechaInicio y fechaFin (formato YYYY-MM-DD)' 
    });
  }
  
  try {
    const result = await client.query(`
      SELECT s.nombre AS servicio, 
             COUNT(c.id_cita) AS cantidad_citas,
             SUM(s.precio) AS total_ingresos,
             s.precio
      FROM citas c
      JOIN servicios s ON c.id_servicio = s.id_servicio
      WHERE DATE(c.fecha) BETWEEN $1 AND $2
      GROUP BY s.id_servicio, s.nombre, s.precio
      ORDER BY cantidad_citas DESC
    `, [fechaInicio, fechaFin]);
    
    res.json({
      periodo: { fechaInicio, fechaFin },
      servicios: result.rows
    });
  } catch (error) {
    console.error('Error al obtener servicios populares:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas de servicios',
      mensaje: error.message 
    });
  }
});

// Endpoint para clientes más frecuentes
router.get('/clientes-frecuentes', async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  
  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ 
      error: 'Se requieren los parámetros fechaInicio y fechaFin (formato YYYY-MM-DD)' 
    });
  }
  
  try {
    const result = await client.query(`
      SELECT cl.nombre AS cliente, 
             cl.cedula,
             COUNT(c.id_cita) AS total_citas,
             SUM(s.precio) AS total_gastado
      FROM citas c
      JOIN mascotas m ON c.id_mascota = m.id_mascota
      JOIN clientes cl ON m.cedula_cliente = cl.cedula
      JOIN servicios s ON c.id_servicio = s.id_servicio
      WHERE DATE(c.fecha) BETWEEN $1 AND $2
      GROUP BY cl.cedula, cl.nombre
      ORDER BY total_citas DESC
      LIMIT 10
    `, [fechaInicio, fechaFin]);
    
    res.json({
      periodo: { fechaInicio, fechaFin },
      clientes: result.rows
    });
  } catch (error) {
    console.error('Error al obtener clientes frecuentes:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas de clientes',
      mensaje: error.message 
    });
  }
});

// Endpoint para ingresos mensuales
router.get('/ingresos-mensuales', async (req, res) => {
  const { ano } = req.query;
  
  if (!ano) {
    return res.status(400).json({ 
      error: 'Se requiere el parámetro año (formato YYYY)' 
    });
  }
  
  try {
    const result = await client.query(`
      SELECT 
        EXTRACT(MONTH FROM c.fecha) AS mes,
        TO_CHAR(c.fecha, 'Month') AS nombre_mes,
        COUNT(c.id_cita) AS total_citas,
        SUM(s.precio) AS total_ingresos
      FROM citas c
      JOIN servicios s ON c.id_servicio = s.id_servicio
      WHERE EXTRACT(YEAR FROM c.fecha) = $1
      GROUP BY EXTRACT(MONTH FROM c.fecha), TO_CHAR(c.fecha, 'Month')
      ORDER BY mes
    `, [ano]);
    
    res.json({
      ano: parseInt(ano),
      ingresos: result.rows
    });
  } catch (error) {
    console.error('Error al obtener ingresos mensuales:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas de ingresos mensuales',
      mensaje: error.message 
    });
  }
});

// Endpoint para resumen general
router.get('/resumen-general', async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  
  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ 
      error: 'Se requieren los parámetros fechaInicio y fechaFin (formato YYYY-MM-DD)' 
    });
  }
  
  try {
    // Total de citas e ingresos
    const totalesResult = await client.query(`
      SELECT 
        COUNT(c.id_cita) AS total_citas,
        SUM(s.precio) AS total_ingresos,
        COUNT(DISTINCT m.cedula_cliente) AS clientes_unicos,
        COUNT(DISTINCT c.id_mascota) AS mascotas_atendidas
      FROM citas c
      JOIN servicios s ON c.id_servicio = s.id_servicio
      JOIN mascotas m ON c.id_mascota = m.id_mascota
      WHERE DATE(c.fecha) BETWEEN $1 AND $2
    `, [fechaInicio, fechaFin]);
    
    const totales = totalesResult.rows[0];
    
    // Servicio más popular
    const servicioResult = await client.query(`
      SELECT s.nombre AS servicio, COUNT(c.id_cita) AS cantidad
      FROM citas c
      JOIN servicios s ON c.id_servicio = s.id_servicio
      WHERE DATE(c.fecha) BETWEEN $1 AND $2
      GROUP BY s.id_servicio, s.nombre
      ORDER BY cantidad DESC
      LIMIT 1
    `, [fechaInicio, fechaFin]);
    
    const servicioPopular = servicioResult.rows[0];
    
    // Promedio de ingresos diarios
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const dias = Math.ceil((fin - inicio) / (1000 * 60 * 60 * 24)) + 1;
    const promedioDiario = parseFloat(totales.total_ingresos || 0) / dias;
    
    res.json({
      periodo: { fechaInicio, fechaFin },
      resumen: {
        totalCitas: parseInt(totales.total_citas || 0),
        totalIngresos: parseFloat(totales.total_ingresos || 0),
        clientesUnicos: parseInt(totales.clientes_unicos || 0),
        mascotasAtendidas: parseInt(totales.mascotas_atendidas || 0),
        promedioDiario: parseFloat(promedioDiario.toFixed(2)) || 0,
        servicioMasPopular: servicioPopular ? servicioPopular.servicio : 'N/A'
      }
    });
  } catch (error) {
    console.error('Error al obtener resumen general:', error);
    res.status(500).json({ 
      error: 'Error al obtener resumen general',
      mensaje: error.message 
    });
  }
});

// Endpoint para estadísticas por día de la semana
router.get('/dias-semana', async (req, res) => {
  const { fechaInicio, fechaFin } = req.query;
  
  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ 
      error: 'Se requieren los parámetros fechaInicio y fechaFin (formato YYYY-MM-DD)' 
    });
  }
  
  try {
    const result = await client.query(`
      SELECT 
        TO_CHAR(c.fecha, 'Day') AS dia_semana,
        EXTRACT(DOW FROM c.fecha) AS numero_dia,
        COUNT(c.id_cita) AS total_citas,
        SUM(s.precio) AS total_ingresos
      FROM citas c
      JOIN servicios s ON c.id_servicio = s.id_servicio
      WHERE DATE(c.fecha) BETWEEN $1 AND $2
      GROUP BY TO_CHAR(c.fecha, 'Day'), EXTRACT(DOW FROM c.fecha)
      ORDER BY numero_dia
    `, [fechaInicio, fechaFin]);
    
    res.json({
      periodo: { fechaInicio, fechaFin },
      diasSemana: result.rows
    });
  } catch (error) {
    console.error('Error al obtener estadísticas por día:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas por día de la semana',
      mensaje: error.message 
    });
  }
});

module.exports = router;
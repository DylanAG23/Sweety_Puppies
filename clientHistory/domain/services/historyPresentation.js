function buildPetOptions(currentAppointments, completedServices) {
  const petMap = new Map();

  for (const item of [...currentAppointments, ...completedServices]) {
    const petId = item.mascotaId;

    if (!petId || petMap.has(petId)) {
      continue;
    }

    petMap.set(petId, {
      id: petId,
      nombre: item.mascotaNombre,
      raza: item.mascotaRaza || null
    });
  }

  return [...petMap.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

function getAppointmentStatusMessage(status) {
  if (status === 'pendiente') {
    return 'Tu cita esta pendiente de confirmacion por parte de Sweety Puppies.';
  }

  if (status === 'confirmada') {
    return 'Tu cita ya fue confirmada y estamos preparando todo para recibir a tu peludito.';
  }

  if (status === 'en_atencion') {
    return 'Tu mascota esta siendo atendida en este momento con mucho cuidado.';
  }

  return 'Consulta el estado actual de tu cita en este espacio.';
}

module.exports = {
  buildPetOptions,
  getAppointmentStatusMessage
};

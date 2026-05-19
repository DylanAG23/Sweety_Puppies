async function getAdminReportFilterCatalogs(dependencies, sessionUser) {
  await dependencies.reportsRepository.resolveAdminContext(sessionUser);
  return dependencies.reportsRepository.getFilterCatalogs();
}

module.exports = { getAdminReportFilterCatalogs };

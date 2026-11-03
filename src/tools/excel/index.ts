/**
 * ============================================================================
 * COQUILLE OUTILS : IMPORT & EXPORT EXCEL / CSV
 * ============================================================================
 */

import React from 'react';

export { ExcelImporterModal } from '../../components/inventory/ExcelImporterModal';

export const LazyExcelImporterModal = React.lazy(() =>
  import('../../components/inventory/ExcelImporterModal').then((m) => ({ default: m.ExcelImporterModal }))
);

const fs = require('fs');
const path = require('path');

const targetPath = path.resolve('src/components/resume/ResumeBuilderView.tsx');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Ajouter canAccessCvPro dans l'import
content = content.replace(
  /getGeneratedDocumentsCount,/,
  'canAccessCvPro,\n  getGeneratedDocumentsCount,'
);

// 2. Patch handleDownloadPdfHd
const oldDownloadCheck = `    // Vérification du quota de documents (Plan Gratuit : max 1 document)
    const currentDocs = getGeneratedDocumentsCount(currentUser?.storeId);
    if (isLimitReached(subscription, 'DOCUMENTS', currentDocs)) {
      triggerLimitReachedUpsell('DOCUMENTS', currentDocs, 1, 'CV / document');
      return;
    }`;

const newDownloadCheck = `    // Vérification stricte du Plan Zéro & Quotas CV Pro
    const cvAccess = canAccessCvPro(subscription, (currentUser as any)?.walletBalance || 0);
    if (!cvAccess.allowed) {
      triggerLimitReachedUpsell('DOCUMENTS', 0, 0, 'CV Pro (Inclus Plan Pro ou 500 F CFA à l\\'acte)');
      setExportErrorAlert({
        isOpen: true,
        message: cvAccess.message
      });
      return;
    }

    const currentDocs = getGeneratedDocumentsCount(currentUser?.storeId);
    if (isLimitReached(subscription, 'DOCUMENTS', currentDocs)) {
      triggerLimitReachedUpsell('DOCUMENTS', currentDocs, 0, 'CV Pro');
      return;
    }`;

content = content.replace(oldDownloadCheck, newDownloadCheck);

// 3. Patch handlePrintSystem
const oldPrintCheck = `    // Vérification du quota de documents
    const currentDocs = getGeneratedDocumentsCount(currentUser?.storeId);
    if (isLimitReached(subscription, 'DOCUMENTS', currentDocs)) {
      triggerLimitReachedUpsell('DOCUMENTS', currentDocs, 1, 'CV / document');
      return;
    }`;

const newPrintCheck = `    // Vérification stricte du Plan Zéro & Quotas CV Pro
    const cvAccess = canAccessCvPro(subscription, (currentUser as any)?.walletBalance || 0);
    if (!cvAccess.allowed) {
      triggerLimitReachedUpsell('DOCUMENTS', 0, 0, 'CV Pro (Inclus Plan Pro ou 500 F CFA à l\\'acte)');
      setExportErrorAlert({
        isOpen: true,
        message: cvAccess.message
      });
      return;
    }

    const currentDocs = getGeneratedDocumentsCount(currentUser?.storeId);
    if (isLimitReached(subscription, 'DOCUMENTS', currentDocs)) {
      triggerLimitReachedUpsell('DOCUMENTS', currentDocs, 0, 'CV Pro');
      return;
    }`;

content = content.replace(oldPrintCheck, newPrintCheck);

// 4. Patch handleOpenCoverLetter
const oldCoverLetterCheck = `  // Génération de la lettre de motivation IA
  const handleOpenCoverLetter = async () => {`;

const newCoverLetterCheck = `  // Génération de la lettre de motivation IA
  const handleOpenCoverLetter = async () => {
    const cvAccess = canAccessCvPro(subscription, (currentUser as any)?.walletBalance || 0);
    if (!cvAccess.allowed) {
      triggerLimitReachedUpsell('DOCUMENTS', 0, 0, 'Lettre de Motivation IA (Inclus Plan Pro ou Pay-As-You-Go)');
      setExportErrorAlert({
        isOpen: true,
        message: cvAccess.message
      });
      return;
    }`;

content = content.replace(oldCoverLetterCheck, newCoverLetterCheck);

fs.writeFileSync(targetPath, content, 'utf8');
console.log('✓ ResumeBuilderView.tsx patché avec vérification canAccessCvPro');

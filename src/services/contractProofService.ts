import { jsPDF } from 'jspdf';
import { EscrowProject } from '../types';
import { supabase } from '../lib/supabase';
import { saveEscrowProject } from './escrowService';

export interface ContractProofRecord {
  id: string;
  projectId: string;
  storeId: string;
  storeName: string;
  clientName: string;
  clientPhone?: string;
  projectTitle: string;
  totalAmount: number;
  providerSignedAt?: number;
  clientSignedAt?: number;
  contractProofHash: string;
  pdfDataUrl?: string;
  createdAt: number;
}

function formatXofForPdf(amount: number): string {
  const num = Math.round(Number(amount) || 0);
  return `${num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} FCFA`;
}

/**
 * Génère un PDF A4 propre et compressé pour un devis / contrat 1-to-1
 * incluant le tampon + signature du prestataire et la signature en ligne du commandeur.
 */
export function generateSignedQuotePdf(
  project: EscrowProject,
  options?: { filename?: string; autoSave?: boolean }
): { filename: string; dataUrl: string; save: () => void } {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageWidth = 210;
  let y = 16;

  // Bandeau supérieur
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(251, 191, 36); // amber-400
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DEVIS & CONTRAT DE PRESTATION', 14, 15);

  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Réf : ${project.id}`, 14, 22);
  doc.text(`Date : ${new Date(project.createdAt || Date.now()).toLocaleDateString('fr-FR')}`, 14, 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(project.storeName || project.merchantName || 'Prestataire Nanasore', pageWidth - 14, 15, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (project.merchantPhone) {
    doc.text(`Tél : ${project.merchantPhone}`, pageWidth - 14, 21, { align: 'right' });
  }
  doc.text('Protection Séquestre Nanasore', pageWidth - 14, 27, { align: 'right' });

  y = 42;

  // Bloc Parties (Prestataire / Commandeur)
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, 88, 28, 2, 2, 'FD');
  doc.roundedRect(108, y, 88, 28, 2, 2, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PRESTATAIRE', 18, y + 6);
  doc.text('COMMANDEUR (CLIENT)', 112, y + 6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.text(String(project.storeName || project.merchantName || 'Prestataire').slice(0, 34), 18, y + 13);
  doc.text(String(project.clientName || 'Client').slice(0, 34), 112, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text(project.merchantPhone ? `Tél : ${project.merchantPhone}` : 'Compte vérifié', 18, y + 19);
  doc.text(project.clientPhone ? `Tél : ${project.clientPhone}` : (project.clientEmail || 'Client vérifié'), 112, y + 19);
  if (project.clientCompany) {
    doc.text(String(project.clientCompany).slice(0, 34), 112, y + 24);
  }

  y += 36;

  // Objet du contrat
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Objet : ${project.projectTitle}`, 14, y);
  y += 6;

  if (project.description) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const descLines = doc.splitTextToSize(project.description, 182).slice(0, 4);
    doc.text(descLines, 14, y);
    y += descLines.length * 4.5 + 4;
  } else {
    y += 2;
  }

  // Tableau des jalons / prestations
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('#', 17, y + 5.5);
  doc.text('Désignation / Jalon de prestation', 26, y + 5.5);
  doc.text('Montant', 192, y + 5.5, { align: 'right' });
  y += 8;

  const milestones = Array.isArray(project.milestones) && project.milestones.length > 0
    ? project.milestones
    : [{ id: '1', title: project.projectTitle, amount: project.totalAmount, status: 'pending' as const }];

  milestones.slice(0, 8).forEach((m, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 8, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.line(14, y + 8, 196, y + 8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(String(idx + 1), 17, y + 5.5);
    doc.text(String(m.title || 'Prestation').slice(0, 72), 26, y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(formatXofForPdf(m.amount), 192, y + 5.5, { align: 'right' });
    y += 8;
  });

  // Total
  y += 3;
  doc.setFillColor(254, 243, 199); // amber-100
  doc.roundedRect(118, y, 78, 11, 2, 2, 'F');
  doc.setTextColor(146, 64, 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL NET :', 123, y + 7);
  doc.text(formatXofForPdf(project.totalAmount), 192, y + 7, { align: 'right' });
  y += 16;

  // Conditions
  if (project.termsAndConditions) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Conditions & Engagements :', 14, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const termsLines = doc.splitTextToSize(project.termsAndConditions, 182).slice(0, 5);
    doc.text(termsLines, 14, y);
    y += termsLines.length * 4 + 4;
  }

  // Bloc Signatures & Tampon (positionné proprement vers le bas)
  const sigY = Math.max(y + 4, 212);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(14, sigY, 88, 52, 2, 2, 'D');
  doc.roundedRect(108, sigY, 88, 52, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CACHET & SIGNATURE PRESTATAIRE', 18, sigY + 6);
  doc.text('SIGNATURE COMMANDEUR (LU ET APPROUVÉ)', 112, sigY + 6);

  if (project.providerStampDataUrl) {
    try {
      doc.addImage(project.providerStampDataUrl, 'PNG', 18, sigY + 9, 36, 22);
    } catch {}
  }
  if (project.providerSignatureDataUrl) {
    try {
      doc.addImage(project.providerSignatureDataUrl, 'PNG', 56, sigY + 12, 42, 20);
    } catch {}
  }
  if (project.providerSignedAt) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Signé le ${new Date(project.providerSignedAt).toLocaleString('fr-FR')}`, 18, sigY + 47);
  }

  if (project.clientSignatureDataUrl) {
    try {
      doc.addImage(project.clientSignatureDataUrl, 'PNG', 114, sigY + 12, 64, 24);
    } catch {}
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 163, 74);
    doc.text('LU ET APPROUVÉ — SIGNÉ EN LIGNE', 112, sigY + 41);
    if (project.clientSignedAt) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Le ${new Date(project.clientSignedAt).toLocaleString('fr-FR')}`, 112, sigY + 47);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('En attente de signature du commandeur', 114, sigY + 28);
  }

  // Pied de page preuve (Page 1 : Métadonnées & Devis)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  const hashLabel = project.contractProofHash ? ` • Empreinte SHA-256 : ${project.contractProofHash.slice(0, 16)}...` : '';
  doc.text(`Document 1/2 : Devis & Métadonnées certifiées Nanasore Escrow${hashLabel}`, pageWidth / 2, 288, { align: 'center' });

  // =========================================================================
  // PAGE 2 — DOCUMENT 2 : CONTRAT DE PRESTATION DE SERVICE OFFICIEL
  // =========================================================================
  doc.addPage();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 26, 'F');
  doc.setTextColor(251, 191, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('CONTRAT DE PRESTATION DE SERVICE', 14, 13);
  doc.setTextColor(226, 232, 240);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Réf. Devis lié : ${project.id} • Établi le ${new Date(project.createdAt || Date.now()).toLocaleDateString('fr-FR')}`, 14, 20);

  let cy = 36;
  const providerDisplay = String(project.merchantName || project.storeName || 'Le Prestataire');
  const clientDisplay = String(project.clientName || 'Le Commandeur');

  const articles: Array<{ title: string; body: string }> = [
    {
      title: 'Entre les soussignés :',
      body: `1) LE PRESTATAIRE : ${providerDisplay}${project.merchantPhone ? ` (Tél : ${project.merchantPhone})` : ''}, ci-après désigné « le Prestataire ».\n2) LE COMMANDEUR : ${clientDisplay}${project.clientCompany ? ` — ${project.clientCompany}` : ''}${project.clientPhone ? ` (Tél : ${project.clientPhone})` : ''}, ci-après désigné « le Commandeur ».`,
    },
    {
      title: 'Article 1 — Objet du Contrat',
      body: `Le présent contrat a pour objet la réalisation de la prestation intitulée « ${project.projectTitle} », telle que détaillée dans le Devis & Métadonnées (Document 1/2) comprenant ${milestones.length} jalon(s) de livraison.`,
    },
    {
      title: 'Article 2 — Prix, Protection par Séquestre & Règle de Paiement',
      body: `Le montant global net de la prestation est fixé à ${formatXofForPdf(project.totalAmount)}.\n• Fonctionnement du Séquestre (de A à Z) : Pour protéger les deux parties, le Commandeur ne verse pas l'argent directement au Prestataire. Les fonds sont déposés et bloqués sur un compte de Séquestre neutre géré par Nanasore. Ils restent intégralement protégés par le système pendant toute la durée d'exécution du contrat, et ne sont libérés au Prestataire qu'après exécution conforme et validation d'un commun accord par le Commandeur (libération partielle par jalon ou libération totale à la livraison finale).\n• Règle générale & Exception : Le paiement de la totalité (100 %) sous Séquestre à la commande constitue la règle générale. L'exception s'applique uniquement lorsque les parties ont expressément convenu d'un paiement fractionné par tranches : dans ce cas précis uniquement, tout retard de paiement d'une échéance par le Commandeur peut entraîner des frais de retard.`,
    },
    {
      title: 'Article 3 — Obligations des Parties & Retard d\'Exécution',
      body: `Le Prestataire s'engage à exécuter la mission avec diligence, selon les règles de l'art et dans les délais convenus. Tout retard d'exécution ou de livraison imputable au Prestataire peut entraîner des soustractions (retenues) sur le montant séquestré en faveur de la partie lésée, à savoir le Commandeur. De son côté, le Commandeur s'engage à fournir les informations nécessaires et à valider les livrables conformes dans un délai raisonnable.`,
    },
    {
      title: 'Article 4 — Litiges, Gel Conservatoire & Arbitrage Nanasore',
      body: `En cas de désaccord sur l'exécution ou la libération des fonds, chacune des parties peut ouvrir un litige depuis l'espace projet. Les fonds demeurent immédiatement gelés sous Séquestre à titre conservatoire et sont arbitrés sous 48h à 72h par le Super Admin sur la base du présent contrat signé, des métadonnées et des échanges enregistrés.`,
    },
  ];

  articles.forEach((art) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(art.title, 14, cy);
    cy += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(art.body, 182);
    doc.text(lines, 14, cy);
    cy += lines.length * 4.2 + 4;
  });

  // Bloc Signatures & Tampon sur le Contrat (Page 2)
  const cSigY = Math.max(cy + 4, 212);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(14, cSigY, 88, 52, 2, 2, 'D');
  doc.roundedRect(108, cSigY, 88, 52, 2, 2, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('CACHET & SIGNATURE PRESTATAIRE', 18, cSigY + 6);
  doc.text('SIGNATURE COMMANDEUR (LU ET APPROUVÉ)', 112, cSigY + 6);

  if (project.providerStampDataUrl) {
    try {
      doc.addImage(project.providerStampDataUrl, 'PNG', 18, cSigY + 9, 36, 22);
    } catch {}
  }
  if (project.providerSignatureDataUrl) {
    try {
      doc.addImage(project.providerSignatureDataUrl, 'PNG', 56, cSigY + 12, 42, 20);
    } catch {}
  }
  if (project.providerSignedAt) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Signé le ${new Date(project.providerSignedAt).toLocaleString('fr-FR')}`, 18, cSigY + 47);
  }

  if (project.clientSignatureDataUrl) {
    try {
      doc.addImage(project.clientSignatureDataUrl, 'PNG', 114, cSigY + 12, 64, 24);
    } catch {}
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 163, 74);
    doc.text('LU ET APPROUVÉ — SIGNÉ EN LIGNE', 112, cSigY + 41);
    if (project.clientSignedAt) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Le ${new Date(project.clientSignedAt).toLocaleString('fr-FR')}`, 112, cSigY + 47);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('En attente de signature du commandeur', 114, cSigY + 28);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Document 2/2 : Contrat de Prestation de Service Nanasore Escrow${hashLabel}`, pageWidth / 2, 288, { align: 'center' });

  const safeTitle = String(project.projectTitle || 'Devis').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32);
  const filename = options?.filename || `Contrat_${safeTitle}_${project.id.slice(-6)}.pdf`;
  const dataUrl = doc.output('datauristring');

  const save = () => {
    doc.save(filename);
  };

  if (options?.autoSave) {
    save();
  }

  return { filename, dataUrl, save };
}

async function computeSha256Hex(input: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buf = new TextEncoder().encode(input);
      const hashBuf = await crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {}
  return `proof_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Enregistre la copie du contrat signé comme preuve officielle pour le Super Admin.
 */
export async function saveContractProofToAdmin(
  project: EscrowProject,
  pdfDataUrl?: string
): Promise<ContractProofRecord> {
  const proofHash = await computeSha256Hex(
    `${project.id}|${project.storeId}|${project.clientName}|${project.totalAmount}|${project.clientSignedAt || Date.now()}`
  );
  const now = Date.now();
  const updatedProject: EscrowProject = {
    ...project,
    contractProofHash: proofHash,
    contractProofSubmittedAt: now,
    updatedAt: now,
  };

  await saveEscrowProject(updatedProject).catch(() => {});

  const record: ContractProofRecord = {
    id: `contract_proof_${project.id}`,
    projectId: project.id,
    storeId: project.storeId,
    storeName: project.storeName || project.merchantName || 'Prestataire',
    clientName: project.clientName,
    clientPhone: project.clientPhone,
    projectTitle: project.projectTitle,
    totalAmount: project.totalAmount,
    providerSignedAt: project.providerSignedAt,
    clientSignedAt: project.clientSignedAt,
    contractProofHash: proofHash,
    pdfDataUrl: pdfDataUrl && pdfDataUrl.length < 1_500_000 ? pdfDataUrl : undefined,
    createdAt: now,
  };

  try {
    await supabase.from('app_registry').upsert({
      key: record.id,
      name: `Preuve Contrat ${project.projectTitle}`,
      tenant_id: project.storeId,
      module_key: 'contract_proofs',
      config_json: record,
      value: record,
      updated_at: new Date(now).toISOString(),
    }, { onConflict: 'key' });
  } catch (err) {
    console.warn('[ContractProof] Notice sauvegarde Supabase :', err);
  }

  return record;
}

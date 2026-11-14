import React, { useState, useMemo } from 'react';
import { 
  X, 
  Send, 
  Mail, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  ShieldCheck, 
  Eye, 
  Code, 
  Bold, 
  Italic, 
  Heading, 
  List, 
  ExternalLink, 
  RefreshCw,
  Copy,
  FileText
} from 'lucide-react';
import { sendBrevoEmail, BrevoSendResult } from '../../services/brevoEmailService';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

interface BrevoEmailComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: any;
  defaultRecipient?: string;
  defaultSubject?: string;
}

export const BrevoEmailComposerModal: React.FC<BrevoEmailComposerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  defaultRecipient = '',
  defaultSubject = ''
}) => {
  // États de saisie
  const [recipientInput, setRecipientInput] = useState<string>(defaultRecipient);
  const [subject, setSubject] = useState<string>(defaultSubject || 'Notification Officielle — Nanasore');
  const [senderName, setSenderName] = useState<string>('Nanasore Team');
  const [senderEmail, setSenderEmail] = useState<string>('admin@nanasore.com');
  
  // Contenu du message (HTML)
  const [htmlContent, setHtmlContent] = useState<string>(`<p>Bonjour,</p>
<p>Nous vous informons d'une mise à jour importante concernant vos opérations et encaissements sur votre plateforme <strong>Nanasore</strong>.</p>
<p>Vous pouvez consulter les détails complets de vos transactions directement depuis votre Tableau de Bord Central.</p>
<br/>
<p style="text-align:center;">
  <a href="https://nanasore.com" style="background-color:#2563EB;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">Accéder au Central Master Hub</a>
</p>
<br/>
<p style="font-size:12px;color:#64748b;">Cordialement,<br/><strong>L'équipe Nanasore & Nanasore</strong><br/>Support : admin@nanasore.com</p>`);

  // Modes d'affichage
  const [viewMode, setViewMode] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [editorTab, setEditorTab] = useState<'VISUAL' | 'HTML'>('VISUAL');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string; messageId?: string } | null>(null);

  // Groupes de destinataires prédéfinis
  const RECIPIENT_GROUPS = [
    {
      id: 'SUPER_ADMINS',
      label: '👑 Tous les Super-Admins',
      emails: 'admin@nanasore.com, pousbila36@gmail.com',
      badge: 'Direction'
    },
    {
      id: 'MERCHANTS',
      label: '👥 Marchands & Utilisateurs',
      emails: 'boutique.abidjan@gmail.com, telecom.ouaga@yahoo.fr, contact@sahel-telecom.bf',
      badge: 'Clients POS'
    },
    {
      id: 'VIP',
      label: '⭐ Clients VIP & Grossistes',
      emails: 'vip.gold@nanasore.com, grossiste.telecom@gmail.com',
      badge: 'VIP Club'
    },
    {
      id: 'TEST_SELF',
      label: '🧪 Mon E-mail de Test',
      emails: currentUser?.email || 'admin@nanasore.com',
      badge: 'Test Immédiat'
    }
  ];

  // Suggestions de Sujets Rapides
  const QUICK_SUBJECTS = [
    '🔔 [Notification Officielle] Mise à jour critique de votre compte Nanasore',
    '🧾 [Reçu de Vente] Confirmation de votre encaissement et justificatif',
    '💳 [Alerte Trésorerie] Point sur vos règlements et créances en cours',
    '⚡ [Offre Exclusive] Nouveautés et opportunités sur votre plateforme NaNa'
  ];

  // Injection d'éléments de mise en forme dans l'éditeur
  const insertFormatting = (tag: 'b' | 'i' | 'h2' | 'btn' | 'hr' | 'callout') => {
    playTapBeep();
    if (tag === 'b') {
      setHtmlContent(prev => prev + ' <strong>Texte en gras</strong> ');
    } else if (tag === 'i') {
      setHtmlContent(prev => prev + ' <em>Texte en italique</em> ');
    } else if (tag === 'h2') {
      setHtmlContent(prev => prev + '\n<h2 style="color:#0f172a;font-size:18px;font-weight:bold;margin:16px 0 8px 0;">Nouveau Sous-Titre</h2>\n');
    } else if (tag === 'btn') {
      setHtmlContent(prev => prev + `\n<p style="text-align:center;margin:20px 0;"><a href="https://nanasore.com" style="background-color:#2563EB;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">Bouton d'Action</a></p>\n`);
    } else if (tag === 'hr') {
      setHtmlContent(prev => prev + '\n<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />\n');
    } else if (tag === 'callout') {
      setHtmlContent(prev => prev + `\n<div style="background-color:#EFF6FF;border-left:4px solid:#3B82F6;padding:12px 16px;border-radius:8px;margin:16px 0;color:#1E40AF;font-size:13px;"><strong>Information importante :</strong> Veuillez vérifier vos paramètres de paiement.</div>\n`);
    }
  };

  // Traitement et expédition via Brevo
  const handleSend = async () => {
    if (!recipientInput.trim()) {
      setFeedback({ success: false, message: 'Veuillez renseigner au moins une adresse e-mail destinataire.' });
      return;
    }
    if (!subject.trim()) {
      setFeedback({ success: false, message: 'Le sujet de l\'e-mail est obligatoire.' });
      return;
    }
    if (!htmlContent.trim()) {
      setFeedback({ success: false, message: 'Le corps du message ne peut pas être vide.' });
      return;
    }

    playTapBeep();
    setIsSending(true);
    setFeedback(null);

    // Extraction et nettoyage des adresses e-mails (supporte séparateurs , ; et retours ligne)
    const rawEmails = recipientInput
      .split(/[,;\n]/)
      .map(e => e.trim())
      .filter(e => e && e.includes('@'));

    if (rawEmails.length === 0) {
      setIsSending(false);
      setFeedback({ success: false, message: 'Aucune adresse e-mail valide détectée.' });
      return;
    }

    const recipients = rawEmails.map(email => ({ email, name: email.split('@')[0] }));

    try {
      // Construction du gabarit HTML final stylisé @nanasore.com
      const fullWrappedHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:24px 12px;background-color:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <div style="max-width:600px;margin:0 auto;background-color:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);">
    
    <!-- Header Officiel Nanasore -->
    <div style="background:linear-gradient(135deg,#0B1E48 0%,#1E3A8A 100%);padding:28px 24px;text-align:center;color:#FFFFFF;">
      <h1 style="margin:0;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Nanasore & Commerce</h1>
      <p style="margin:6px 0 0 0;font-size:11px;color:#93C5FD;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">Expédié via Brevo API v3 • admin@nanasore.com</p>
    </div>

    <!-- Corps du Message -->
    <div style="padding:32px 28px;font-size:14px;line-height:1.65;color:#334155;">
      ${htmlContent}
    </div>

    <!-- Footer Légal & Conforme -->
    <div style="background-color:#F1F5F9;padding:20px 24px;text-align:center;border-top:1px solid #E2E8F0;font-size:11px;color:#64748B;">
      <p style="margin:0 0 6px 0;">Cet e-mail a été envoyé par <strong>${senderName}</strong> (&lt;${senderEmail}&gt;) via le Central Master Hub.</p>
      <p style="margin:0;color:#94A3B8;">ENTREPRISE KONKOBO POUSBILA TELECOM • Nanasore.com • Tous droits réservés.</p>
    </div>
  </div>
</body>
</html>`;

      const result: BrevoSendResult = await sendBrevoEmail({
        to: recipients,
        subject: subject.trim(),
        htmlContent: fullWrappedHtml,
        senderEmail: senderEmail.trim(),
        senderName: senderName.trim()
      });

      if (result.success) {
        playValidationBeep();
        setFeedback({
          success: true,
          message: result.message || `E-mail transmis avec succès à ${recipients.length} destinataire(s) via Brevo !`,
          messageId: result.messageId
        });
      } else {
        setFeedback({
          success: false,
          message: result.message || 'Échec lors de l\'envoi via Brevo API.'
        });
      }
    } catch (err: any) {
      console.error('[BrevoComposer Error]', err);
      setFeedback({
        success: false,
        message: err?.message || 'Erreur réseau ou exception serveur lors de l\'envoi.'
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-4xl bg-[#0d1527] border border-blue-500/40 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-100">
        
        {/* =========================================================================
            HEADER DE LA MODALE
           ========================================================================= */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white truncate">
                  Rédacteur d'E-mails & Notifications Brevo
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  API Brevo v3
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-bold shrink-0">
                  @nanasore.com
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Expéditeur certifié : <strong className="text-slate-200">{senderName}</strong> &lt;{senderEmail}&gt;
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0 border border-slate-700/60"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* =========================================================================
            CORPS & FORMULAIRE DE RÉDACTION
           ========================================================================= */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Notification / Feedback d'envoi */}
          {feedback && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-150 ${
              feedback.success 
                ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200' 
                : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
            }`}>
              {feedback.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0 text-xs sm:text-sm">
                <p className="font-bold">{feedback.message}</p>
                {feedback.messageId && (
                  <p className="font-mono text-[11px] text-emerald-400/90 mt-1">
                    Accusé de réception Brevo ID : {feedback.messageId}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 1. SECTION DESTINATAIRES */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Destinataire(s) (E-mail unique ou liste séparée par virgule)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Sélection rapide de groupe :
              </span>
            </div>

            {/* Pills de sélection rapide de groupes */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {RECIPIENT_GROUPS.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setRecipientInput(group.emails);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-blue-500/60 hover:bg-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition cursor-pointer shrink-0 flex items-center gap-1.5"
                  title={`Pré-remplir avec : ${group.emails}`}
                >
                  <span>{group.label}</span>
                </button>
              ))}
            </div>

            <input
              type="text"
              value={recipientInput}
              onChange={(e) => setRecipientInput(e.target.value)}
              placeholder="ex: admin@nanasore.com, client@domaine.com, partenaire@gmail.com"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* 2. SECTION EXPÉDITEUR & SUJET */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expéditeur */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Expéditeur Officiel (@nanasore.com)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Nom expéditeur"
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  placeholder="admin@nanasore.com"
                  className="w-1/2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-emerald-400 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sujet de l'E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Sujet de l'e-mail
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Indiquez l'objet du message..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white font-semibold placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Suggestions de Sujets Rapides */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] text-slate-400">
            <span className="shrink-0 font-semibold text-slate-500">Sujets suggérés :</span>
            {QUICK_SUBJECTS.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  playTapBeep();
                  setSubject(s);
                }}
                className="px-2 py-0.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 truncate max-w-[220px] transition cursor-pointer"
                title={s}
              >
                {s}
              </button>
            ))}
          </div>

          {/* 3. SECTION ÉDITEUR DU CORPS DU MESSAGE */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Corps du Message (HTML / Markdown Enrichi)</span>
              </label>

              {/* Bascules Mode Rendu / Source */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-900 rounded-xl p-0.5 border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setViewMode('EDIT')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'EDIT' 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Code className="w-3 h-3" />
                    <span>Éditeur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('PREVIEW')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      viewMode === 'PREVIEW' 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>Aperçu Réel</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Barre d'outils de formatage rapide */}
            {viewMode === 'EDIT' && (
              <div className="flex items-center gap-1.5 flex-wrap p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => insertFormatting('b')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
                  title="Gras"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('i')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
                  title="Italique"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('h2')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition"
                  title="Sous-titre H2"
                >
                  <Heading className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('btn')}
                  className="px-2.5 py-1 rounded bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 border border-blue-500/40 text-xs font-bold transition"
                  title="Bouton d'Action Bleu"
                >
                  + Bouton CTA
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('callout')}
                  className="px-2.5 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/40 text-xs font-bold transition"
                  title="Encadré d'information"
                >
                  + Encadré Info
                </button>
                <button
                  type="button"
                  onClick={() => insertFormatting('hr')}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
                  title="Séparateur horizontal"
                >
                  — Ligne
                </button>
              </div>
            )}

            {/* Zone de saisie OU Aperçu */}
            {viewMode === 'EDIT' ? (
              <textarea
                value={htmlContent}
                onChange={(e) => setHtmlContent(e.target.value)}
                rows={9}
                placeholder="Rédigez le contenu de votre message en HTML ou texte enrichi..."
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-blue-500"
              />
            ) : (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 max-h-[350px] overflow-y-auto">
                <div className="max-w-lg mx-auto bg-white text-slate-900 rounded-xl p-5 shadow-lg">
                  <div className="bg-[#0B1E48] text-white p-3 rounded-lg text-center mb-4">
                    <h4 className="text-sm font-black m-0">Nanasore & Commerce</h4>
                    <p className="text-[10px] text-blue-300 m-0">Expédié via Brevo API v3</p>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: htmlContent }} 
                  />
                  <div className="mt-5 pt-3 border-t border-slate-200 text-[10px] text-slate-500 text-center">
                    Nanasore Team &lt;admin@nanasore.com&gt;
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            FOOTER / ACTIONS D'ENVOI
           ========================================================================= */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-400 hidden sm:block">
            Connecté à <strong className="text-emerald-400">api.brevo.com/v3/smtp/email</strong> (Relais Transactionnel)
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Fermer
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={isSending}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-black shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Envoi via Brevo...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <span>Envoyer l'E-mail</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BrevoEmailComposerModal;

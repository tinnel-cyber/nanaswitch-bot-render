import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Lock,
  Mail,
  Phone,
  User,
  GraduationCap,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { loginStudent, registerStudent, navigateToStudentDashboard, StudentAccount } from '../../../services/studentAuthService';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface StudentAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
  onAuthSuccess?: (student: StudentAccount) => void;
}

export const StudentAuthModal: React.FC<StudentAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onAuthSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Champs Formulaire
  const [identifier, setIdentifier] = useState(''); // Pour login (email ou tél)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    playTapBeep();

    try {
      if (mode === 'login') {
        const res = loginStudent(identifier, password);
        if (!res.success || !res.student) {
          setError(res.error || 'Erreur lors de la connexion.');
          setIsLoading(false);
          return;
        }
        playValidationBeep();
        if (onAuthSuccess) {
          onAuthSuccess(res.student);
        } else {
          navigateToStudentDashboard();
        }
        onClose();
      } else {
        const res = registerStudent({
          fullName,
          email,
          phoneNumber,
          password
        });
        if (!res.success || !res.student) {
          setError(res.error || "Erreur lors de l'inscription.");
          setIsLoading(false);
          return;
        }
        playValidationBeep();
        if (onAuthSuccess) {
          onAuthSuccess(res.student);
        } else {
          navigateToStudentDashboard();
        }
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Une erreur inattendue est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Flouté */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        />

        {/* Conteneur Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden z-10"
        >
          {/* En-Tête Supérieur */}
          <div className="bg-gradient-to-br from-[#0056D2] to-[#003C96] p-6 text-white text-center relative">
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              title="Fermer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md mx-auto flex items-center justify-center mb-3 shadow-inner">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>

            <h3 className="text-xl font-black tracking-tight">Espace Élève &amp; Académie</h3>
            <p className="text-xs text-blue-100 mt-1 max-w-xs mx-auto">
              Accédez à vos masterclasses, cours vidéo et certificats officiels.
            </p>

            {/* Commutateur de Mode (Se connecter / S'inscrire) */}
            <div className="flex bg-black/20 p-1 rounded-2xl mt-5 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  playTapBeep();
                }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
                  mode === 'login'
                    ? 'bg-white text-[#0056D2] shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  playTapBeep();
                }}
                className={`flex-1 py-2 text-xs font-black rounded-xl transition ${
                  mode === 'register'
                    ? 'bg-white text-[#0056D2] shadow-md'
                    : 'text-white/80 hover:text-white'
                }`}
              >
                S&apos;inscrire
              </button>
            </div>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {mode === 'login' ? (
              /* ================= MODE CONNEXION ================= */
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Email ou Numéro de téléphone
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="ex: +226 70 00 00 00 ou eleve@mail.com"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700">
                      Mot de passe
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#0056D2] to-[#0046AB] hover:opacity-95 text-white font-black text-xs sm:text-sm shadow-xl shadow-blue-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-2"
                >
                  <span>Accéder à mon Espace Étudiant</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <p className="text-center text-xs text-slate-500 pt-2">
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      setError(null);
                    }}
                    className="text-[#0056D2] font-black hover:underline cursor-pointer"
                  >
                    Créer mon compte élève
                  </button>
                </p>
              </>
            ) : (
              /* ================= MODE INSCRIPTION ================= */
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Nom &amp; Prénom
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="ex: Ibrahim Konkobo"
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Numéro WhatsApp / Tél
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="ex: +226 70 00 00 00"
                        className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent bg-slate-50/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="eleve@mail.com"
                        className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent bg-slate-50/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={4}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 4 caractères"
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0056D2] focus:border-transparent bg-slate-50/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-50 mt-2"
                >
                  <span>Créer mon compte &amp; Accéder au Campus</span>
                  <CheckCircle2 className="w-4 h-4" />
                </button>

                <p className="text-center text-xs text-slate-500 pt-2">
                  Déjà inscrit ?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-[#0056D2] font-black hover:underline cursor-pointer"
                  >
                    Se connecter
                  </button>
                </p>
              </>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default StudentAuthModal;

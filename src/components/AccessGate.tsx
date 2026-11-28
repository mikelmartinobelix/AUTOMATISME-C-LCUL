import { FormEvent, useState } from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';
import { ClassGroup, EsoCourse, StudentProfile } from '../types/math';
import { verifyClassroomPassword } from '../utils/accessAuth';

interface AccessGateProps {
  existingProfiles: StudentProfile[];
  onAuthenticate: (name: string, course: EsoCourse, group: ClassGroup) => void;
}

const COURSES: EsoCourse[] = ["1r d'ESO", "2n d'ESO", "3r d'ESO", "4t d'ESO"];
const GROUPS: ClassGroup[] = ['A', 'B', 'C'];

export function AccessGate({ existingProfiles, onAuthenticate }: AccessGateProps) {
  const [fullName, setFullName] = useState('');
  const [course, setCourse] = useState<EsoCourse>("1r d'ESO");
  const [group, setGroup] = useState<ClassGroup>('A');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const savedNamedProfiles = existingProfiles.filter(
    (p) => p.name.trim().toLowerCase() !== 'classe 1'
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const cleanedName = fullName.trim();
    if (cleanedName.length < 2) {
      setErrorMsg('Introdueix el teu nom i cognoms per començar.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const ok = await verifyClassroomPassword(password);
      if (!ok) {
        setErrorMsg('Contrasenya incorrecta. Torna-ho a provar.');
        return;
      }
      onAuthenticate(cleanedName, course, group);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="space-y-1.5 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between gap-4">
            <span className="font-display text-2xl font-bold tracking-tight text-slate-900">
              CalculaRàpid
            </span>
            <span className="text-xs font-medium text-slate-500">Accés d’aula</span>
          </div>
          <p className="text-sm text-slate-600">
            Identifica’t amb les teves dades i la contrasenya de classe per practicar automatismes de càlcul.
          </p>
        </div>

        {savedNamedProfiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-600">Perfils guardats en aquest equip</p>
            <div className="flex flex-wrap gap-2">
              {savedNamedProfiles.slice(0, 6).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setFullName(p.name);
                    setCourse(p.course);
                    setGroup(p.group);
                    setErrorMsg('');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 transition-colors cursor-pointer"
                >
                  {p.name} · {p.course} {p.group}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Nom i Cognoms */}
          <div className="space-y-1.5">
            <label htmlFor="access-fullname" className="block text-xs font-semibold text-slate-700">
              Nom i Cognoms
            </label>
            <input
              id="access-fullname"
              type="text"
              autoComplete="name"
              maxLength={60}
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Ex: Marta Soler Puig"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
            />
          </div>

          {/* Curs (1r, 2n, 3r, 4t d'ESO) */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700">Curs</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COURSES.map((item) => {
                const active = course === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCourse(item)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-sky-50 border-sky-400 text-sky-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Classe (A, B, C) */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-slate-700">Classe</span>
            <div className="grid grid-cols-3 gap-2">
              {GROUPS.map((item) => {
                const active = group === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGroup(item)}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-sky-50 border-sky-400 text-sky-900'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Classe {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contrasenya */}
          <div className="space-y-1.5">
            <label htmlFor="access-password" className="block text-xs font-semibold text-slate-700">
              Contrasenya
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="access-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="off"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Introdueix la contrasenya d'accés"
                className="w-full pl-10 pr-11 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Amaga la contrasenya' : 'Mostra la contrasenya'}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 rounded-xl bg-sky-600 text-white font-semibold text-sm hover:bg-sky-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Entrar a practicar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

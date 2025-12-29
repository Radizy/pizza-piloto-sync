import { useEffect, useState } from 'react';
import motoGrau from '@/assets/moto-grau.png';

interface TVCallAnimationProps {
  show: boolean;
  tipo: 'ENTREGA' | 'PAGAMENTO';
  nomeMotoboy: string;
  bagNome?: string;
  callPhrase?: string;
  bagPhrase?: string;
  onComplete: () => void;
}

export const TVCallAnimation = ({ show, tipo, nomeMotoboy, bagNome, callPhrase, bagPhrase, onComplete }: TVCallAnimationProps) => {
  const [stage, setStage] = useState<'moto' | 'tela'>('moto');

  useEffect(() => {
    if (!show) return;

    const timer1 = setTimeout(() => {
      setStage('tela');
    }, 4000);

    const timer2 = setTimeout(() => {
      onComplete();
      setStage('moto');
    }, 14000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [show, onComplete]);

  const isEntrega = tipo === 'ENTREGA';
  const isPagamento = tipo === 'PAGAMENTO';
  const bgColor = isPagamento
    ? 'from-emerald-900 via-emerald-800 to-emerald-950'
    : 'from-sky-900 via-sky-800 to-sky-950';
  const accentColor = isPagamento ? 'text-emerald-300' : 'text-sky-300';
  const iconBg = isPagamento ? 'bg-emerald-500' : 'bg-sky-500';

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden animate-fade-in">
      {/* Fase 1: moto puxando a tela */}
      {stage === 'moto' && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-950 flex items-center justify-center overflow-hidden">
          <div className="relative w-full h-full">
            <div className="absolute inset-0 flex items-end justify-start">
              <img
                src={motoGrau}
                alt="Motoboy dando grau puxando a tela de chamada"
                className="w-[55vh] max-w-[520px] translate-y-4 animate-moto-wheelie drop-shadow-2xl"
              />
            </div>

            {/* Tela sendo puxada pelo lado direito */}
            <div
              className={`absolute inset-y-0 right-0 w-full bg-gradient-to-br ${bgColor} animate-screen-pull`}
              style={{ transformOrigin: 'right' }}
            />

            {/* Mensagem discreta enquanto puxa */}
            <div className="absolute inset-0 flex flex-col items-end justify-center pr-24 pointer-events-none">
              <p className="text-4xl md:text-5xl font-black text-white/80 drop-shadow-lg mb-3 text-right">
                {tipo === 'PAGAMENTO' ? 'Preparando o pagamento...' : 'Chamando para entrega...'}
              </p>
              <p className="text-3xl md:text-4xl font-semibold text-white/70 text-right max-w-2xl">
                {nomeMotoboy}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fase 2: tela cheia com texto principal */}
      {stage === 'tela' && (
        <div
          className={`animate-scale-in absolute inset-0 bg-gradient-to-br ${bgColor} flex flex-col items-center justify-center px-6 md:px-16 text-center`}
        >
          <div className={`animate-pulse-custom ${iconBg} w-44 h-44 md:w-56 md:h-56 rounded-full flex items-center justify-center mb-10 shadow-2xl`}>
            {isEntrega ? (
              <svg className="w-24 h-24 md:w-32 md:h-32 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            ) : (
              <svg className="w-24 h-24 md:w-32 md:h-32 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <h1
            className={`animate-pulse-slow text-[7vw] md:text-[5vw] leading-none font-black ${accentColor} mb-6 tracking-wider`}
          >
            {tipo === 'PAGAMENTO' ? 'AGORA É SUA VEZ' : 'ENTREGA CHAMADA'}
          </h1>

          <div className="animate-slide-up max-w-5xl mx-auto space-y-4">
            <p className="text-3xl md:text-4xl text-white/80 font-semibold">
              {tipo === 'PAGAMENTO'
                ? `Agora é sua vez, ${nomeMotoboy}!`
                : callPhrase || `É a sua vez "${nomeMotoboy}"`}
            </p>
            {tipo === 'ENTREGA' && (bagPhrase || bagNome) && (
              <p className="text-2xl md:text-3xl text-white/80 font-semibold">
                {bagPhrase || `Pegue a "${bagNome}"`}
              </p>
            )}
            <p className="text-[6vw] md:text-[4.5vw] font-black text-white tracking-wide break-words">
              {nomeMotoboy}
            </p>
          </div>

          <div className={`animate-ping-slow absolute bottom-10 w-24 h-24 md:w-32 md:h-32 ${iconBg} rounded-full opacity-20`} />

          <style>{`
            @keyframes moto-wheelie {
              0% { transform: translateX(-40%) translateY(20%) rotate(-8deg); opacity: 0; }
              15% { transform: translateX(-20%) translateY(8%) rotate(-18deg); opacity: 1; }
              60% { transform: translateX(10%) translateY(0) rotate(-25deg); opacity: 1; }
              100% { transform: translateX(40%) translateY(10%) rotate(-30deg); opacity: 0.9; }
            }
            @keyframes screen-pull {
              0% { transform: scaleX(0); }
              100% { transform: scaleX(1); }
            }
            @keyframes pulse-custom {
              0%, 100% { transform: scale(1) rotate(0deg); }
              50% { transform: scale(1.08) rotate(4deg); }
            }
            @keyframes pulse-slow {
              0%, 100% { transform: scale(1); }
              50% { transform: scale(1.04); }
            }
            @keyframes slide-up {
              0% { transform: translateY(24px); opacity: 0; }
              100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes ping-slow {
              0%, 100% { transform: scale(1); opacity: 0.18; }
              50% { transform: scale(1.25); opacity: 0.45; }
            }

            .animate-moto-wheelie {
              animation: moto-wheelie 4s ease-in-out forwards;
            }
            .animate-screen-pull {
              animation: screen-pull 4s ease-in-out forwards;
            }
            .animate-scale-in {
              animation: fade-in 0.5s ease-out forwards;
            }
            .animate-pulse-custom {
              animation: pulse-custom 2s ease-in-out infinite;
            }
            .animate-pulse-slow {
              animation: pulse-slow 1.5s ease-in-out infinite;
            }
            .animate-slide-up {
              animation: slide-up 0.5s ease-out 0.3s backwards;
            }
            .animate-ping-slow {
              animation: ping-slow 1.2s ease-in-out infinite;
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

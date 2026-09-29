import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 ${
      isDark ? 'bg-neutral-950 text-neutral-100' : 'bg-neutral-50 text-neutral-900'
    }`}>
      <div className={`w-full max-w-md p-8 rounded-3xl border text-center ${
        isDark ? 'bg-neutral-900/40 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center text-emerald-400 mb-4">
          <Radio className="w-6 h-6 animate-pulse" />
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight font-mono tabular-nums text-emerald-500">
          404
        </h1>
        <h2 className="text-lg font-bold mt-2 text-inherit">
          Page Not Found
        </h2>
        <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
          The page you&apos;re looking for doesn&apos;t exist.
        </p>

        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Home</span>
          </button>
        </div>
      </div>
    </div>
  );
};

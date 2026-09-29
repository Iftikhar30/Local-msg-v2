import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { KeyRound, ShieldCheck, AlertCircle, Loader2, QrCode, ArrowLeft, Camera } from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';

export const ConnectCodePage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, connectByCode, openConnectModal } = useLocalLink();
  const { isDark } = useTheme();

  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [isSearching, setIsSearching] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);

  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');

    if (!cleanVal) {
      const updated = [...digits];
      updated[index] = '';
      setDigits(updated);
      setCodeError(null);
      return;
    }

    const single = cleanVal.slice(-1);
    const updated = [...digits];
    updated[index] = single;
    setDigits(updated);
    setCodeError(null);

    if (index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputRefs[index + 1].current?.focus();
    } else if (e.key === 'Enter') {
      handleCodeSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const paste = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (paste.length >= 4) {
      const newDigits = paste.slice(0, 4).split('');
      setDigits(newDigits);
      inputRefs[3].current?.focus();
      setCodeError(null);
    }
  };

  const handleCodeSubmit = async () => {
    const fullCode = digits.join('');
    if (fullCode.length !== 4) {
      setCodeError('Please enter all 4 digits of the device code.');
      return;
    }

    if (fullCode === profile.deviceCode) {
      setCodeError('This is your own device code. Enter the 4-digit code from the other device.');
      return;
    }

    setIsSearching(true);
    setCodeError(null);

    const result = await connectByCode(fullCode);
    setIsSearching(false);

    if (result.success) {
      if (result.device) {
        navigate(`/chats/${result.device.deviceId}`);
      } else {
        navigate('/devices');
      }
    } else {
      setCodeError(result.message || `No active device found with code "${fullCode}" on this LAN.`);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      <div className="flex items-center gap-3 mb-2">
        <Link
          to="/connect"
          className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-inherit">
            Enter 4-Digit PIN
          </h1>
          <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Manual PIN Pairing on Wi-Fi
          </p>
        </div>
      </div>

      <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="text-center">
          <p className="text-sm font-medium text-inherit">
            Enter the 4-digit code shown on the other device
          </p>
          <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'} mt-1`}>
            Ensure both devices are on the same Wi-Fi network.
          </p>
        </div>

        {/* 4 Pin Input Boxes */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 my-8">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={idx === 0 ? handlePaste : undefined}
              className={`w-14 h-16 sm:w-16 sm:h-18 text-center text-3xl font-mono font-bold rounded-2xl border transition-all duration-150 outline-none ${
                digit
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950/40'
                  : isDark
                  ? 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500/60 focus:bg-neutral-900'
                  : 'bg-neutral-50 border-neutral-300 text-neutral-900 focus:border-emerald-500 focus:bg-white'
              }`}
              disabled={isSearching}
            />
          ))}
        </div>

        {codeError && (
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-6 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{codeError}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleCodeSubmit}
          disabled={isSearching || digits.join('').length !== 4}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-950 cursor-pointer"
        >
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Searching LAN for device...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Connect Now</span>
            </>
          )}
        </button>

        <div className="mt-6 pt-4 border-t border-inherit flex items-center justify-between text-xs text-neutral-400">
          <span>Your code: <strong className="font-mono text-emerald-400">#{profile.deviceCode}</strong></span>
          <Link
            to="/connect/scan"
            className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            <Camera className="w-3.5 h-3.5" />
            Scan QR Instead
          </Link>
        </div>
      </div>
    </div>
  );
};

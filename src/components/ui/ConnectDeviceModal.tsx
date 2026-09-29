import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  QrCode,
  KeyRound,
  Camera,
  Upload,
  Copy,
  Check,
  RefreshCw,
  Download,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useLocalLink } from '../../context/LocalLinkContext';
import { ConnectModalTab } from '../../types';
import { QRService } from '../../services/qr';
import { ConfirmDialog } from './ConfirmDialog';
import { sound } from '../../services/sound';

export const ConnectDeviceModal: React.FC = () => {
  const {
    isConnectModalOpen,
    connectModalTab,
    openConnectModal,
    closeConnectModal,
    profile,
    networkInfo,
    connectByCode,
    connectByQr,
    generateNewDeviceCode,
    addToast,
  } = useLocalLink();

  const [activeTab, setActiveTab] = useState<ConnectModalTab>('code');

  // 4-Digit Code state
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [isSearching, setIsSearching] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // QR Display state
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const lastRenderedQrRef = useRef<string>('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // Camera Scanner state
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Keep modal tab in sync with context
  useEffect(() => {
    if (isConnectModalOpen) {
      setActiveTab(connectModalTab || 'code');
      setCodeError(null);
      setDigits(['', '', '', '']);
    }
  }, [isConnectModalOpen, connectModalTab]);

  // Focus first digit when opening Code tab
  useEffect(() => {
    if (isConnectModalOpen && activeTab === 'code') {
      setTimeout(() => {
        inputRefs[0].current?.focus();
      }, 150);
    }
  }, [isConnectModalOpen, activeTab]);

  // Render QR Code onto Canvas when viewing 'my-qr' tab (stable, non-flickering)
  useEffect(() => {
    if (isConnectModalOpen && activeTab === 'my-qr' && qrCanvasRef.current) {
      const qrData = QRService.formatDeviceQrString(profile);
      if (lastRenderedQrRef.current !== qrData) {
        lastRenderedQrRef.current = qrData;
        QRService.renderToCanvas(qrCanvasRef.current, qrData);
      }
    } else if (!isConnectModalOpen) {
      lastRenderedQrRef.current = '';
    }
  }, [isConnectModalOpen, activeTab, profile.deviceCode, profile.deviceId, profile.deviceName, profile.deviceType]);

  // Handle Camera Scanning
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser environment. You can upload a QR image or enter the 4-digit code.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        requestScanFrame();
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission was denied. Please allow camera access or use the 4-digit code / upload QR.'
          : 'Unable to start camera. Please upload an image or enter the 4-digit code.'
      );
      setIsCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  const requestScanFrame = useCallback(() => {
    if (!videoRef.current || !scanCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = scanCanvasRef.current;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = QRService.decodeImageData(imageData);

        if (decoded) {
          sound.playSuccessSound();
          stopCamera();
          handleQrResult(decoded);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(requestScanFrame);
  }, [stopCamera]);

  useEffect(() => {
    if (isConnectModalOpen && activeTab === 'qr-scan') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isConnectModalOpen, activeTab, startCamera, stopCamera]);

  if (!isConnectModalOpen) return null;

  // Handle 4-digit Code input interactions
  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, ''); // Digits only

    if (!cleanVal) {
      const updated = [...digits];
      updated[index] = '';
      setDigits(updated);
      setCodeError(null);
      return;
    }

    // Single digit input
    const single = cleanVal.slice(-1);
    const updated = [...digits];
    updated[index] = single;
    setDigits(updated);
    setCodeError(null);

    // Auto-advance to next box
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
      setCodeError('This is your own device code. Please enter the other device\'s 4-digit code.');
      return;
    }

    setIsSearching(true);
    setCodeError(null);

    const result = await connectByCode(fullCode);
    setIsSearching(false);

    if (result.success) {
      closeConnectModal();
    } else {
      setCodeError(result.message || 'No device found with this 4-digit code on LAN.');
    }
  };

  const handleQrResult = async (decodedString: string) => {
    setIsSearching(true);
    const result = await connectByQr(decodedString);
    setIsSearching(false);

    if (result.success) {
      closeConnectModal();
    } else {
      addToast({
        title: 'Connection Failed',
        message: result.message || 'Could not connect using this QR code.',
        type: 'error',
      });
      setActiveTab('code');
      setCodeError(result.message || 'Unable to connect to scanned device.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const decoded = await QRService.decodeFromFile(file);
    if (decoded) {
      sound.playSuccessSound();
      handleQrResult(decoded);
    } else {
      addToast({
        title: 'QR Not Detected',
        message: 'Could not read a valid LocalLink QR code from the selected image.',
        type: 'error',
      });
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(profile.deviceCode);
      setCopiedCode(true);
      sound.playMessageSound();
      addToast({
        title: 'Code Copied',
        message: `Device code ${profile.deviceCode} copied to clipboard.`,
        type: 'success',
      });
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadQr = () => {
    if (!qrCanvasRef.current) return;
    const link = document.createElement('a');
    link.download = `locallink-qr-${profile.deviceCode}.png`;
    link.href = qrCanvasRef.current.toDataURL('image/png');
    link.click();
    addToast({
      title: 'QR Saved',
      message: 'QR code image downloaded.',
      type: 'success',
    });
  };

  const handleConfirmRegenerate = () => {
    generateNewDeviceCode();
    setShowRegenConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 md:p-7 shadow-2xl text-neutral-100 animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                LAN Device Connection
              </h2>
              <p className="text-xs text-neutral-400">
                Connect directly over local Wi-Fi without Internet
              </p>
            </div>
          </div>
          <button
            onClick={closeConnectModal}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex p-1 bg-neutral-950/80 rounded-2xl border border-neutral-800 my-5">
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'code'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>4-Digit Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('qr-scan')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'qr-scan'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan QR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my-qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'my-qr'
                ? 'bg-neutral-800 text-emerald-400 shadow-sm border border-neutral-700/60'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900/50'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>My Code & QR</span>
          </button>
        </div>

        {/* TAB 1: 4-Digit Code Entry */}
        {activeTab === 'code' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="text-center">
              <p className="text-sm text-neutral-300 font-medium">
                Enter the 4-digit code from the other device
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                Both devices must be connected to the same Wi-Fi network.
              </p>
            </div>

            {/* 4 Pin Input Boxes */}
            <div className="flex items-center justify-center gap-3 md:gap-4 my-6">
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
                  className={`w-14 h-16 md:w-16 md:h-18 text-center text-3xl font-mono font-bold rounded-2xl border transition-all duration-150 outline-none ${
                    digit
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-950/40'
                      : 'bg-neutral-950 border-neutral-800 text-white focus:border-emerald-500/60 focus:bg-neutral-900'
                  }`}
                  disabled={isSearching}
                />
              ))}
            </div>

            {codeError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{codeError}</span>
              </div>
            )}

            {/* Submit button */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleCodeSubmit}
                disabled={isSearching || digits.join('').length !== 4}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none transition-all shadow-lg shadow-emerald-950"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Searching on LAN...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Connect Device</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-neutral-400 pt-2 border-t border-neutral-800/80">
                <span>Your code: <strong className="font-mono text-emerald-400 text-sm">#{profile.deviceCode}</strong></span>
                <button
                  type="button"
                  onClick={() => setActiveTab('my-qr')}
                  className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  Show My QR
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Scan QR Code */}
        {activeTab === 'qr-scan' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="relative w-full aspect-square max-h-72 bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 flex items-center justify-center">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
              />
              <canvas ref={scanCanvasRef} className="hidden" />

              {/* Viewfinder overlay */}
              {isCameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="relative w-48 h-48 border-2 border-emerald-400/80 rounded-2xl">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />
                    
                    {/* Laser Scanner animation */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-pulse absolute top-1/2 -translate-y-1/2" />
                  </div>
                  <span className="mt-3 text-[11px] font-medium text-emerald-300/90 bg-neutral-900/80 px-3 py-1 rounded-full backdrop-blur-sm">
                    Align QR code within the frame
                  </span>
                </div>
              )}

              {!isCameraActive && !cameraError && (
                <div className="flex flex-col items-center justify-center p-6 text-center text-neutral-400">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
                  <p className="text-xs">Initializing camera feed...</p>
                </div>
              )}

              {cameraError && (
                <div className="p-6 text-center text-neutral-300">
                  <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                  <p className="text-xs text-neutral-300 max-w-xs mx-auto">{cameraError}</p>
                </div>
              )}
            </div>

            {/* Camera controls & Image upload fallback */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Flip Camera
              </button>

              <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload QR Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* TAB 3: My Code & QR Display */}
        {activeTab === 'my-qr' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            <div className="flex flex-col items-center text-center">
              
              {/* QR Canvas Box */}
              <div className="p-4 bg-white rounded-3xl shadow-xl border border-neutral-200 flex items-center justify-center my-1">
                <canvas ref={qrCanvasRef} width={260} height={260} className="w-52 h-52 md:w-56 md:h-56" />
              </div>

              {/* Big 4-Digit Code Display */}
              <div className="mt-4 text-center">
                <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Your Device Connection Code
                </span>
                <div className="mt-1 flex items-center justify-center gap-2">
                  <span className="text-4xl md:text-5xl font-mono font-extrabold tracking-widest text-emerald-400 bg-neutral-950 px-6 py-2 rounded-2xl border border-emerald-500/30 shadow-inner">
                    {profile.deviceCode}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-2">
                  {profile.deviceName} &bull; {networkInfo?.localIp || 'Local LAN'}
                </p>
              </div>
            </div>

            {/* Actions for My Code */}
            <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadQr}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save QR</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-xs font-semibold text-amber-400 border border-neutral-700/60 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Code</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Confirmation Dialog for Regenerating 4-Digit Code */}
      <ConfirmDialog
        isOpen={showRegenConfirm}
        title="Generate New 4-Digit Code?"
        message="Generating a new connection code will invalidate the previous code. Other devices will need your new code to connect."
        confirmText="Generate New Code"
        cancelText="Keep Current"
        variant="warning"
        onConfirm={handleConfirmRegenerate}
        onCancel={() => setShowRegenConfirm(false)}
      />
    </div>
  );
};

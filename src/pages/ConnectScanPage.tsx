import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera,
  ArrowLeft,
  RefreshCw,
  Upload,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useLocalLink } from '../context/LocalLinkContext';
import { useTheme } from '../context/ThemeContext';
import { QRService } from '../services/qr';
import { sound } from '../services/sound';

export const ConnectScanPage: React.FC = () => {
  const navigate = useNavigate();
  const { connectByQr, addToast } = useLocalLink();
  const { isDark } = useTheme();

  const videoRef = useRef<HTMLVideoElement>(null);
  const scanCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isProcessing, setIsProcessing] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const handleQrResult = useCallback(
    async (decodedString: string) => {
      setIsProcessing(true);
      const result = await connectByQr(decodedString);
      setIsProcessing(false);

      if (result.success) {
        if (result.device) {
          navigate(`/chats/${result.device.deviceId}`);
        } else {
          navigate('/devices');
        }
      } else {
        addToast({
          title: 'Connection Failed',
          message: result.message || 'Could not connect using this QR code.',
          type: 'error',
        });
      }
    },
    [connectByQr, navigate, addToast]
  );

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
  }, [stopCamera, handleQrResult]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported in this browser. You can upload an image or enter the 4-digit code.');
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
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission denied. Please allow camera access or enter the 4-digit code.'
          : 'Unable to start camera. Please upload an image or enter the 4-digit code.'
      );
      setIsCameraActive(false);
    }
  }, [facingMode, stopCamera, requestScanFrame]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const decoded = await QRService.decodeFromFile(file);
    if (decoded) {
      sound.playSuccessSound();
      stopCamera();
      handleQrResult(decoded);
    } else {
      addToast({
        title: 'QR Not Detected',
        message: 'Could not detect a valid LocalLink QR code in this image.',
        type: 'error',
      });
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
            Scan QR Code
          </h1>
          <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
            Live Camera Scanner for LocalLink QR
          </p>
        </div>
      </div>

      <div className={`p-6 rounded-3xl border space-y-5 transition-all ${
        isDark ? 'bg-neutral-900/60 border-neutral-800' : 'bg-white border-neutral-200'
      }`}>
        <div className="relative w-full aspect-square max-h-80 bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-800 flex items-center justify-center">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
          />
          <canvas ref={scanCanvasRef} className="hidden" />

          {/* Viewfinder overlay */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="relative w-52 h-52 border-2 border-emerald-400/80 rounded-2xl">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1 rounded-tl" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1 rounded-tr" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1 rounded-bl" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1 rounded-br" />

                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#10b981] animate-pulse absolute top-1/2 -translate-y-1/2" />
              </div>
              <span className="mt-3 text-[11px] font-medium text-emerald-300/90 bg-neutral-900/80 px-3 py-1 rounded-full backdrop-blur-sm">
                Align QR code within the frame
              </span>
            </div>
          )}

          {isProcessing && (
            <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs text-neutral-200">Connecting to scanned device...</p>
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

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
            }}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Flip Camera
          </button>

          <label className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700/80 text-xs font-semibold text-neutral-200 border border-neutral-700/60 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload QR Image</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <div className="pt-2 border-t border-inherit flex items-center justify-between text-xs text-neutral-400">
          <Link
            to="/connect/code"
            className="text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
          >
            <KeyRound className="w-3.5 h-3.5" />
            Enter 4-Digit PIN Instead
          </Link>
          <Link to="/devices" className="text-neutral-400 hover:text-neutral-200">
            View All LAN Devices
          </Link>
        </div>
      </div>
    </div>
  );
};

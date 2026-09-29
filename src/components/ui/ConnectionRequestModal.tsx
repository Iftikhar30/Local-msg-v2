import React from 'react';
import { Laptop, Smartphone, Tablet, Monitor, ShieldCheck, Check, X } from 'lucide-react';
import { useLocalLink } from '../../context/LocalLinkContext';

export const ConnectionRequestModal: React.FC = () => {
  const { pendingConnectionRequest, acceptConnection, rejectConnection, dismissPendingRequest } = useLocalLink();

  if (!pendingConnectionRequest) return null;

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'phone':
        return <Smartphone className="w-8 h-8 text-emerald-400" />;
      case 'tablet':
        return <Tablet className="w-8 h-8 text-emerald-400" />;
      case 'desktop':
        return <Monitor className="w-8 h-8 text-emerald-400" />;
      default:
        return <Laptop className="w-8 h-8 text-emerald-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-neutral-100 animate-in zoom-in-95 duration-200">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-neutral-800 border border-neutral-700/80 flex items-center justify-center shadow-inner mb-4">
            {getDeviceIcon(pendingConnectionRequest.fromDeviceType)}
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>LAN Peer Request</span>
          </div>

          <h3 className="text-lg font-semibold tracking-tight text-white">
            Connection Request
          </h3>

          <p className="mt-2 text-sm text-neutral-300">
            <span className="font-semibold text-emerald-400">{pendingConnectionRequest.fromDeviceName}</span>
            {pendingConnectionRequest.fromDeviceCode && (
              <span className="ml-1.5 px-2 py-0.5 rounded-md bg-neutral-800 border border-neutral-700 text-xs font-mono font-bold text-amber-400">
                #{pendingConnectionRequest.fromDeviceCode}
              </span>
            )}
            {' '}wants to connect with your device.
          </p>

          <p className="mt-1 text-xs text-neutral-400">
            Accepting will allow private real-time messaging and fast file sharing over your local Wi-Fi.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => rejectConnection(pendingConnectionRequest)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700/80 hover:text-white rounded-xl transition-colors border border-neutral-700/50"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
          <button
            type="button"
            onClick={() => acceptConnection(pendingConnectionRequest)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-md shadow-emerald-950"
          >
            <Check className="w-4 h-4" />
            Accept
          </button>
        </div>

        <button
          onClick={dismissPendingRequest}
          className="w-full text-center mt-3 text-[11px] text-neutral-400 hover:text-neutral-300 transition-colors"
        >
          Dismiss for now
        </button>
      </div>
    </div>
  );
};

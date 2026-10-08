import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, HardDrive, WifiOff, X, RefreshCw } from 'lucide-react';
import { checkOfflineMapStatus, downloadRegionMapTiles } from '../utils/offlineMap';
import { OfflineMapStatus } from '../types';

interface OfflineMapManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: OfflineMapStatus) => void;
}

export const OfflineMapManager: React.FC<OfflineMapManagerProps> = ({
  isOpen,
  onClose,
  onStatusChange
}) => {
  const [status, setStatus] = useState<OfflineMapStatus>({
    isCached: false,
    cachedCount: 0,
    totalTiles: 0,
    isDownloading: false,
    downloadProgress: 0
  });

  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    loadStatus();
  }, [isOpen]);

  const loadStatus = async () => {
    const s = await checkOfflineMapStatus();
    setStatus(s);
    if (onStatusChange) onStatusChange(s);
  };

  const handleDownload = async () => {
    if (!navigator.onLine) {
      setMessage('Please connect to the internet once to download the regional offline map tiles.');
      return;
    }

    setStatus(prev => ({ ...prev, isDownloading: true, downloadProgress: 0 }));
    setMessage('Downloading map tiles for Kolhapur, Kodoli, Talsande & highways...');

    const success = await downloadRegionMapTiles((progress, cached, total) => {
      setStatus(prev => ({
        ...prev,
        cachedCount: cached,
        totalTiles: total,
        downloadProgress: progress
      }));
    });

    if (success) {
      setMessage('✅ Kolhapur & surrounding areas saved for 100% offline navigation!');
      const updated = await checkOfflineMapStatus();
      setStatus(updated);
      if (onStatusChange) onStatusChange(updated);
    } else {
      setMessage('Download interrupted. You can retry anytime.');
      setStatus(prev => ({ ...prev, isDownloading: false }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <HardDrive size={22} className="text-emerald-200" />
              <h2 className="text-lg font-bold">Offline Regional Map</h2>
            </div>
            <p className="text-xs text-emerald-100 mt-1">
              Store high-detail map tiles locally for zero-data usage
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          
          {/* Coverage Summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-700 space-y-1.5">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
              <span>📍 Coverage Region</span>
            </div>
            <p>• Kolhapur City & Suburbs (Tarabai Park, Rankala, University, MIDC)</p>
            <p>• Kodoli Hub & Warnanagar (Main Chowk, ST stand)</p>
            <p>• Talsande Village & D.Y. Patil Tech junction</p>
            <p>• Connecting Highway Corridors (NH-48 & SH-178)</p>
          </div>

          {/* Cache Status Badge */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border bg-gray-50/70">
            <div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Offline Cache Status
              </div>
              <div className="text-sm font-bold text-gray-900 mt-0.5 flex items-center gap-1.5">
                {status.isCached ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Ready for 100% Offline Use</span>
                  </>
                ) : (
                  <>
                    <WifiOff size={16} className="text-amber-500" />
                    <span>{status.cachedCount} / {status.totalTiles || 168} tiles cached</span>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={loadStatus}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors"
              title="Refresh status"
            >
              <RefreshCw size={15} />
            </button>
          </div>

          {/* Progress Bar (if downloading) */}
          {status.isDownloading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-gray-600 font-medium">
                <span>Downloading tiles...</span>
                <span>{status.downloadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${status.downloadProgress}%` }}
                ></div>
              </div>
              <p className="text-[11px] text-gray-500 text-center">
                {status.cachedCount} of {status.totalTiles} tiles saved to device memory
              </p>
            </div>
          )}

          {/* Message feedback */}
          {message && !status.isDownloading && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium">
              {message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              onClick={handleDownload}
              disabled={status.isDownloading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-2.5 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-sm transition-colors active:scale-98"
            >
              <Download size={16} />
              {status.isCached ? 'Update / Refresh Offline Map' : 'Download Offline Map (Free)'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center">
            * Once downloaded, the map will load immediately even with mobile data or Wi-Fi completely turned off.
          </p>
        </div>
      </div>
    </div>
  );
};

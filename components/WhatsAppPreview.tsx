import React, { useState } from 'react';
import { MessageSquare, Copy, Check, Table, Loader2 } from 'lucide-react';
import { OrderDetails } from '../types';

interface Props {
  message: string;
  order: OrderDetails;
  onSaveToSheet: () => void;
  isSaving: boolean;
}

export const WhatsAppPreview: React.FC<Props> = ({ message, order, onSaveToSheet, isSaving }) => {
  const [copied, setCopied] = useState(false);

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Helper to render basic WhatsApp formatting in the UI
  const formatMessagePreview = (text: string) => {
    const parts = text.split(/(\*[^*]+\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return <strong key={index} className="font-bold text-gray-900">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="bg-[#25D366] p-4 text-white flex items-center justify-between">
        <h2 className="font-semibold text-lg flex items-center gap-2">
          <MessageSquare size={20} />
          Message Preview
        </h2>
        <span className="text-xs bg-white/20 px-2 py-1 rounded">Ready to Send</span>
      </div>
      
      {/* Message Body */}
      <div className="p-4 bg-gray-50 min-h-[250px] text-sm">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 whitespace-pre-wrap text-gray-800 leading-relaxed font-sans relative">
          {formatMessagePreview(message)}
        </div>
      </div>

      <div className="p-4 bg-white border-t border-gray-100 flex flex-col gap-3">
        
        {/* Step 1: Send Text */}
        <a 
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-md active:scale-95"
        >
        <MessageSquare size={20} />
        Send via WhatsApp
        </a>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <button 
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 px-3 rounded-lg transition text-sm"
          >
            {copied ? <Check size={16} className="text-green-600"/> : <Copy size={16} />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>

          <button 
            onClick={onSaveToSheet}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-medium py-2 px-3 rounded-lg transition text-sm disabled:opacity-50"
          >
             {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Table size={16} />}
             Save to Sheet
          </button>
        </div>
        
        <p className="text-xs text-center text-gray-400 px-4 mt-2">
           Tip: Configure your Google Sheet URL in the settings on the left to enable tracking.
        </p>
      </div>
    </div>
  );
};
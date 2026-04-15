"use client";

import { useState, useRef } from "react";

export default function ClientForm({
  docId,
  existingMetadata,
  isSigned,
}: {
  docId: string;
  existingMetadata: any;
  isSigned: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [signed, setSigned] = useState(isSigned);
  const [signatureName, setSignatureName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);

  // --- Canvas Drawing Logic ---
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = "#aeee2a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // --- Submit Logic ---
  const handleSign = async () => {
    if (!signatureName.trim()) {
      alert("Please type your name legally before signing.");
      return;
    }
    
    // Check if canvas is practically empty (optional complexity, here we assume they signed)
    const canvas = canvasRef.current;
    const signatureDataUrl = canvas?.toDataURL("image/png");

    setLoading(true);
    try {
      const res = await fetch("/api/documents/sign", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          docId,
          signatureName,
          signatureDataUrl,
        }),
      });

      if (!res.ok) {
        throw new Error("Server failed to save signature.");
      }

      setSigned(true);
    } catch (e: any) {
      console.error(e);
      alert("Failed to sign document. " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (signed || isSigned) {
    return (
      <div className="bg-[#1e201e]/80 border border-[#aeee2a]/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 bg-[#aeee2a]/10 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl text-[#aeee2a]" translate="no">verified</span>
        </div>
        <h3 className="text-[#faf9f5] font-bold text-lg">Document Digitally Signed</h3>
        <p className="text-[#ababa8] text-sm mt-1 mb-6">Thank you. This certificate has been sealed and securely logged.</p>
        
        {existingMetadata?.signatureUrl || existingMetadata?.signature ? (
          <img 
            src={existingMetadata.signatureUrl || existingMetadata.signature} 
            alt="Customer Signature" 
            className="h-24 object-contain filter invert border-b border-dashed border-[#474846] px-8" 
          />
        ) : (
          <div className="h-16 border-b border-dashed border-[#474846] px-8 flex items-end pb-2">
            <span className="font-serif text-[#aeee2a] text-xl opacity-80">(Signed Digitally)</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Legal Full Name</label>
        <input 
          type="text" 
          placeholder="Type your name to confirm..."
          value={signatureName}
          onChange={(e) => setSignatureName(e.target.value)}
          className="w-full bg-[#1e201e] border-none rounded-xl py-3.5 px-4 text-[#faf9f5] font-medium focus:ring-1 focus:ring-[#aeee2a] outline-none transition-all"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-[#ababa8]">Draw your signature</label>
          <button onClick={clearCanvas} className="text-[10px] uppercase font-bold text-[#474846] hover:text-[#ff7351] transition-colors">
            Clear
          </button>
        </div>
        <div className="w-full bg-[#1e201e] border border-dashed border-[#474846] rounded-xl overflow-hidden touch-none relative h-48">
          <canvas
            ref={canvasRef}
            width={800} // Logical width (css scales it relative)
            height={300}
            className="w-full h-full cursor-crosshair"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            onTouchCancel={stopDrawing}
          />
          <div className="absolute inset-x-8 bottom-8 border-b-2 border-[#121412] opacity-50 z-[-1] pointer-events-none" />
        </div>
      </div>

      <div className="pt-4">
        <button 
          onClick={handleSign}
          disabled={loading || !signatureName.trim()}
          className="w-full py-4 bg-[#aeee2a] text-[#1a2e00] font-bold text-lg rounded-xl shadow-[0_8px_30px_rgb(174,238,42,0.2)] hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
        >
          {loading ? (
             <div className="w-6 h-6 border-2 border-[#1a2e00]/20 border-t-[#1a2e00] rounded-full animate-spin" />
          ) : (
            <>
              <span className="material-symbols-outlined" translate="no">draw</span>
              I agree to the terms and sign
            </>
          )}
        </button>
      </div>
    </div>
  );
}

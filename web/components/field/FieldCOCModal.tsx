"use client";

import React, { useState, useRef, useEffect } from 'react';
import { supabase } from "@/lib/supabase";

interface FieldCOCModalProps {
  jobId: string;
  serviceId: string;
  serviceName: string;
  onClose: () => void;
  onSaved: () => void;
}

type PaymentMethod = 'check' | 'financing' | 'credit_card';

export default function FieldCOCModal({ jobId, serviceId, serviceName, onClose, onSaved }: FieldCOCModalProps) {
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customerComments, setCustomerComments] = useState("");
  
  // Data state
  const [loading, setLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState({ name: '', address: '', email: '' });
  const [actualServiceName, setActualServiceName] = useState(serviceName);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    async function loadDocumentData() {
      try {
        // Fetch job details
        const { data: serviceData, error } = await supabase
          .from('job_services')
          .select(`
            service_types (
              name
            ),
            jobs (
              service_address_line_1,
              city,
              state,
              customers (
                full_name
              )
            )
          `)
          .eq('id', serviceId)
          .single();

        if (error) throw error;

        if (serviceData) {
          const job = serviceData.jobs as any;
          const serviceTypeObj = serviceData.service_types as any;
          
          if (serviceTypeObj && serviceTypeObj.name) {
            setActualServiceName(serviceTypeObj.name);
          }
          
          const custRaw = job?.customers;
          const customer = Array.isArray(custRaw) ? custRaw[0] : custRaw;
          
          setCustomerInfo({
            name: customer?.full_name || 'Customer Name',
            email: 'Customer File', // Removed email to prevent RLS/schema issues
            address: `${job?.service_address_line_1 || ''}, ${job?.city || ''}, ${job?.state || ''}`.replace(/^, /, '')
          });
        }
      } catch (err: any) {
        console.error("Failed to load COC data:", JSON.stringify(err, null, 2), err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDocumentData();
  }, [serviceId]);

  useEffect(() => {
    // Inicializar o canvas após carregar os dados
    if (!loading) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineWidth = 2;
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#000000'; // Black ink on white paper
        }
      }
    }
  }, [loading]);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = async () => {
    if (!consent) {
      alert("The customer must accept the legal consent clause before signing.");
      return;
    }

    setSaving(true);
    try {
      const signatureDataUrl = canvasRef.current?.toDataURL('image/png');
      
      // In a real scenario, this would POST to /api/documents/sign
      // which handles IP, SHA-256, UTC timestamps and creates the PDF.
      // For now, we simulate the DB insertion.
      
      const { data: session } = await supabase.auth.getSession();
      
      const signatureMetadata = {
        signer_name: customerInfo.name,
        signer_email: customerInfo.email,
        ip_address: "captured_server_side",
        user_agent: navigator.userAgent,
        geolocation: null, // Would request navigator.geolocation here
        signed_at: new Date().toISOString(),
        consent_text: "By signing below, I acknowledge that I have reviewed this document in its entirety. I understand that my electronic signature is legally binding and has the same legal effect as a handwritten signature under federal (ESIGN Act) and Georgia (UETA) law. I consent to conduct this transaction electronically.",
        consent_accepted_at: new Date().toISOString(),
        document_hash_sha256: "pending_server_generation",
        signature_data_url: signatureDataUrl,
        method: "canvas_touch_draw_field"
      };

      const { error } = await supabase.from('project_payment_milestones').insert({
        job_id: jobId,
        job_service_id: serviceId,
        title: `Certificate of Completion — ${actualServiceName}`,
        document_type: 'completion_certificate',
        status: 'signed',
        amount: 0, // Admin will set or it inherits from contract logic server-side
        signed_at: new Date().toISOString(),
        signature_data_url: signatureDataUrl,
        signature_metadata: signatureMetadata,
        customer_notes: customerComments
      });

      if (error) throw error;

      alert("Certificate of Completion successfully signed and saved.");
      onSaved();
    } catch (error: any) {
      console.error('Error saving COC:', error);
      alert('Failed to save Certificate of Completion: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content - White Paper Style for Contract */}
      <div className="relative w-full max-w-2xl bg-[#faf9f5] sm:rounded-3xl rounded-t-3xl h-[90vh] sm:h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">
        
        {/* Handle bar (Mobile) */}
        <div className="flex sm:hidden justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
        </div>

        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-200 text-zinc-600 hover:bg-zinc-300 transition-colors z-10"
        >
          <span className="material-symbols-outlined text-lg" translate="no">close</span>
        </button>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
            <div className="w-8 h-8 border-4 border-zinc-200 border-t-[#aeee2a] rounded-full animate-spin mb-4" />
            <p>Loading document details...</p>
          </div>
        ) : (
          <>
            {/* Scrollable Document Area */}
            <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar text-zinc-900">
              
              {/* Siding Depot Header */}
              <div className="text-center border-b-2 border-zinc-200 pb-6 mb-6">
                <h1 className="text-2xl font-black tracking-tight text-zinc-900 mb-2">SIDING DEPOT</h1>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  2480 Sandy Plains Road · Office: 678-400-2004 · www.sidingdepot.com<br/>
                  Marietta, GA 30066 · office@sidingdepot.com
                </p>
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold uppercase tracking-wide">Certificate of Completion</h2>
                <div className="inline-block mt-2 px-3 py-1 bg-zinc-100 text-zinc-600 font-semibold text-sm rounded-full">
                  {actualServiceName}
                </div>
              </div>

              {/* Contract Info */}
              <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Customer</p>
                    <p className="font-semibold text-sm">{customerInfo.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Service Address</p>
                    <p className="text-sm text-zinc-700 leading-snug">{customerInfo.address}</p>
                  </div>
                </div>
              </div>

              {/* Legal Clauses */}
              <div className="mb-6 px-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">Terms of Completion</h3>
                <ul className="text-xs text-zinc-600 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>I hereby acknowledge that the work for the above-mentioned service has been completed to my satisfaction.</li>
                  <li>The work area has been properly cleaned and all debris has been removed from the premises.</li>
                  <li>I understand that signing this certificate officially concludes the installation phase for this specific service.</li>
                </ul>
              </div>

              {/* Customer Comments */}
              <div className="mb-8">
                 <h3 className="text-sm font-bold text-zinc-900 mb-2">Customer Comments (Optional)</h3>
                 <textarea 
                   value={customerComments}
                   onChange={(e) => setCustomerComments(e.target.value)}
                   placeholder="Any final notes regarding the installation..."
                   className="w-full bg-white border border-zinc-300 rounded-xl p-4 text-zinc-900 text-sm placeholder:text-zinc-400 focus:outline-none focus:border-[#aeee2a] focus:ring-2 focus:ring-[#aeee2a]/20 resize-none h-24 transition-all"
                 />
              </div>

              {/* Legal Consent Clause */}
              <div className="bg-zinc-100 border border-zinc-200 rounded-xl p-5 mb-6">
                 <label className="flex items-start gap-4 cursor-pointer group">
                   <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                     <input 
                       type="checkbox" 
                       checked={consent}
                       onChange={(e) => setConsent(e.target.checked)}
                       className="peer appearance-none w-6 h-6 border-2 border-zinc-400 rounded-md checked:bg-[#aeee2a] checked:border-[#aeee2a] transition-all cursor-pointer bg-white"
                     />
                     <span className="material-symbols-outlined absolute text-[#1a2e00] text-lg opacity-0 peer-checked:opacity-100 pointer-events-none font-bold" translate="no">check</span>
                   </div>
                   <div className="text-xs text-zinc-600 leading-relaxed">
                     <strong className="text-zinc-900 block mb-1 uppercase tracking-wider text-[10px]">Legal Consent</strong>
                     By signing below, I acknowledge that I have reviewed this document in its entirety. I understand that my electronic signature is legally binding and has the same legal effect as a handwritten signature under federal (ESIGN Act) and Georgia (UETA) law. I consent to conduct this transaction electronically.
                   </div>
                 </label>
              </div>

              {/* Signature Pad */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-zinc-900">Customer Signature</h3>
                  <button onClick={clearSignature} className="text-xs text-red-500 font-bold hover:text-red-700 transition-colors bg-red-50 px-3 py-1 rounded-full">
                    Clear Signature
                  </button>
                </div>
                
                <div className="bg-white border-2 border-dashed border-zinc-300 rounded-2xl overflow-hidden relative touch-none shadow-inner">
                   <canvas
                     ref={canvasRef}
                     width={600}
                     height={200}
                     className="w-full h-[200px] cursor-crosshair touch-none"
                     onMouseDown={startDrawing}
                     onMouseMove={draw}
                     onMouseUp={stopDrawing}
                     onMouseLeave={stopDrawing}
                     onTouchStart={startDrawing}
                     onTouchMove={draw}
                     onTouchEnd={stopDrawing}
                   />
                   <div className="absolute bottom-3 left-4 text-xs text-zinc-400 pointer-events-none font-bold uppercase tracking-widest opacity-50">
                      Sign Here
                   </div>
                   {/* Draw Line */}
                   <div className="absolute bottom-8 left-4 right-4 h-px bg-zinc-200 pointer-events-none" />
                </div>
              </div>
              
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-white border-t border-zinc-200 shrink-0 sm:rounded-b-3xl">
              <button 
                onClick={handleSave}
                disabled={saving || !consent}
                className="w-full h-14 bg-[#1a2e00] text-white font-bold text-lg rounded-2xl hover:bg-[#254200] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-[#1a2e00]/20"
              >
                {saving ? (
                   <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined" translate="no">task_alt</span>
                    Submit Certificate
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

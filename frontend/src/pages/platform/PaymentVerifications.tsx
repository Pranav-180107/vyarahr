import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  FileText, 
  Download, 
  Search, 
  Loader2, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { ownerPlatformService } from '../../services/ownerPlatformService';
import { billingService } from '../../services/billingService';
import type { MembershipPayment } from '../../types/tenant';

export const PlatformPaymentVerifications: React.FC = () => {
  const [payments, setPayments] = useState<MembershipPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  // Action Modals
  const [selectedPayment, setSelectedPayment] = useState<MembershipPayment | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'view_proof' | 'details' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [ownerEmail, setOwnerEmail] = useState('');
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  useEffect(() => {
    ownerPlatformService.getOwnerEmail().then(setOwnerEmail);
  }, []);

  useEffect(() => {
    setProofUrl(null);
    if ((actionType === 'view_proof' || actionType === 'details') && selectedPayment?.proof_path) {
      ownerPlatformService.getProofSignedUrl(selectedPayment.proof_path).then(setProofUrl).catch(() => setProofUrl(null));
    }
  }, [actionType, selectedPayment]);

  const loadPayments = async () => {
    try {
      const data = await ownerPlatformService.getAllPayments();
      setPayments(data);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadPayments();
  };

  const filteredPayments = payments.filter(p => {
    const matchFilter = filter === 'all' || p.status === filter;
    const q = search.toLowerCase();
    const matchSearch = 
      !q ||
      p.tenant_slug.toLowerCase().includes(q) ||
      (p.utr_number && p.utr_number.toLowerCase().includes(q)) ||
      (p.submitted_by_email && p.submitted_by_email.toLowerCase().includes(q)) ||
      (p.invoice_number && p.invoice_number.toLowerCase().includes(q));
    return matchFilter && matchSearch;
  });

  const handleApprove = async () => {
    if (!selectedPayment) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const { invoiceNumber } = await ownerPlatformService.approvePayment(selectedPayment, ownerEmail);
      setActionSuccess(`Payment approved! GST Tax Invoice generated: ${invoiceNumber}`);
      setTimeout(async () => {
        await loadPayments();
        setSelectedPayment(null);
        setActionType(null);
        setActionSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error('Approval failed:', err);
      setActionError(err.message || 'Failed to approve payment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await ownerPlatformService.rejectPayment(selectedPayment.id, rejectReason, ownerEmail);
      setActionSuccess('Payment marked rejected.');
      setTimeout(async () => {
        await loadPayments();
        setSelectedPayment(null);
        setActionType(null);
        setActionSuccess(null);
      }, 1200);
    } catch (err: any) {
      console.error('Rejection failed:', err);
      setActionError(err.message || 'Failed to reject payment.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-navy flex items-center gap-2">
            Payment Verifications & GST Invoicing
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Validate 12-digit Indian UPI / Bank UTRs, approve customer subscriptions, and dispatch automated tax invoices.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 hover:text-brand-navy hover:bg-gray-100 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by UTR, tenant, email, or invoice number..."
            className="w-full bg-white border border-gray-200 rounded-xl px-10 py-2.5 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-brand-orange transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                filter === f 
                  ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/20' 
                  : 'bg-white border border-gray-200 text-gray-500 hover:text-brand-navy hover:bg-gray-100'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white  border border-gray-200 rounded-2xl p-6 shadow-xl">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
            <p className="text-xs">Loading payment records...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm font-semibold">No payments found in queue</p>
            <p className="text-xs mt-1">Submitted Indian UPI / Bank receipts will appear here for verification.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 uppercase text-[10px] font-semibold">
                  <th className="py-3 px-4">Workspace / Tenant</th>
                  <th className="py-3 px-4">UTR Reference</th>
                  <th className="py-3 px-4">Plan & Cycle</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Invoice PDF</th>
                  <th className="py-3 px-4">Submitted Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredPayments.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => { setSelectedPayment(p); setActionType('details'); }}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <span className="font-bold text-brand-navy block">{p.tenant_slug}</span>
                      <span className="text-[11px] text-gray-500">{p.submitted_by_name || p.submitted_by_email}</span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-emerald-600 font-semibold">
                      {p.utr_number || 'N/A'}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-brand-navy font-semibold text-[11px] border border-gray-300 capitalize">
                        {p.plan_tier}
                      </span>
                      <span className="block text-[10px] text-gray-500 uppercase mt-0.5">
                        {p.billing_cycle}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-brand-navy font-mono">
                      ₹{Number(p.amount).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                        p.status === 'approved' 
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : p.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                          : 'bg-red-500/10 text-red-600 border border-red-500/20'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {p.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {p.invoice_pdf_path ? (
                        <a
                          href={billingService.getInvoiceUrl(p.invoice_pdf_path)}
                          onClick={(e) => e.stopPropagation()}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-600 hover:text-brand-orange font-medium"
                        >
                          <FileText size={13} />
                          <span>{p.invoice_number || 'Download PDF'}</span>
                        </a>
                      ) : (
                        <span className="text-gray-400 text-[11px] italic">Not generated</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-gray-500 text-[11px]">
                      {new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        {p.proof_path && (
                          <button
                            onClick={() => {
                              setSelectedPayment(p);
                              setActionType('view_proof');
                            }}
                            title="View Payment Screenshot"
                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-brand-navy transition-colors cursor-pointer"
                          >
                            <ImageIcon size={14} />
                          </button>
                        )}

                        {p.status === 'pending' && (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setActionType('approve');
                              }}
                              title="Approve Payment & Issue GST Invoice"
                              className="px-2.5 py-1 rounded-lg bg-brand-orange hover:bg-brand-orange text-white font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 size={13} />
                              <span>Approve</span>
                            </button>

                            <button
                              onClick={() => {
                                setSelectedPayment(p);
                                setActionType('reject');
                              }}
                              title="Reject Payment"
                              className="px-2.5 py-1 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-600 hover:text-brand-navy font-semibold text-[11px] border border-red-500/30 flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Details Modal */}
      {actionType === 'details' && selectedPayment && (
        <div
          className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => { setSelectedPayment(null); setActionType(null); }}
        >
          <div
            className="max-w-2xl w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-brand-navy">Payment Details</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Workspace <span className="font-mono font-bold text-brand-orange">/{selectedPayment.tenant_slug}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  selectedPayment.status === 'approved'
                    ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                    : selectedPayment.status === 'pending'
                    ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                    : 'bg-red-500/10 text-red-600 border border-red-500/20'
                }`}>
                  {selectedPayment.status}
                </span>
                <button
                  onClick={() => { setSelectedPayment(null); setActionType(null); }}
                  className="text-gray-400 hover:text-gray-600 cursor-pointer"
                  aria-label="Close"
                >
                  <XCircle size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <dl className="space-y-3 text-xs">
                {([
                  ['UTR Reference', selectedPayment.utr_number || 'N/A'],
                  ['Amount', `₹${Number(selectedPayment.amount).toLocaleString('en-IN')}`],
                  ['Plan', `${selectedPayment.plan_tier} (${selectedPayment.billing_cycle})`],
                  ['Payer Name', selectedPayment.submitted_by_name || '-'],
                  ['Invoice Email', selectedPayment.submitted_by_email || '-'],
                  ['Submitted', new Date(selectedPayment.created_at).toLocaleString('en-IN')],
                  ...(selectedPayment.reviewed_at
                    ? [['Reviewed', `${new Date(selectedPayment.reviewed_at).toLocaleString('en-IN')}${selectedPayment.reviewed_by ? ` by ${selectedPayment.reviewed_by}` : ''}`]]
                    : []),
                  ...(selectedPayment.invoice_number ? [['Invoice No.', selectedPayment.invoice_number]] : []),
                  ...(selectedPayment.rejection_reason ? [['Rejection Reason', selectedPayment.rejection_reason]] : [])
                ] as string[][]).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{k}</dt>
                    <dd className="text-brand-navy font-semibold mt-0.5 break-words">{v}</dd>
                  </div>
                ))}
              </dl>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1.5">Payment Proof</span>
                {selectedPayment.proof_path ? (
                  proofUrl ? (
                    <a href={proofUrl} target="_blank" rel="noreferrer">
                      <img
                        src={proofUrl}
                        alt="Payment proof"
                        className="rounded-xl border border-gray-200 max-h-64 w-full object-contain bg-gray-50"
                      />
                    </a>
                  ) : (
                    <div className="h-32 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">
                      <Loader2 size={14} className="animate-spin mr-2" /> Loading proof...
                    </div>
                  )
                ) : (
                  <div className="h-32 rounded-xl border border-dashed border-gray-200 flex items-center justify-center text-xs text-gray-400">
                    No screenshot uploaded
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-gray-100">
              {selectedPayment.invoice_pdf_path ? (
                <a
                  href={billingService.getInvoiceUrl(selectedPayment.invoice_pdf_path)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange hover:underline"
                >
                  <Download size={13} /> Download GST invoice
                </a>
              ) : <span />}

              {selectedPayment.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActionType('reject')}
                    className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                  <button
                    onClick={() => setActionType('approve')}
                    className="px-4 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Approve and Issue Invoice
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {actionType === 'approve' && selectedPayment && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-brand-navy mb-2">Approve Subscription Payment</h3>
            <p className="text-xs text-gray-700 mb-4">
              Approving will automatically:
            </p>
            <ul className="text-xs text-gray-500 space-y-2 mb-6 list-disc list-inside">
              <li>Mark the customer workspace as <strong className="text-emerald-600">paid</strong></li>
              <li>Extend subscription due date by <strong className="text-brand-navy">{selectedPayment.billing_cycle === 'annual' ? '+365 days' : '+30 days'}</strong></li>
              <li>Generate sequential GST Tax Invoice <strong className="text-emerald-600">VYR/INV/YYYY-YY/XXXX</strong></li>
              <li>Upload official tax invoice PDF to Supabase Storage</li>
            </ul>

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs">
                {actionSuccess}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setSelectedPayment(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleApprove}
                className="px-4 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange text-white text-xs font-semibold shadow-lg shadow-brand-orange/20 flex items-center gap-1.5 cursor-pointer"
              >
                {actionLoading && <Loader2 size={13} className="animate-spin" />}
                <span>Confirm & Issue Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {actionType === 'reject' && selectedPayment && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-brand-navy mb-2">Reject Payment Verification</h3>
            <p className="text-xs text-gray-700 mb-4">
              Enter reason for rejection (e.g. invalid UTR, screenshot mismatch, amount deficient):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. UTR number not found in bank statement."
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-brand-navy placeholder-gray-400 focus:outline-none focus:border-red-500 mb-4"
              rows={3}
            />

            {actionError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => {
                  setSelectedPayment(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleReject}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold cursor-pointer"
              >
                {actionLoading && <Loader2 size={13} className="animate-spin" />}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Proof Modal */}
      {actionType === 'view_proof' && selectedPayment && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-brand-navy">Payment Screenshot Proof</h3>
              <button
                onClick={() => {
                  setSelectedPayment(null);
                  setActionType(null);
                }}
                className="text-gray-500 hover:text-brand-navy"
              >
                <XCircle size={18} />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-200 max-h-96 flex items-center justify-center">
              <img
                src={proofUrl || undefined}
                alt="Payment proof screenshot"
                className="object-contain max-h-96 w-full"
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs">
              <span className="font-mono text-gray-500">UTR: {selectedPayment.utr_number}</span>
              <a
                href={proofUrl || undefined}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:underline flex items-center gap-1"
              >
                <span>Open Full Image</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformPaymentVerifications;

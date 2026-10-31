import { jsPDF } from 'jspdf';
import { platformDb as masterRouter } from '../lib/supabase';
import type { CustomerAccount, MembershipPayment, PlatformSettings } from '../types/tenant';

export interface InvoiceData {
  invoiceNumber: string;
  payment: MembershipPayment;
  customer?: CustomerAccount | null;
  settings?: PlatformSettings | null;
}

/**
 * Generates an official B2B GST Tax Invoice PDF and uploads it to 'membership-invoices' bucket.
 */
export async function generateAndUploadInvoice(data: InvoiceData): Promise<{ invoiceNumber: string; pdfUrl: string; pdfPath: string }> {
  const { invoiceNumber, payment, customer, settings } = data;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const darkColor = '#0F172A'; // Slate 900
  const grayColor = '#64748B'; // Slate 500

  // Header Banner
  doc.setFillColor(21, 128, 61); // #15803D
  doc.rect(0, 0, 210, 28, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('VyaraHR', 14, 18);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('TAX INVOICE / PAYMENT RECEIPT', 140, 18);

  // Platform Provider Details (Left)
  doc.setTextColor(darkColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('ISSUED BY:', 14, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(settings?.upi_name || 'VyaraHR Technologies Private Limited', 14, 44);
  doc.text('GSTIN: 29AABCV1234F1Z5', 14, 49);
  doc.text('Cloud SaaS Platform Infrastructure Services', 14, 54);
  doc.text(`Support: ${settings?.support_email || 'support@vyarahr.com'}`, 14, 59);

  // Invoice Meta (Right)
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE DETAILS:', 130, 38);
  doc.setFont('helvetica', 'normal');
  doc.text(`Invoice No: ${invoiceNumber}`, 130, 44);
  doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 130, 49);
  doc.text(`Payment Ref (UTR): ${payment.utr_number || 'N/A'}`, 130, 54);
  doc.text(`Payment Mode: Indian Rails (UPI / IMPS)`, 130, 59);

  // Bill To Section
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 66, 196, 66);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('BILLED TO (CUSTOMER):', 14, 74);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Company / Workspace: ${customer?.tenant_slug || payment.tenant_slug}`, 14, 80);
  doc.text(`Contact: ${payment.submitted_by_name || customer?.contact_name || 'Authorized Representative'}`, 14, 85);
  doc.text(`Email: ${payment.submitted_by_email || customer?.contact_email || 'N/A'}`, 14, 90);
  if (customer?.contact_phone) {
    doc.text(`Phone: ${customer.contact_phone}`, 14, 95);
  }

  // Items Table Header
  const tableStartY = 105;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, tableStartY, 182, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(darkColor);
  doc.text('DESCRIPTION', 18, tableStartY + 5.5);
  doc.text('CYCLE', 95, tableStartY + 5.5);
  doc.text('QTY', 125, tableStartY + 5.5);
  doc.text('TAXABLE VAL', 145, tableStartY + 5.5);
  doc.text('TOTAL (INR)', 175, tableStartY + 5.5);

  // Line Item
  const itemY = tableStartY + 15;
  const planName = payment.plan_tier ? (payment.plan_tier.charAt(0).toUpperCase() + payment.plan_tier.slice(1)) : 'Subscription';
  const totalAmount = Number(payment.amount) || 0;
  // Compute base amount assuming 18% inclusive GST
  const baseAmount = Math.round((totalAmount / 1.18) * 100) / 100;
  const gstAmount = Math.round((totalAmount - baseAmount) * 100) / 100;
  const cgst = Math.round((gstAmount / 2) * 100) / 100;
  const sgst = Math.round((gstAmount / 2) * 100) / 100;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${planName} Plan - SaaS Platform License`, 18, itemY);
  doc.text(payment.billing_cycle || 'monthly', 95, itemY);
  doc.text('1', 127, itemY);
  doc.text(`Rs. ${baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 142, itemY);
  doc.text(`Rs. ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 172, itemY);

  // Breakdown Summary Box
  const summaryY = itemY + 20;
  doc.line(14, summaryY - 6, 196, summaryY - 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Subtotal (Taxable Amount):', 120, summaryY);
  doc.text(`Rs. ${baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 172, summaryY);

  doc.text('CGST @ 9%:', 120, summaryY + 6);
  doc.text(`Rs. ${cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 172, summaryY + 6);

  doc.text('SGST @ 9%:', 120, summaryY + 12);
  doc.text(`Rs. ${sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 172, summaryY + 12);

  doc.setDrawColor(21, 128, 61);
  doc.line(120, summaryY + 16, 196, summaryY + 16);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(21, 128, 61);
  doc.text('Total Paid Amount:', 120, summaryY + 22);
  doc.text(`INR ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 168, summaryY + 22);

  // Payment Confirmation Stamp
  doc.setDrawColor(21, 128, 61);
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, summaryY, 80, 24, 2, 2, 'FD');

  doc.setTextColor(21, 128, 61);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PAID & VERIFIED', 20, summaryY + 9);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Verified via UPI Rails · UTR: ${payment.utr_number || 'OK'}`, 20, summaryY + 15);
  doc.text('Status: Active Enterprise Workspace', 20, summaryY + 20);

  // Footer notes & terms
  doc.setTextColor(grayColor);
  doc.setFontSize(8);
  doc.text('Terms & Conditions: Subscriptions are billed in advance. All taxes are compliant with Indian GST laws.', 14, 260);
  doc.text('This is a computer-generated invoice and requires no physical signature.', 14, 265);
  doc.text('VyaraHR Multi-Tenant Cloud Operating System', 14, 270);

  // Convert to Blob
  const pdfBlob = doc.output('blob');
  const cleanTenant = (payment.tenant_slug || 'default').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanInvNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
  const token = crypto.randomUUID().replace(/-/g, '');
  const filePath = `${cleanTenant}/${cleanInvNumber}_${token}.pdf`;

  // Upload to native self-hosted storage 'membership-invoices' bucket
  const { error: uploadError } = await masterRouter.storage
    .from('membership-invoices')
    .upload(filePath, pdfBlob, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Invoice upload failed: ${uploadError.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = masterRouter.storage
    .from('membership-invoices')
    .getPublicUrl(filePath);

  return {
    invoiceNumber,
    pdfUrl: publicUrlData?.publicUrl || '',
    pdfPath: filePath
  };
}

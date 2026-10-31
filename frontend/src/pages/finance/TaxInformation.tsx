import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import TaxSlabTable from '../../components/payroll/TaxSlabTable';
import { Info, ShieldCheck } from 'lucide-react';

interface TaxDeclaration {
  id: string;
  employee_id: string;
  financial_year: string;
  declaration_data: {
    section_80c?: number | string;
    section_80d?: number | string;
    hra?: number | string;
    home_loan?: number | string;
  };
  status: string;
  profiles?: {
    full_name: string;
    employee_id: string;
  };
}

const TaxInformation = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin' || profile?.role === 'owner';
  const [declarations, setDeclarations] = useState<TaxDeclaration[]>([]);
  const [myDeclaration, setMyDeclaration] = useState<TaxDeclaration | null>(null);

  const fetchDeclarations = useCallback(async () => {
    if (isAdmin) {
      const { data } = await supabase
        .from('tax_declarations')
        .select('*, profiles(full_name, employee_id)');
      if (data) setDeclarations(data as unknown as TaxDeclaration[]);
    } else {
      const { data } = await supabase.from('tax_declarations').select('*').eq('employee_id', profile?.id).maybeSingle();
      if (data) setMyDeclaration(data as unknown as TaxDeclaration);
    }
  }, [isAdmin, profile?.id, profile?.email]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeclarations();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDeclarations]);

  const handleSubmitDeclaration = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const declaration_data = {
      section_80c: formData.get('80c'),
      section_80d: formData.get('80d'),
      hra: formData.get('hra'),
      home_loan: formData.get('home_loan')
    };

    const { error } = await supabase.from('tax_declarations').upsert({
      employee_id: profile?.id,
      financial_year: '2024-25',
      declaration_data,
      status: 'pending'
    });

    if (!error) {
      alert("Declaration submitted successfully!");
      fetchDeclarations();
    }
  };

  return (
    <div className="space-y-8 min-h-screen">
      <div>
        <h1 className="font-display text-[1.8rem] font-bold text-brand-navy mb-1">Tax Information</h1>
        <p className="text-gray-500 text-sm">Investment declarations and tax regime reference</p>
      </div>

      {isAdmin ? (
        <div className="space-y-8">
          <TaxSlabTable />
          <div className="bg-white border border-gray-100 rounded-[18px] overflow-hidden shadow-sm">
             <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gray-50/30">
               <h3 className="font-display font-bold text-lg text-brand-navy">Employee Declarations</h3>
               <button className="w-full sm:w-auto bg-brand-orange text-white text-[10px] font-bold px-4 py-2 rounded-[8px] hover:opacity-90">Export All (Excel)</button>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-widest border-b border-gray-100">
                   <tr>
                     <th className="px-6 py-5">Employee</th>
                     <th className="px-6 py-5">80C Amount</th>
                     <th className="px-6 py-5">HRA Exemption</th>
                     <th className="px-6 py-5">Status</th>
                     <th className="px-6 py-5 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-50 text-[11px]">
                   {declarations.length > 0 ? declarations.map(d => (
                     <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                       <td className="px-6 py-4 font-bold text-brand-navy">{d.profiles?.full_name}</td>
                       <td className="px-6 py-4">₹ {Number(d.declaration_data?.section_80c || 0).toLocaleString()}</td>
                       <td className="px-6 py-4">₹ {Number(d.declaration_data?.hra || 0).toLocaleString()}</td>
                       <td className="px-6 py-4">
                         <span className={`text-[9px] font-bold uppercase ${d.status === 'verified' ? 'text-green-600' : 'text-brand-orange'}`}>{d.status}</span>
                       </td>
                       <td className="px-6 py-4 text-right">
                         <button className="text-brand-orange font-bold hover:underline">Verify Docs</button>
                       </td>
                     </tr>
                   )) : (
                     <tr><td colSpan={5} className="p-12 text-center text-gray-400">No declarations submitted yet</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white border border-gray-100 rounded-[18px] p-4 sm:p-8 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display font-bold text-xl text-brand-navy">IT Declaration</h3>
              {myDeclaration?.status === 'verified' && <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase"><ShieldCheck size={14} /> Verified</div>}
            </div>
            
            <form onSubmit={handleSubmitDeclaration} className="space-y-6">
              <InputSlab name="80c" label="Section 80C (LIC, PPF, ELSS)" defaultValue={myDeclaration?.declaration_data?.section_80c} />
              <InputSlab name="80d" label="Section 80D (Health Insurance)" defaultValue={myDeclaration?.declaration_data?.section_80d} />
              <InputSlab name="hra" label="House Rent Allowance (HRA)" defaultValue={myDeclaration?.declaration_data?.hra} />
              <InputSlab name="home_loan" label="Home Loan Interest (Section 24)" defaultValue={myDeclaration?.declaration_data?.home_loan} />
              
              <button 
                type="submit"
                disabled={myDeclaration?.status === 'verified'}
                className="w-full bg-brand-orange text-white font-bold py-4 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-orange-500/10 disabled:opacity-50"
              >
                {myDeclaration?.status === 'verified' ? 'Declaration Verified & Locked' : 'Update Declaration'}
              </button>
            </form>
          </div>
          <div className="space-y-6">
            <TaxSlabTable />
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center">
              <Info className="text-gray-300 mx-auto mb-3" size={32} />
              <p className="text-xs text-gray-400 font-medium">Declaration proof documents will be requested at the end of the financial year (March).</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface InputSlabProps {
  name: string;
  label: string;
  defaultValue?: number | string;
}

const InputSlab = ({ name, label, defaultValue }: InputSlabProps) => (
  <div className="space-y-2">
    <label htmlFor={`tax-input-${name}`} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{label}</label>
    <div className="relative">
      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
      <input 
        id={`tax-input-${name}`}
        name={name}
        type="number" 
        defaultValue={defaultValue || 0}
        placeholder={label}
        title={label}
        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8 pr-4 py-3 text-sm outline-none focus:border-brand-orange font-bold text-brand-navy" 
      />
    </div>
  </div>
);

export default TaxInformation;

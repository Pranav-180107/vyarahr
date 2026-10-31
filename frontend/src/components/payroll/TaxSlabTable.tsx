import React from 'react';

const TaxSlabTable = () => {
  const slabs = [
    { income: "₹ 0 - ₹ 3,00,000", rate: "Nil" },
    { income: "₹ 3,00,001 - ₹ 6,00,000", rate: "5%" },
    { income: "₹ 6,00,001 - ₹ 9,00,000", rate: "10%" },
    { income: "₹ 9,00,001 - ₹ 12,00,000", rate: "15%" },
    { income: "₹ 12,00,001 - ₹ 15,00,000", rate: "20%" },
    { income: "Above ₹ 15,00,000", rate: "30%" }
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-[18px] overflow-hidden shadow-sm">
      <div className="p-6 border-b border-gray-100 bg-gray-50/30">
        <h3 className="font-display font-bold text-lg text-brand-navy">New Tax Regime Slabs (FY 2024-25)</h3>
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Reference: IT Department of India</p>
      </div>
      <table className="w-full text-left">
        <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 tracking-widest border-b border-gray-100">
          <tr>
            <th className="px-6 py-4">Taxable Income Slab</th>
            <th className="px-6 py-4">Tax Rate</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 text-xs">
          {slabs.map((slab, i) => (
            <tr key={i} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-gray-600 font-medium">{slab.income}</td>
              <td className="px-6 py-4 font-bold text-brand-orange">{slab.rate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TaxSlabTable;

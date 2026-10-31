/**
 * Payroll Calculation Engine for VyaraHR
 * Logic based on India tax system (PF, TDS, ESI, PT)
 */

export function calculateSalary({
  grossSalary,
  performanceRating,
  lopDays = 0,
  workingDaysInMonth = 30,
  activeLoanEMI = 0,
}: {
  grossSalary: number;
  performanceRating: number;
  lopDays?: number;
  workingDaysInMonth?: number;
  activeLoanEMI?: number;
}) {
  // EARNINGS BREAKDOWN
  const basic = grossSalary * 0.40;
  const hra = grossSalary * 0.20;
  const travel = grossSalary * 0.10;
  const special = grossSalary * 0.30;
  
  const bonusMap: Record<number, number> = { 5: 5000, 4: 3000, 3: 1500, 2: 0, 1: 0 };
  const performanceBonus = bonusMap[performanceRating] || 0;
  
  const grossEarnings = grossSalary + performanceBonus;

  // DEDUCTIONS
  const pf = basic * 0.12;
  const esi = grossSalary <= 21000 ? grossSalary * 0.0075 : 0;
  const professionalTax = 200;
  
  const annualIncome = grossEarnings * 12;
  const tds = calculateAnnualTDS(annualIncome) / 12;
  
  const lopDeduction = lopDays > 0
    ? (grossSalary / workingDaysInMonth) * lopDays
    : 0;
    
  const loanDeduction = activeLoanEMI || 0;
  
  const totalDeductions = pf + esi + professionalTax + tds + lopDeduction + loanDeduction;

  // NET SALARY
  const netSalary = grossEarnings - totalDeductions;

  return {
    earnings: { basic, hra, travel, special, performanceBonus, grossEarnings },
    deductions: { pf, esi, professionalTax, tds, lopDeduction, loanDeduction, totalDeductions },
    netSalary: Math.max(0, netSalary)
  };
}

export function calculateAnnualTDS(annualIncome: number) {
  const standardDeduction = 75000;
  const taxableIncome = Math.max(0, annualIncome - standardDeduction);
  
  if (taxableIncome <= 300000) return 0;
  if (taxableIncome <= 600000) return (taxableIncome - 300000) * 0.05;
  if (taxableIncome <= 900000) return 15000 + (taxableIncome - 600000) * 0.10;
  if (taxableIncome <= 1200000) return 45000 + (taxableIncome - 900000) * 0.15;
  if (taxableIncome <= 1500000) return 90000 + (taxableIncome - 1200000) * 0.20;
  
  return 150000 + (taxableIncome - 1500000) * 0.30;
}

export function calculateLoanEMI(principal: number, months: number, annualInterestRate = 10) {
  const monthlyRate = annualInterestRate / 12 / 100;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months))
            / (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(emi);
}

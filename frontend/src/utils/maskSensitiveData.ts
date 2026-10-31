/**
 * Data Masking Utilities for VyaraHR
 */

export const maskBankAccount = (accNumber: string) => {
  if (!accNumber) return '•••• XXXX';
  const visible = accNumber.slice(-4);
  return `•••• ${visible}`;
};

export const maskPAN = (pan: string) => {
  if (!pan) return '••••• •••• •';
  const start = pan.slice(0, 5);
  const end = pan.slice(-1);
  return `${start}••••${end}`;
};

export const maskAadhar = (aadhar: string) => {
  if (!aadhar) return '•••• •••• ••••';
  const visible = aadhar.slice(-4);
  return `•••• •••• ${visible}`;
};

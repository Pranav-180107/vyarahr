import React from 'react';

interface SubscriptionGateProps {
  children: React.ReactNode;
}

export const SubscriptionGate: React.FC<SubscriptionGateProps> = ({ children }) => {
  // Billing for plans is currently inactive with no billing date tracking.
  // All operational access is fully unlocked.
  return <>{children}</>;
};

export default SubscriptionGate;

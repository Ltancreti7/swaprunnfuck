import React from 'react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div style={{ padding: '1rem' }}>
      <iframe
        src="https://app.termly.io/policy-viewer/policy.html?policyUUID=f6a26278-a117-4a06-adb1-4b7c55d655ca"
        style={{ width: '100%', height: '100vh', border: 'none' }}
        title="Privacy Policy"
      />
    </div>
  );
};

export default PrivacyPolicy;

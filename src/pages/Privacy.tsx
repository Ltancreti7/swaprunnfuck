export function Privacy() {
  const lastUpdated = 'May 5, 2025';

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-neutral-900 px-8 py-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <span className="text-white font-bold text-xl">SwapRunn</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
            <p className="text-gray-400 text-sm">Last updated: {lastUpdated}</p>
          </div>

          {/* Body */}
          <div className="px-8 py-10 space-y-10 text-gray-700 leading-relaxed">
            {/* Intro */}
            <p className="text-base text-gray-600">
              SwapRunn ("we," "us," or "our") operates a vehicle delivery coordination platform
              connecting dealerships with professional delivery drivers. This Privacy Policy
              explains what information we collect, how we use it, and your rights regarding
              your personal data. By using the SwapRunn app or website, you agree to the
              practices described here.
            </p>

            {/* 1. Information We Collect */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                1. Information We Collect
              </h2>
              <p className="mb-4">We collect the following categories of information when you register and use SwapRunn:</p>

              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">Account &amp; Identity</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Full name</li>
                    <li>Email address</li>
                    <li>Phone number</li>
                    <li>Driver's license number (drivers only)</li>
                    <li>Profile photo (optional)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Device location when using the app (to show nearby deliveries and navigate to pickup/dropoff points)</li>
                    <li>Pickup and dropoff addresses entered for each delivery</li>
                    <li>Service radius preference (drivers only)</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">Vehicle &amp; Delivery Information</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Vehicle identification number (VIN)</li>
                    <li>Year, make, and model</li>
                    <li>Transmission type</li>
                    <li>Trade-in status</li>
                    <li>Delivery photos uploaded during pickup and dropoff</li>
                    <li>Delivery notes and instructions</li>
                    <li>Delivery status and timestamps</li>
                  </ul>
                </div>

                <div className="bg-gray-50 rounded-xl p-5">
                  <h3 className="font-semibold text-gray-900 mb-2">Usage &amp; Device Data</h3>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>Login timestamps and session activity</li>
                    <li>In-app messages between drivers and sales staff</li>
                    <li>Push notification tokens (for delivery alerts)</li>
                    <li>Device type and operating system (collected by Firebase)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 2. How We Use Your Information */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                2. How We Use Your Information
              </h2>
              <p className="mb-4">
                All information we collect is used solely to operate and improve the SwapRunn
                platform. Specifically, we use your data to:
              </p>
              <ul className="space-y-3">
                {[
                  'Coordinate vehicle deliveries between dealerships, sales staff, and drivers',
                  'Match drivers to delivery requests based on location, availability, and qualifications',
                  'Send push notifications and in-app alerts about new delivery requests, status updates, and messages',
                  'Authenticate your identity and maintain the security of your account',
                  'Allow dealerships to review and approve driver applications',
                  'Display delivery history, photos, and status to relevant parties',
                  'Calculate estimated drive times, distances, and earnings for drivers',
                  'Schedule deliveries and manage calendars for dealership staff',
                  'Respond to support requests and resolve disputes',
                  'Improve the performance and reliability of our platform',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">✓</span>
                    <span className="text-sm text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* 3. Data Sharing */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                3. How We Share Your Information
              </h2>
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-5">
                <p className="font-semibold text-green-800 mb-1">We do not sell your personal data.</p>
                <p className="text-sm text-green-700">
                  SwapRunn does not sell, rent, or trade your personal information to any third
                  party for marketing or advertising purposes — ever.
                </p>
              </div>
              <p className="mb-4">We share information only in the following limited circumstances:</p>
              <div className="space-y-3">
                {[
                  {
                    title: 'Within the platform',
                    desc: 'Dealership staff can see driver names, contact info, and delivery status for deliveries they coordinate. Drivers can see pickup/dropoff details and the name of the sales person who created a delivery.',
                  },
                  {
                    title: 'Service providers',
                    desc: 'We use Firebase (Google) for push notifications and analytics, and Railway for hosting. These providers process data on our behalf under strict data processing agreements and are not permitted to use your data for their own purposes.',
                  },
                  {
                    title: 'Legal requirements',
                    desc: 'We may disclose information if required by law, court order, or to protect the rights, property, or safety of SwapRunn, our users, or the public.',
                  },
                  {
                    title: 'Business transfers',
                    desc: 'If SwapRunn is acquired or merges with another company, your information may be transferred as part of that transaction. We will notify you before that happens.',
                  },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-5">
                    <p className="font-semibold text-gray-900 mb-1">{item.title}</p>
                    <p className="text-sm text-gray-600">{item.desc}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 4. Data Retention */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                4. Data Retention
              </h2>
              <p className="text-sm text-gray-600">
                We retain your account information for as long as your account is active or as
                needed to provide services. Delivery records and associated photos are retained
                for a minimum of 12 months to support dispute resolution and business records.
                You may request deletion of your account and associated data at any time by
                contacting us at{' '}
                <a href="mailto:privacy@swaprunn.com" className="text-red-600 hover:underline font-medium">
                  privacy@swaprunn.com
                </a>
                .
              </p>
            </section>

            {/* 5. Your Rights */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                5. Your Privacy Rights
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Depending on your location, you may have the following rights regarding your
                personal data:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { right: 'Access', desc: 'Request a copy of the data we hold about you' },
                  { right: 'Correction', desc: 'Update inaccurate or incomplete information' },
                  { right: 'Deletion', desc: 'Request that we delete your personal data' },
                  { right: 'Portability', desc: 'Receive your data in a portable format' },
                  { right: 'Opt-out', desc: 'Disable push notifications at any time in your device settings' },
                  { right: 'Withdraw consent', desc: 'Revoke location access via your device settings' },
                ].map((item, i) => (
                  <div key={i} className="bg-gray-50 rounded-xl p-4">
                    <p className="font-semibold text-gray-900 text-sm mb-0.5">{item.right}</p>
                    <p className="text-xs text-gray-500">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:privacy@swaprunn.com" className="text-red-600 hover:underline font-medium">
                  privacy@swaprunn.com
                </a>
                . We will respond within 30 days.
              </p>
            </section>

            {/* 6. Security */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                6. Security
              </h2>
              <p className="text-sm text-gray-600">
                We implement industry-standard security measures including HTTPS encryption for
                all data in transit, hashed passwords, session-based authentication, and strict
                access controls. Only personnel who need access to your data to perform their
                job functions can access it. However, no system is completely secure, and we
                cannot guarantee absolute security.
              </p>
            </section>

            {/* 7. Children */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                7. Children's Privacy
              </h2>
              <p className="text-sm text-gray-600">
                SwapRunn is not directed at children under the age of 18. We do not knowingly
                collect personal information from anyone under 18. If you believe we have
                inadvertently collected such information, please contact us immediately at{' '}
                <a href="mailto:privacy@swaprunn.com" className="text-red-600 hover:underline font-medium">
                  privacy@swaprunn.com
                </a>
                .
              </p>
            </section>

            {/* 8. Changes */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                8. Changes to This Policy
              </h2>
              <p className="text-sm text-gray-600">
                We may update this Privacy Policy from time to time. When we do, we will update
                the "Last updated" date at the top and notify active users via email or an
                in-app notification. Continued use of SwapRunn after changes are posted
                constitutes your acceptance of the updated policy.
              </p>
            </section>

            {/* 9. Contact */}
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                9. Contact Us
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                If you have any questions, concerns, or requests regarding this Privacy Policy
                or the way we handle your data, please reach out:
              </p>
              <div className="bg-neutral-900 rounded-xl p-6 text-center">
                <p className="text-white font-semibold text-lg mb-1">SwapRunn Privacy Team</p>
                <a
                  href="mailto:privacy@swaprunn.com"
                  className="text-red-400 hover:text-red-300 font-medium text-base transition"
                >
                  privacy@swaprunn.com
                </a>
                <p className="text-gray-500 text-xs mt-3">We respond to all privacy inquiries within 30 days.</p>
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="px-8 py-6 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} SwapRunn. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

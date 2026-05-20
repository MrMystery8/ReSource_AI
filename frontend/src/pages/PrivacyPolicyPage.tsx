export function PrivacyPolicyPage(): JSX.Element {
  const effectiveDate = 'May 20, 2026';

  return (
    <div className="max-w-4xl mx-auto pb-8">
      <div
        className="rounded-xl border p-5 sm:p-7"
        style={{
          backgroundColor: 'var(--color-surface-card)',
          borderColor: 'var(--color-border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <h1
          className="text-2xl sm:text-3xl font-semibold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Privacy Policy
        </h1>
        <p className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Effective date: {effectiveDate}
        </p>
        <div
          className="mt-4 space-y-4 text-sm leading-relaxed"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <p>
            This Privacy Policy explains how ReSource AI collects, uses, stores, and protects
            personal information when you use the application and related services.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            1. Information We Collect
          </h2>
          <p>
            We may collect account information such as display name and email address, usage data
            such as login activity and session interactions, and content you provide including
            device details, uploaded media, community posts, and comments.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            2. How We Use Information
          </h2>
          <p>
            We use information to operate platform features, authenticate users, process triage
            sessions, generate project suggestions, provide community functions, improve reliability,
            and maintain security and abuse prevention controls.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            3. AI Features Notice
          </h2>
          <p>
            ReSource AI uses artificial intelligence to analyze user inputs and generate outputs.
            AI-generated responses may be incomplete, inaccurate, or unsuitable for specific safety,
            legal, medical, or technical decisions. You are responsible for independently reviewing
            outputs before acting on them.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            4. Sharing and Disclosure
          </h2>
          <p>
            We do not sell personal information. We may share limited data with infrastructure and
            service providers that help us host, secure, and operate the platform. We may also
            disclose information if required by law or to protect platform integrity and user safety.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            5. Data Retention
          </h2>
          <p>
            We retain information for as long as needed to provide services, comply with legal
            obligations, resolve disputes, and enforce policies. Some operational logs and generated
            data may be retained for limited periods based on system requirements.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            6. Security
          </h2>
          <p>
            We use reasonable technical and organizational safeguards to protect data. No security
            method is perfect, and we cannot guarantee absolute security of information transmitted
            or stored through internet-connected systems.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            7. Your Rights and Choices
          </h2>
          <p>
            Depending on your location, you may have rights to access, update, or request deletion
            of your personal information. You may also manage your profile details within the app
            where available.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            8. Children&apos;s Privacy
          </h2>
          <p>
            ReSource AI is not intended for children under the age required by applicable law in
            your jurisdiction. If you believe a child has provided personal information, contact us
            so we can review and take appropriate action.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            9. Policy Changes
          </h2>
          <p>
            We may update this Privacy Policy from time to time. Updated versions are effective when
            posted, unless a different effective date is stated.
          </p>

          <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            10. Contact
          </h2>
          <p>
            For privacy questions, data requests, or policy concerns, contact the ReSource AI team
            through the project&apos;s support channel.
          </p>
        </div>
      </div>
    </div>
  );
}

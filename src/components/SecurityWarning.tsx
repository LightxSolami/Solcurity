export function SecurityWarning() {
  return (
    <div className="mt-10 p-4 bg-risk-critical/10 border border-risk-critical/30 rounded-xl">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-risk-critical mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <div className="text-sm text-white/80">
          <p className="font-semibold text-white">Public address only.</p>
          <p>Never enter your seed phrase or private key. This scanner only requires your public Solana wallet address.</p>
        </div>
      </div>
    </div>
  );
}
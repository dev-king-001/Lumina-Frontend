import React, { useState } from "react";
import { useWalletAuth } from "@/src/hooks/useWalletAuth";
import { WebAuthnRegisterModal } from "@/src/components/auth/WebAuthnRegisterModal";

export default function OperatorLogin() {
  const [operatorId, setOperatorId] = useState("");
  const { isAuthenticated, userId, loginWithWallet, loginWithWebAuthn, logout } = useWalletAuth();
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [webAuthnError, setWebAuthnError] = useState("");

  const handleWalletLogin = async () => {
    if (!operatorId) return;
    await loginWithWallet(operatorId);
  };

  const handleWebAuthnLogin = async () => {
    if (!operatorId) return;
    setWebAuthnError("");
    const success = await loginWithWebAuthn(operatorId);
    if (!success) {
      setWebAuthnError("Failed to authenticate with security key");
    }
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
        <div className="w-full max-w-md p-8 border border-border rounded-lg shadow-xl bg-surface">
          <h2 className="text-2xl font-bold mb-4">Operator Console Access</h2>
          <p className="mb-6">Welcome, <span className="font-mono text-primary">{userId}</span></p>
          
          <div className="space-y-4">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full py-2 bg-nav-bg text-nav-text border border-nav-border rounded hover:bg-nav-surface transition-colors"
            >
              Enroll Security Key (WebAuthn)
            </button>

            <button
              onClick={logout}
              className="w-full py-2 bg-danger-bg text-danger-text rounded hover:bg-danger-hover transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        <WebAuthnRegisterModal
          userId={userId || ""}
          isOpen={isRegisterModalOpen}
          onClose={() => setIsRegisterModalOpen(false)}
          onSuccess={() => console.log("WebAuthn key successfully registered!")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground">
      <div className="w-full max-w-md p-8 border border-border rounded-lg shadow-xl bg-surface">
        <h1 className="text-2xl font-bold mb-6 text-center">Operator Login</h1>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-muted-text">Operator Public Key</label>
            <input
              type="text"
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              placeholder="G..."
              className="w-full p-2 bg-background border border-border rounded text-foreground focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <button
            onClick={handleWalletLogin}
            className="w-full py-2 bg-primary text-primary-text rounded hover:bg-primary-hover transition-colors font-medium"
          >
            Sign in with Stellar Wallet
          </button>

          <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-border"></div>
            <span className="flex-shrink-0 mx-4 text-muted-text text-sm">OR</span>
            <div className="flex-grow border-t border-border"></div>
          </div>

          <button
            onClick={handleWebAuthnLogin}
            className="w-full py-2 bg-nav-bg text-nav-text border border-nav-border rounded hover:bg-nav-surface transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Sign in with Security Key
          </button>
          
          {webAuthnError && (
            <p className="text-sm text-danger-text text-center mt-2">{webAuthnError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

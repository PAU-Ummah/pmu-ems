"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRole } from "@/hooks/useRole";
import Alert from "@/components/ui/alert/Alert";
import AccountInformationCard from "./_component/AccountInformationCard";
import SecurityCard from "./_component/SecurityCard";
import AppInformationCard from "./_component/AppInformationCard";

export default function SettingsPage() {
  const { userData } = useAuth();
  const { userRole } = useRole();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handlePasswordReset = async () => {
    if (!userData?.email) {
      setMessage({ type: 'error', text: 'No email address found for your account.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userData.email }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: 'Password reset email sent! Please check your inbox and follow the instructions to reset your password.' 
        });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to send password reset email' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="mb-4 text-2xl font-semibold text-gray-900 sm:text-3xl md:text-4xl">
        Settings
      </h1>

      {message && (
        <div className="mb-6">
          <Alert
            variant={message.type}
            title={message.type === 'success' ? 'Success' : 'Error'}
            message={message.text}
          />
        </div>
      )}

      <div className="flex flex-col gap-6 max-w-3xl">
        <AccountInformationCard
          email={userData?.email}
          displayName={userData?.displayName}
          role={userRole || ''}
        />

        <SecurityCard
          onPasswordReset={handlePasswordReset}
          loading={loading}
        />

        <AppInformationCard userId={userData?.id} />
      </div>
    </div>
  );
}
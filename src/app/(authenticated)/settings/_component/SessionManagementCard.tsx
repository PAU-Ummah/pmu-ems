"use client";

import { useState } from "react";
import { useRole } from "@/hooks/useRole";
import { useCurrentSession } from "@/hooks/useCurrentSession";
import Button from "@/components/ui/button/Button";
import Alert from "@/components/ui/alert/Alert";
import Label from "@/components/form/Label";
import InputField from "@/components/form/input/InputField";
import { runSessionRollover } from "@/services/sessionRollover";
import { runInitialSessionMigration } from "@/services/sessionMigration";

export default function SessionManagementCard() {
  const { hasRole } = useRole();
  const { currentSessionId, currentSession, loading, refresh } = useCurrentSession();
  const [newSessionName, setNewSessionName] = useState("");
  const [initialSessionName, setInitialSessionName] = useState("");
  const [rollingOver, setRollingOver] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleInitialize = async () => {
    if (!initialSessionName.trim()) {
      setMessage({ type: "error", text: "Enter the initial session name (e.g. 2024/2025)." });
      return;
    }
    setMigrating(true);
    setMessage(null);
    try {
      const result = await runInitialSessionMigration(initialSessionName.trim());
      if (result.success) {
        setMessage({
          type: "success",
          text: `Session "${initialSessionName.trim()}" created. ${result.peopleUpdated} people and ${result.eventsUpdated} events assigned.`,
        });
        setInitialSessionName("");
        await refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Migration failed." });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Migration failed.",
      });
    } finally {
      setMigrating(false);
    }
  };

  const handleRollover = async () => {
    if (!currentSessionId || !newSessionName.trim()) {
      setMessage({ type: "error", text: "Enter the new session name (e.g. 2025/2026)." });
      return;
    }
    setRollingOver(true);
    setMessage(null);
    try {
      const result = await runSessionRollover(currentSessionId, newSessionName.trim());
      if (result.success) {
        setMessage({
          type: "success",
          text: `Session rollover complete. ${result.graduatedCount} graduated, ${result.progressedCount} progressed. New session "${newSessionName.trim()}" is now active. You can upload new YR1 students on the People page.`,
        });
        setNewSessionName("");
        await refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Rollover failed." });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Rollover failed.",
      });
    } finally {
      setRollingOver(false);
    }
  };

  if (!hasRole("admin")) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-theme-sm dark:border-gray-800 dark:bg-white/[0.03]">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
        Session management
      </h3>

      {message && (
        <div className="mb-4">
          <Alert
            variant={message.type}
            title={message.type === "success" ? "Success" : "Error"}
            message={message.text}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Current session:
            </p>
            <p className="mt-1 font-medium text-gray-900 dark:text-white/90">
              {currentSession?.name ?? "None configured"}
            </p>
          </div>

          {!currentSessionId && (
            <>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                No session is set. Initialize one to assign all existing people and events to it.
              </p>
              <div>
                <Label htmlFor="initial-session-name">Initial session name</Label>
                <InputField
                  id="initial-session-name"
                  name="initialSessionName"
                  value={initialSessionName}
                  onChange={(changeEvent) => setInitialSessionName(changeEvent.target.value)}
                  placeholder="e.g. 2024/2025"
                />
              </div>
              <Button
                variant="primary"
                onClick={handleInitialize}
                disabled={migrating || !initialSessionName.trim()}
              >
                {migrating ? "Initializing…" : "Initialize session"}
              </Button>
            </>
          )}

          {currentSessionId && (
            <>
              <div>
                <Label htmlFor="new-session-name">New session name (after rollover)</Label>
                <InputField
                  id="new-session-name"
                  name="newSessionName"
                  value={newSessionName}
                  onChange={(changeEvent) => setNewSessionName(changeEvent.target.value)}
                  placeholder="e.g. 2025/2026"
                />
              </div>
              <div>
                <Button
                  variant="primary"
                  onClick={handleRollover}
                  disabled={rollingOver || !newSessionName.trim()}
                >
                  {rollingOver ? "Running rollover…" : "End session & start new"}
                </Button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                This will: mark YR4 (non-engineering) and YR5 (engineering) as graduated, promote
                remaining students by one year, create the new session, and make it current. Then
                upload new YR1 students on the People page.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

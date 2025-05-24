"use client";

import { useEffect, useState } from "react";
import LoadingModal from "./LoadingModal";

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Initializing app...");

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setLoadingMessage("Checking environment...");
        // Check if required environment variables are set
        const setupResponse = await fetch("/api/setup");
        if (!setupResponse.ok) {
          throw new Error("Failed to check environment setup");
        }
        const setupData = await setupResponse.json();

        if (!setupData.hasApiKey || !setupData.hasParentPageId) {
          setLoadingMessage("Missing environment variables...");
          // Wait a bit to show the message
          await new Promise((resolve) => setTimeout(resolve, 2000));
          throw new Error("Missing required environment variables");
        }

        setLoadingMessage("Checking database status...");
        // Check database status
        const statusResponse = await fetch("/api/status");
        if (!statusResponse.ok) {
          throw new Error("Failed to check database status");
        }

        // Show completion message and dismiss immediately
        setLoadingMessage("App ready!");
        setIsInitializing(false);
      } catch (error) {
        console.error("Error initializing app:", error);
        // Still show the error in the UI
        setLoadingMessage("Error initializing app...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  return (
    <>
      <LoadingModal
        isLoading={isInitializing}
        message={loadingMessage}
        autoDismissAfter={isInitializing ? 0 : 100} // Auto-dismiss immediately when not initializing
      />
      {children}
    </>
  );
}

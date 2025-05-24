"use client";

import { useState } from "react";

export default function SetupDatabase() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateDatabase = async () => {
    setIsLoading(true);
    setError("");

    try {
      // First, create the database
      const createResponse = await fetch("/api/setup", {
        method: "POST",
      });

      if (!createResponse.ok) {
        const data = await createResponse.json();
        throw new Error(data.error || "Failed to create database");
      }

      const { databaseId } = await createResponse.json();

      // Then, set the database ID
      const setResponse = await fetch("/api/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ databaseId }),
      });

      if (!setResponse.ok) {
        const data = await setResponse.json();
        throw new Error(data.error || "Failed to set database ID");
      }

      // Wait a moment for the database ID to be saved
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if the database was created successfully
      const statusResponse = await fetch("/api/status");
      const statusData = await statusResponse.json();

      if (!statusData.hasDatabase) {
        throw new Error("Database was created but not found. Please refresh the page.");
      }

      // Force a hard refresh to reload the page with the new database ID
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create database");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Welcome to Moving Boxes</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Let&apos;s set up your Notion database to get started
          </p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            onClick={handleCreateDatabase}
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Creating Database..." : "Create Notion Database"}
          </button>
        </div>
      </div>
    </div>
  );
}

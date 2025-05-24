"use client";

import { useState, useEffect } from "react";
import { BoxIcon, PlusIcon, Trash2, X, QrCode } from "lucide-react";
import { useRouter } from "next/navigation";
import { Box } from "@src/lib/notion";
import { setDatabaseId } from "@src/lib/db";
import QRScanner from "@src/components/QRScanner";

export default function Home() {
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [boxToDelete, setBoxToDelete] = useState<Box | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [hasDatabase, setHasDatabase] = useState(true);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setIsLoading(true);
      setError(null);
      console.log("Fetching boxes...");
      const response = await fetch("/api/boxes");

      if (response.status === 404) {
        console.log("No database found (404 response)");
        setHasDatabase(false);
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.error || "Failed to fetch boxes");
      }

      const data = await response.json();
      console.log("Fetched boxes:", data);
      setBoxes(data);
      setHasDatabase(true);
    } catch (err) {
      console.error("Error in loadData:", err);
      setError(err instanceof Error ? err.message : "Failed to load boxes");
    } finally {
      setIsLoading(false);
    }
  }

  const handleSetup = async () => {
    try {
      setIsSettingUp(true);
      setError(null);

      // Create the database using API route
      const response = await fetch("/api/setup", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create database");
      }

      const { databaseId } = await response.json();

      if (!databaseId) {
        throw new Error("Failed to create database");
      }

      // Save the database ID
      await setDatabaseId(databaseId);

      // Force a hard refresh to ensure we get the new database
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set up database");
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleAddBox = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/boxes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Box ${boxes.length + 1}`,
          description: "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add box");
      }

      // Refresh the boxes list
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add box");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQRCodeDetected = (qrId: string) => {
    setShowQRScanner(false);
    router.push(`/box/${qrId}`);
  };

  const handleEditBox = (qrId: string) => {
    router.push(`/box/${qrId}`);
  };

  const handleDeleteBox = async (box: Box) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/boxes/${box.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete box");
      }

      // Refresh the boxes list
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete box");
    } finally {
      setIsLoading(false);
      setBoxToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="bg-white rounded-2xl shadow p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoading && !hasDatabase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="text-center">
            <BoxIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Database Found</h3>
            <p className="mt-1 text-sm text-gray-500">Let&apos;s set up your moving boxes database.</p>
            <div className="mt-6">
              <button
                onClick={handleSetup}
                disabled={isSettingUp}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSettingUp ? "Setting up..." : "Set Up Database"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <button onClick={loadData} className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium">
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">📦 Moving Boxes</h1>
            <p className="text-sm text-gray-500">Manage your storage boxes</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowQRScanner(true)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Scan QR Code"
            >
              <QrCode className="h-5 w-5" />
            </button>
            <button
              onClick={handleAddBox}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              title="Add New Box"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* QR Scanner Modal */}
        {showQRScanner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Scan QR Code</h3>
                <button onClick={() => setShowQRScanner(false)} className="text-gray-400 hover:text-gray-500">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <QRScanner onQRCodeDetected={handleQRCodeDetected} />
            </div>
          </div>
        )}

        {/* Boxes Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {boxes.length === 0 ? (
            // Empty state
            <div className="col-span-full text-center py-12">
              <BoxIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No boxes</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new box.</p>
              <div className="mt-6">
                <button
                  onClick={handleAddBox}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Box
                </button>
              </div>
            </div>
          ) : (
            // Boxes list
            boxes.map((box) => (
              <div
                key={box.id}
                onClick={() => handleEditBox(box.qrId)}
                className="bg-white overflow-hidden shadow rounded-lg cursor-pointer hover:shadow-md transition-shadow"
              >
                {box.photos && box.photos.length > 0 && (
                  <div className="aspect-video relative">
                    <img src={box.photos[0]} alt={`Preview of ${box.name}`} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">{box.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          box.status === "En préparation"
                            ? "bg-red-100 text-red-800"
                            : box.status === "Scellé"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {box.status}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setBoxToDelete(box);
                        }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete box"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 line-clamp-2">{box.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Box Modal */}
      {boxToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Delete Box</h3>
              <button onClick={() => setBoxToDelete(null)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete &quot;{boxToDelete.name}&quot;? This action cannot be undone and all
              associated photos will be permanently deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBoxToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteBox(boxToDelete)}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

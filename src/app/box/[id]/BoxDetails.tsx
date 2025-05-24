"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, BoxIcon, Plus, Trash2, X, MoreVertical } from "lucide-react";
import Link from "next/link";
import { Box } from "@src/lib/notion";
import { updateBox, uploadPhotos, deletePhoto } from "@src/app/actions";
import { useRouter } from "next/navigation";
import QRScanner from "@src/components/QRScanner";

interface BoxDetailsProps {
  initialBox: Box;
}

export default function BoxDetails({ initialBox }: BoxDetailsProps) {
  const router = useRouter();
  const mounted = useRef(false);
  const [box, setBox] = useState<Box | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editedBox, setEditedBox] = useState<Box | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteBoxModal, setShowDeleteBoxModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showGallery, setShowGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);

  useEffect(() => {
    if (!mounted.current) {
      setBox(initialBox);
      setEditedBox(initialBox);
      mounted.current = true;
    }
  }, [initialBox]);

  const handleSave = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!box?.id || !editedBox) return;

      const updatedBox = await updateBox(box.id, editedBox);
      setBox(updatedBox);
      setEditedBox(updatedBox);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update box");
    } finally {
      setIsLoading(false);
    }
  }, [box?.id, editedBox]);

  const handlePhotoUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0 || !box?.id) return;

      try {
        setIsLoading(true);
        const formData = new FormData();
        Array.from(files).forEach((file) => {
          formData.append("photos", file);
        });

        const updatedBox = await uploadPhotos(box.id, formData);
        setBox(updatedBox);
        setEditedBox(updatedBox);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload photos");
      } finally {
        setIsLoading(false);
      }
    },
    [box?.id]
  );

  const handleDeletePhoto = useCallback((photoUrl: string) => {
    setPhotoToDelete(photoUrl);
    setShowDeleteModal(true);
  }, []);

  const confirmDeletePhoto = useCallback(async () => {
    if (!photoToDelete || !box?.id) return;

    try {
      setIsLoading(true);
      const updatedBox = await deletePhoto(box.id, photoToDelete);
      setBox(updatedBox);
      setEditedBox(updatedBox);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete photo");
    } finally {
      setIsLoading(false);
      setShowDeleteModal(false);
      setPhotoToDelete(null);
    }
  }, [box?.id, photoToDelete]);

  const handlePhotoClick = useCallback((index: number) => {
    setCurrentPhotoIndex(index);
    setShowGallery(true);
  }, []);

  const handleGalleryClose = useCallback(() => {
    setShowGallery(false);
  }, []);

  const handleGallerySwipe = useCallback(
    (direction: "left" | "right") => {
      if (!box?.photos) return;
      const newIndex =
        direction === "left"
          ? (currentPhotoIndex + 1) % box.photos.length
          : (currentPhotoIndex - 1 + box.photos.length) % box.photos.length;
      setCurrentPhotoIndex(newIndex);
    },
    [box?.photos, currentPhotoIndex]
  );

  // Add keyboard event handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showGallery) return;

      switch (e.key) {
        case "Escape":
          handleGalleryClose();
          break;
        case "ArrowLeft":
          handleGallerySwipe("right");
          break;
        case "ArrowRight":
          handleGallerySwipe("left");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showGallery, handleGalleryClose, handleGallerySwipe]);

  const handleDeleteBox = useCallback(async () => {
    if (!box?.id) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/boxes/${box.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete box");
      }

      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete box");
    } finally {
      setIsLoading(false);
      setShowDeleteBoxModal(false);
    }
  }, [box?.id, router]);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleQRCodeDetected = useCallback(
    async (qrId: string) => {
      if (!box?.id) return;

      try {
        setIsLoading(true);
        const updatedBox = await updateBox(box.id, { ...editedBox, qrId });
        setBox(updatedBox);
        setEditedBox(updatedBox);
        setShowQRScanner(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update QR ID");
      } finally {
        setIsLoading(false);
      }
    },
    [box?.id, editedBox]
  );

  const InfoCard = useMemo(() => {
    return function InfoCard({
      icon,
      title,
      children,
      className = "",
      headerAction,
    }: {
      icon: React.ReactNode;
      title: string;
      children: React.ReactNode;
      className?: string;
      headerAction?: React.ReactNode;
    }) {
      return (
        <div className={`bg-white rounded-2xl shadow p-4 ${className}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {icon}
              <h2 className="text-md font-semibold text-gray-800">{title}</h2>
            </div>
            {headerAction}
          </div>
          {children}
        </div>
      );
    };
  }, []);

  if (!box || !editedBox) {
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium">
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 min-w-0 flex-1 mr-4">
              <Link href="/" className="flex-shrink-0 flex items-center text-gray-700 hover:text-black transition">
                <ArrowLeft className="h-5 w-5 mr-2" />
                <span className="text-sm font-medium">Back</span>
              </Link>
              <div className="min-w-0 flex-1">
                <h1 className="text-3xl font-extrabold text-gray-900 truncate">📦 {box.name || "Untitled Box"}</h1>
                <p className="text-sm text-gray-500">Manage your storage box</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <MoreVertical className="h-5 w-5" />
                </button>
                {showMenu && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteBoxModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Delete Box
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Photos */}
          <InfoCard
            icon={<BoxIcon className="h-6 w-6 text-yellow-500" />}
            title="Photos"
            className="sm:col-span-2 lg:col-span-3"
            headerAction={
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                title="Add photos"
              >
                <Plus className="h-5 w-5" />
              </button>
            }
          >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {box.photos?.map((photo, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={photo}
                    alt={`Box photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg cursor-pointer"
                    onClick={() => handlePhotoClick(index)}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </InfoCard>

          {/* Box Name */}
          <InfoCard icon={<BoxIcon className="w-5 h-5 text-blue-500" />} title="Label">
            <input
              type="text"
              value={editedBox.name}
              onChange={(e) => setEditedBox({ ...editedBox, name: e.target.value })}
              className="w-full p-2 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700"
              placeholder="Enter box label"
            />
          </InfoCard>

          {/* QR ID */}
          <InfoCard
            icon={<BoxIcon className="w-5 h-5 text-purple-500" />}
            title="QR ID"
            headerAction={
              <button
                onClick={() => setShowQRScanner(!showQRScanner)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {showQRScanner ? "Hide QR Scanner" : "Change QR ID"}
              </button>
            }
          >
            {showQRScanner ? (
              <QRScanner onQRCodeDetected={handleQRCodeDetected} initialValue={box.qrId} />
            ) : (
              <div className="flex items-center">
                <input
                  type="text"
                  value={editedBox.qrId}
                  readOnly
                  className="w-full p-2 bg-gray-50 border-none focus:outline-none focus:ring-0 text-gray-700"
                />
              </div>
            )}
          </InfoCard>

          {/* Status */}
          <InfoCard icon={<BoxIcon className="h-6 w-6 text-green-500" />} title="Status">
            <select
              value={editedBox.status || "En préparation"}
              onChange={(e) => setEditedBox({ ...editedBox, status: e.target.value })}
              className="w-full p-2 bg-transparent border-none focus:outline-none focus:ring-0 text-gray-700"
            >
              <option value="En préparation">En préparation</option>
              <option value="Scellé">Scellé</option>
              <option value="Ouvert">Ouvert</option>
            </select>
          </InfoCard>

          {/* Description */}
          <InfoCard
            icon={<BoxIcon className="h-6 w-6 text-purple-500" />}
            title="Description"
            className="sm:col-span-2 lg:col-span-3"
          >
            <textarea
              value={editedBox.description || ""}
              onChange={(e) => setEditedBox({ ...editedBox, description: e.target.value })}
              className="w-full min-h-[100px] p-4 bg-transparent border-none focus:outline-none focus:ring-0 resize-none text-gray-700"
              placeholder="No description"
            />
          </InfoCard>
        </div>
      </div>

      {/* Full-screen Gallery */}
      {showGallery && box.photos && (
        <div
          className="fixed inset-0 bg-black z-50 flex items-center justify-center"
          onClick={handleGalleryClose} // Close when clicking outside the image
        >
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent closing when clicking the button
              handleGalleryClose();
            }}
            className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          <div
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image container
          >
            <img
              src={box.photos[currentPhotoIndex]}
              alt={`Box photo ${currentPhotoIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />

            {/* Navigation buttons */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGallerySwipe("right");
              }}
              className="absolute left-4 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="h-8 w-8" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleGallerySwipe("left");
              }}
              className="absolute right-4 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <ArrowLeft className="h-8 w-8 rotate-180" />
            </button>
          </div>

          {/* Photo counter */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm">
            {currentPhotoIndex + 1} / {box.photos.length}
          </div>
        </div>
      )}

      {/* Delete Photo Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Photo</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this photo? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeletePhoto}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Box Modal */}
      {showDeleteBoxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Box</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this box? This action cannot be undone and all associated photos will be
              permanently deleted.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteBoxModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBox}
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

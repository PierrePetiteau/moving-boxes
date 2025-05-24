import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Keyboard, Camera, AlertCircle } from "lucide-react";

interface QRScannerProps {
  onQRCodeDetected: (qrId: string) => void;
  initialValue?: string;
}

export default function QRScanner({ onQRCodeDetected, initialValue = "" }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualInput, setManualInput] = useState(initialValue);
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);

  // Check for camera availability and request permissions
  useEffect(() => {
    async function checkCamera() {
      try {
        // First, request camera permissions explicitly
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop the stream immediately after getting permission
        stream.getTracks().forEach((track) => track.stop());

        // Then enumerate devices to confirm camera availability
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoDevice = devices.some((device) => device.kind === "videoinput");
        setHasCamera(hasVideoDevice);

        if (!hasVideoDevice) {
          setCameraError("No camera found on your device.");
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setHasCamera(false);
        if (err instanceof Error) {
          if (err.name === "NotAllowedError") {
            setCameraError("Camera access was denied. Please allow camera access in your browser settings.");
          } else if (err.name === "NotFoundError") {
            setCameraError("No camera found on your device.");
          } else {
            setCameraError(`Unable to access camera: ${err.message}`);
          }
        } else {
          setCameraError("Unable to access camera. Please check your device permissions.");
        }
      }
    }
    checkCamera();
  }, []);

  useEffect(() => {
    if (isScanning && scannerDivRef.current && !scannerRef.current && hasCamera) {
      try {
        console.log("Initializing QR scanner...");
        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            showZoomSliderIfSupported: true,
            defaultZoomValueIfSupported: 2,
            formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
            rememberLastUsedCamera: true,
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          },
          false
        );

        console.log("Setting up QR scanner callbacks...");
        scannerRef.current.render(
          (decodedText) => {
            console.log("QR Code detected! Raw value:", decodedText);

            // Try to extract QR ID from the decoded text
            let qrId = decodedText;

            // If the QR code contains a URL, try to extract the ID from it
            try {
              const url = new URL(decodedText);
              const pathParts = url.pathname.split("/");
              const lastPart = pathParts[pathParts.length - 1];
              if (lastPart) {
                qrId = lastPart;
                console.log("Extracted QR ID from URL:", qrId);
              }
            } catch {
              console.log("Not a URL, using raw value as QR ID");
            }

            console.log("Final QR ID to be used:", qrId);
            onQRCodeDetected(qrId);
            stopScanning();
          },
          (error) => {
            // Only show errors that aren't related to no QR code found
            if (!error.includes("No QR code found")) {
              console.error("QR scan error:", error);
              setCameraError("Error scanning QR code. Please try again.");
            }
          }
        );
        console.log("QR scanner initialized successfully");
      } catch (err) {
        console.error("Error initializing scanner:", err);
        setCameraError("Failed to initialize camera. Please try again.");
        stopScanning();
      }
    }

    return () => {
      if (scannerRef.current) {
        console.log("Cleaning up QR scanner...");
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [isScanning, onQRCodeDetected, hasCamera]);

  const stopScanning = () => {
    setIsScanning(false);
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      console.log("Manual QR ID submitted:", manualInput.trim());
      onQRCodeDetected(manualInput.trim());
    }
  };

  return (
    <div className="space-y-4">
      {cameraError && (
        <div className="flex items-center p-3 bg-red-50 text-red-700 rounded-md">
          <AlertCircle className="w-5 h-5 mr-2" />
          <span className="text-sm">{cameraError}</span>
        </div>
      )}

      <div className="flex items-center space-x-4">
        {hasCamera && (
          <button
            onClick={() => setIsScanning(!isScanning)}
            className={`flex items-center px-4 py-2 rounded-md ${
              isScanning ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            <Camera className="w-5 h-5 mr-2" />
            {isScanning ? "Stop Scanning" : "Start Scanning"}
          </button>
        )}
        <div className="flex items-center text-sm text-gray-500">
          <Keyboard className="w-4 h-4 mr-1" />
          <span>or enter manually</span>
        </div>
      </div>

      {isScanning && hasCamera ? (
        <div ref={scannerDivRef} id="qr-reader" className="w-full max-w-sm mx-auto" />
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Enter QR ID manually"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}

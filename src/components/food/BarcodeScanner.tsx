import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Loader2, Camera, X } from "lucide-react";
import { lookupBarcode, FoodItem } from "@/lib/open-food-facts";
import { toast } from "sonner";

interface Props {
  onFoodFound: (food: FoodItem) => void;
}

export default function BarcodeScanner({ onFoodFound }: Props) {
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const startScanner = async () => {
    setError(null);
    processedRef.current = false;

    try {
      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 30,
          qrbox: { width: 280, height: 140 },
          aspectRatio: 1.5,
          videoConstraints: {
            facingMode: "environment",
            advanced: [
              { focusMode: "continuous" } as any,
              { width: { ideal: 1920 } } as any,
              { height: { ideal: 1080 } } as any,
            ],
          },
        },
        async (decodedText) => {
          if (processedRef.current) return;
          processedRef.current = true;

          setLooking(true);
          await stopScanner();

          const food = await lookupBarcode(decodedText);
          setLooking(false);

          if (food) {
            onFoodFound(food);
          } else {
            toast.error("Product not found in database");
            processedRef.current = false;
          }
        },
        () => {} // ignore scan failures
      );
    } catch (err) {
      setScanning(false);
      if (err instanceof Error && err.message.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access.");
      } else {
        setError("Could not start camera. Try using Search instead.");
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  if (looking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Looking up product...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center p-4 gap-4">
      {!scanning && (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="h-20 w-20 rounded-2xl bg-secondary flex items-center justify-center">
            <Camera className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium">Scan a Barcode</p>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              Point your camera at a food barcode to instantly look up nutrition info
            </p>
          </div>
          <Button onClick={startScanner} className="h-11 px-6">
            <Camera className="h-4 w-4 mr-2" /> Open Camera
          </Button>
          {error && (
            <p className="text-xs text-destructive text-center max-w-[260px]">{error}</p>
          )}
        </div>
      )}

      <div
        id="barcode-reader"
        ref={containerRef}
        className={`w-full max-w-[320px] rounded-xl overflow-hidden ${scanning ? "" : "hidden"}`}
      />

      {scanning && (
        <div className="text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            Point at a barcode on food packaging
          </p>
          <Button variant="outline" size="sm" onClick={stopScanner}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

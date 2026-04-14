import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Camera, X, ZoomIn } from "lucide-react";
import { lookupBarcode, FoodItem } from "@/lib/open-food-facts";
import { toast } from "sonner";

interface Props {
  onFoodFound: (food: FoodItem) => void;
}

export default function BarcodeScanner({ onFoodFound }: Props) {
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [zoomRange, setZoomRange] = useState<{ min: number; max: number } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);
  const trackRef = useRef<MediaStreamTrack | null>(null);

  const stopScanner = async () => {
    trackRef.current = null;
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) {
          await scannerRef.current.stop();
        }
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setScanning(false);
    setZoom(1);
    setZoomRange(null);
  };

  const applyZoom = async (level: number) => {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: level } as any] });
      setZoom(level);
    } catch {
      // zoom not supported
    }
  };

  const startScanner = async () => {
    setError(null);
    processedRef.current = false;

    try {
      const cameras = await Html5Qrcode.getCameras().catch(() => []);
      const preferredRearCamera =
        cameras.find((camera) => {
          const label = camera.label.toLowerCase();
          return (
            (label.includes("back") || label.includes("rear")) &&
            !label.includes("front") &&
            !label.includes("ultra") &&
            !label.includes("0.5") &&
            !label.includes("macro")
          );
        }) ??
        cameras.find((camera) => {
          const label = camera.label.toLowerCase();
          return (label.includes("back") || label.includes("rear")) && !label.includes("front");
        });

      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        preferredRearCamera?.id ?? { facingMode: { ideal: "environment" } },
        {
          fps: 24,
          qrbox: { width: 280, height: 140 },
          aspectRatio: 1.5,
          disableFlip: true,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
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
        () => {}
      );

      // Get the video track for zoom & focus control
      try {
        const settings = scanner.getRunningTrackSettings() as any;
        const videoElement = document.querySelector("#barcode-reader video") as HTMLVideoElement | null;
        const track = videoElement?.srcObject instanceof MediaStream
          ? videoElement.srcObject.getVideoTracks()[0]
          : null;

        if (track) {
          trackRef.current = track;
          const capabilities = track.getCapabilities() as any;

          // Apply continuous autofocus
          if (capabilities?.focusMode?.includes("continuous")) {
            await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
          }

          // Expose zoom slider if supported
          if (capabilities?.zoom) {
            const min = capabilities.zoom.min ?? 1;
            const max = Math.min(capabilities.zoom.max ?? 1, 8);
            if (max > min) {
              setZoomRange({ min, max });
              setZoom(settings?.zoom ?? min);
            }
          }
        }
      } catch {
        // zoom/focus not available
      }
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
        <div className="w-full max-w-[320px] space-y-3">
          {zoomRange && (
            <div className="flex items-center gap-3 px-1">
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
              <Slider
                min={zoomRange.min}
                max={zoomRange.max}
                step={0.1}
                value={[zoom]}
                onValueChange={([v]) => applyZoom(v)}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">{zoom.toFixed(1)}×</span>
            </div>
          )}
          <div className="text-center space-y-3">
            <p className="text-xs text-muted-foreground">
              Point at a barcode on food packaging
            </p>
            <Button variant="outline" size="sm" onClick={stopScanner}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

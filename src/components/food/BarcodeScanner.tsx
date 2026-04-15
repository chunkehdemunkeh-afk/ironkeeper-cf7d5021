import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Camera, X, ZoomIn, ZoomOut } from "lucide-react";
import { lookupBarcode, FoodItem } from "@/lib/open-food-facts";
import { toast } from "sonner";

interface Props {
  onFoodFound: (food: FoodItem) => void;
}

// Detect iOS
const isIOS =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export default function BarcodeScanner({ onFoodFound }: Props) {
  const [scanning, setScanning]   = useState(false);
  const [looking, setLooking]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [hwZoom, setHwZoom]       = useState(1);
  const [hwZoomRange, setHwZoomRange] = useState<{ min: number; max: number } | null>(null);

  const scannerRef  = useRef<Html5Qrcode | null>(null);
  const trackRef    = useRef<MediaStreamTrack | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);

  // ── Handle a successfully decoded barcode ──────────────────────────────────
  const handleDecoded = useCallback(async (rawText: string) => {
    if (processedRef.current) return;
    processedRef.current = true;
    setLooking(true);
    await stopScanner();
    const food = await lookupBarcode(rawText);
    setLooking(false);
    if (food) {
      onFoodFound(food);
    } else {
      toast.error("Product not found in database");
      processedRef.current = false;
    }
  }, [onFoodFound]);

  // ── Stop everything ────────────────────────────────────────────────────────
  const stopScanner = useCallback(async () => {
    trackRef.current = null;
    if (scannerRef.current) {
      try {
        if (scannerRef.current.getState() === 2) await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanning(false);
    setHwZoom(1);
    setHwZoomRange(null);
  }, []);

  // ── Start scanner (html5-qrcode for ALL platforms) ─────────────────────────
  const startScanner = useCallback(async () => {
    setError(null);
    processedRef.current = false;

    try {
      const cameras = await Html5Qrcode.getCameras().catch(() => []);

      // Pick the best rear camera — avoid ultra-wide / macro on Android
      const best =
        cameras.find(c => {
          const l = c.label.toLowerCase();
          return (
            (l.includes("back") || l.includes("rear")) &&
            !l.includes("front") &&
            !l.includes("ultra") &&
            !l.includes("0.5") &&
            !l.includes("macro")
          );
        }) ??
        cameras.find(c => {
          const l = c.label.toLowerCase();
          return (l.includes("back") || l.includes("rear")) && !l.includes("front");
        });
      const cameraId = best?.id ?? { facingMode: { ideal: "environment" } };

      const scanner = new Html5Qrcode("barcode-reader", {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 320, height: 200 },
          aspectRatio: 1.5,
          disableFlip: true,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        },
        (decodedText) => handleDecoded(decodedText),
        () => {}
      );

      // iOS workaround: reset video constraints after start to kick the decoder
      // See https://github.com/mebjas/html5-qrcode/issues/820
      if (isIOS) {
        try {
          // Small delay to let the scanner fully initialise
          await new Promise(r => setTimeout(r, 500));
          if (scannerRef.current) {
            const caps = scannerRef.current.getRunningTrackCapabilities() as any;
            const resetConstraints: MediaTrackConstraints = {
              width: { ideal: caps?.width?.max ?? 1920 },
              height: { ideal: caps?.height?.max ?? 1080 },
            };
            await scannerRef.current.applyVideoConstraints(resetConstraints);
          }
        } catch {
          // Non-critical — scanner still works without the reset
        }
      }

      // Expose hardware zoom + autofocus
      try {
        const videoEl = document.querySelector("#barcode-reader video") as HTMLVideoElement | null;
        const track = videoEl?.srcObject instanceof MediaStream
          ? videoEl.srcObject.getVideoTracks()[0]
          : null;

        if (track) {
          trackRef.current = track;
          const capabilities = track.getCapabilities() as any;

          // Enable continuous autofocus
          if (capabilities?.focusMode?.includes("continuous")) {
            await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
          }

          // Zoom slider (Android mainly, some iOS devices too)
          if (capabilities?.zoom) {
            const min = capabilities.zoom.min ?? 1;
            const max = Math.min(capabilities.zoom.max ?? 1, 8);
            if (max > min) {
              setHwZoomRange({ min, max });
              setHwZoom(min);
            }
          }
        }
      } catch {}

    } catch (err) {
      setScanning(false);
      if (err instanceof Error && err.message.includes("Permission")) {
        setError("Camera permission denied. Please allow camera access.");
      } else {
        setError("Could not start camera. Try using Search instead.");
      }
    }
  }, [handleDecoded]);

  useEffect(() => { return () => { void stopScanner(); }; }, [stopScanner]);

  const applyHwZoom = async (level: number) => {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: level } as any] });
      setHwZoom(level);
    } catch {}
  };

  if (looking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Looking up product...</p>
      </div>
    );
  }

  const showZoom = scanning && !!hwZoomRange;
  const zoomMin  = hwZoomRange?.min ?? 1;
  const zoomMax  = hwZoomRange?.max ?? 4;

  return (
    <div
      className="flex-1 flex flex-col items-center p-4 gap-4"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
    >
      {/* ── Idle state ─────────────────────────────────────────────────────── */}
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

      {/* ── html5-qrcode viewfinder (all platforms) ────────────────────────── */}
      <div className="relative w-full max-w-[320px]">
        <div
          id="barcode-reader"
          ref={containerRef}
          className={`w-full rounded-xl overflow-hidden ${scanning ? "" : "hidden"}`}
        />
        {showZoom && (
          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl overflow-hidden
                          bg-black/50 backdrop-blur-sm px-3 pt-2 pb-3 z-10">
            <div className="flex items-center gap-2">
              <ZoomOut className="h-3.5 w-3.5 text-white/80 shrink-0" />
              <Slider
                min={zoomMin}
                max={zoomMax}
                step={0.1}
                value={[hwZoom]}
                onValueChange={([v]) => applyHwZoom(v)}
                className="flex-1"
              />
              <ZoomIn className="h-3.5 w-3.5 text-white/80 shrink-0" />
              <span className="text-xs text-white/80 tabular-nums w-8 text-right">
                {hwZoom.toFixed(1)}×
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Scanning controls ────────────────────────────────────────────────── */}
      {scanning && (
        <div className="w-full max-w-[320px] text-center space-y-2 mt-2">
          <p className="text-xs font-medium text-foreground">
            {isIOS ? "Hold phone 15-25 cm from barcode" : "Point at a barcode"}
          </p>
          <Button variant="outline" size="sm" onClick={stopScanner} className="mt-2">
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

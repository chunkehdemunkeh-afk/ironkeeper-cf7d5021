import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Camera, X, ZoomIn, ZoomOut } from "lucide-react";
import { lookupBarcode, FoodItem } from "@/lib/open-food-facts";
import { toast } from "sonner";

interface Props {
  onFoodFound: (food: FoodItem) => void;
}

// Detect iOS — includes iPad (iOS 13+ disguises as MacIntel)
const isIOS =
  /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export default function BarcodeScanner({ onFoodFound }: Props) {
  const [scanning, setScanning]     = useState(false);
  const [looking, setLooking]       = useState(false);
  const [error, setError]           = useState<string | null>(null);

  // Android: hardware zoom via applyConstraints
  const [hwZoom, setHwZoom]         = useState(1);
  const [hwZoomRange, setHwZoomRange] = useState<{ min: number; max: number } | null>(null);

  // iOS: software zoom via CSS transform (always available)
  const [swZoom, setSwZoom]         = useState(1.5);

  const scannerRef  = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);
  const trackRef    = useRef<MediaStreamTrack | null>(null);

  // ── iOS software zoom ───────────────────────────────────────────────────────
  // Scales the video element visually so users can aim from a proper focus
  // distance. Html5Qrcode still processes the original (unscaled) frame.
  const applySwZoom = (level: number) => {
    const video = document.querySelector("#barcode-reader video") as HTMLVideoElement | null;
    if (video) {
      video.style.transform      = `scale(${level})`;
      video.style.transformOrigin = "center center";
    }
    setSwZoom(level);
  };

  // ── Android hardware zoom ───────────────────────────────────────────────────
  const applyHwZoom = async (level: number) => {
    const track = trackRef.current;
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ zoom: level } as any] });
      setHwZoom(level);
    } catch {}
  };

  const stopScanner = async () => {
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
    setSwZoom(1.5);
  };

  const startScanner = async () => {
    setError(null);
    processedRef.current = false;

    try {
      // ── Camera selection ────────────────────────────────────────────────────
      // On iOS, specifying a camera ID bypasses the system's autofocus logic
      // and can select a camera that blurs at barcode distances. Always use
      // facingMode on iOS so the OS picks the best lens.
      let cameraId: string | { facingMode: ConstrainDOMString };

      if (isIOS) {
        cameraId = { facingMode: { exact: "environment" } };
      } else {
        const cameras = await Html5Qrcode.getCameras().catch(() => []);
        const best =
          cameras.find((c) => {
            const l = c.label.toLowerCase();
            return (
              (l.includes("back") || l.includes("rear")) &&
              !l.includes("front") &&
              !l.includes("ultra") &&
              !l.includes("0.5") &&
              !l.includes("macro")
            );
          }) ??
          cameras.find((c) => {
            const l = c.label.toLowerCase();
            return (l.includes("back") || l.includes("rear")) && !l.includes("front");
          });
        cameraId = best?.id ?? { facingMode: { ideal: "environment" } };
      }

      // ── Video constraints ───────────────────────────────────────────────────
      // iOS autofocus works more reliably at 1280×720 than 1920×1080.
      // The lower resolution reduces camera mode switching that can interfere
      // with focus. Android keeps high res for better barcode detection.
      const videoConstraints: Record<string, unknown> = isIOS
        ? {
            facingMode: { exact: "environment" },
            width:  { ideal: 1280 },
            height: { ideal: 720  },
          }
        : {
            facingMode: { ideal: "environment" },
            width:  { ideal: 1920 },
            height: { ideal: 1080 },
          };

      const scanner = new Html5Qrcode("barcode-reader");
      scannerRef.current = scanner;
      setScanning(true);

      await scanner.start(
        cameraId,
        {
          fps: 24,
          qrbox: { width: 280, height: 140 },
          aspectRatio: 1.5,
          disableFlip: true,
          videoConstraints,
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

      // ── Post-start: track capabilities ─────────────────────────────────────
      try {
        const videoEl = document.querySelector("#barcode-reader video") as HTMLVideoElement | null;
        const track   = videoEl?.srcObject instanceof MediaStream
          ? videoEl.srcObject.getVideoTracks()[0]
          : null;

        if (track) {
          trackRef.current = track;
          const capabilities = track.getCapabilities() as any;

          if (isIOS) {
            // iOS doesn't support applyConstraints for focusMode or zoom.
            // Instead, apply a 1.5× software zoom after a short delay so the
            // video element is fully rendered. This lets users aim from ≈20-30 cm
            // where the iOS camera autofocuses correctly on barcodes.
            setTimeout(() => applySwZoom(1.5), 400);
          } else {
            // Android: request continuous autofocus if supported
            if (capabilities?.focusMode?.includes("continuous")) {
              await track.applyConstraints({
                advanced: [{ focusMode: "continuous" } as any],
              });
            }
            // Android: expose hardware zoom slider if the camera supports it
            if (capabilities?.zoom) {
              const min = capabilities.zoom.min ?? 1;
              const max = Math.min(capabilities.zoom.max ?? 1, 8);
              if (max > min) {
                setHwZoomRange({ min, max });
                setHwZoom(min);
              }
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
  };

  useEffect(() => { return () => { stopScanner(); }; }, []);

  if (looking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Looking up product...</p>
      </div>
    );
  }

  // Derived: should we show the zoom control?
  const showZoom = scanning && (isIOS || !!hwZoomRange);
  const zoomMin  = isIOS ? 1   : (hwZoomRange?.min ?? 1);
  const zoomMax  = isIOS ? 4   : (hwZoomRange?.max ?? 4);
  const zoomVal  = isIOS ? swZoom : hwZoom;
  const onZoom   = (v: number) => isIOS ? applySwZoom(v) : applyHwZoom(v);

  return (
    <div
      className="flex-1 flex flex-col items-center p-4 gap-4"
      // Ensure content never hides behind the iPhone home indicator
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

      {/* ── Camera viewfinder + zoom overlay ───────────────────────────────── */}
      {/* The zoom slider lives INSIDE the viewfinder so it is never cut off  */}
      {/* by the iOS home indicator regardless of safe-area support.           */}
      <div className="relative w-full max-w-[320px]">
        <div
          id="barcode-reader"
          ref={containerRef}
          className={`w-full rounded-xl overflow-hidden ${scanning ? "" : "hidden"}`}
        />

        {showZoom && (
          <div className="absolute bottom-0 left-0 right-0 rounded-b-xl overflow-hidden
                          bg-black/50 backdrop-blur-sm px-3 pt-2 pb-3">
            <div className="flex items-center gap-2">
              <ZoomOut className="h-3.5 w-3.5 text-white/80 shrink-0" />
              <Slider
                min={zoomMin}
                max={zoomMax}
                step={0.1}
                value={[zoomVal]}
                onValueChange={([v]) => onZoom(v)}
                className="flex-1"
              />
              <ZoomIn className="h-3.5 w-3.5 text-white/80 shrink-0" />
              <span className="text-xs text-white/80 tabular-nums w-8 text-right">
                {zoomVal.toFixed(1)}×
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Scanning controls (cancel button + hint) ────────────────────────── */}
      {scanning && (
        <div className="w-full max-w-[320px] text-center space-y-2">
          <p className="text-xs text-muted-foreground">
            {isIOS
              ? "Hold 20–30 cm away · use slider to zoom in"
              : "Point at a barcode on food packaging"}
          </p>
          <Button variant="outline" size="sm" onClick={stopScanner}>
            <X className="h-3.5 w-3.5 mr-1" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
}

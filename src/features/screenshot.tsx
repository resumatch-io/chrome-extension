import { useState, useEffect } from "react"

interface ScreenshotProps {
  onScreenshotCaptured?: (screenshot: string) => void
  initialScreenshot?: string
}

export default function Screenshot({ onScreenshotCaptured, initialScreenshot }: ScreenshotProps) {
  console.log("[Screenshot] initialScreenshot prop:", initialScreenshot)
  const [screenshot, setScreenshot] = useState<string | null>(initialScreenshot || null)
  const [isCapturing, setIsCapturing] = useState(false)

  // Update screenshot state if initialScreenshot prop changes
  useEffect(() => {
    setScreenshot(initialScreenshot || null)
    console.log("[Screenshot] Screenshot state updated from prop:", initialScreenshot)
  }, [initialScreenshot])

  const captureScreenshot = async () => {
    try {
      setIsCapturing(true)
      console.log("[Screenshot] Starting full screenshot capture")
      const response = await chrome.runtime.sendMessage({ action: "captureScreenshot" })
      console.log("[Screenshot] captureScreenshot response:", response)
      if (response.status === "success") {
        setScreenshot(response.screenshot)
        console.log("[Screenshot] Screenshot set in state")
      } else {
        console.log("[Screenshot] Screenshot failed", response)
      }
    } catch (error) {
      console.log("[Screenshot] Error during captureScreenshot", error)
    } finally {
      setIsCapturing(false)
      console.log("[Screenshot] Capture finished")
    }
  }

  return (
    <div className="p-4 h-full text-black flex flex-col">
      <h1 className="text-lg font-bold mb-2">Capture Job Description</h1>
      <p className="mb-4">
        Capture a screenshot of the job description to extract and analyze the requirements.
      </p>

      <button
        onClick={captureScreenshot}
        disabled={isCapturing}
        className={`px-4 py-2 text-white rounded transition-colors ${
          isCapturing
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-[#4A3AFF] hover:bg-[#3d2ecc]"
        }`}
      >
        {isCapturing ? "Capturing..." : "Capture Screenshot"}
      </button>

      {/* Custom Screenshot Button */}
      <button
        onClick={async () => {
          setIsCapturing(true)
          console.log("[Screenshot] Starting custom screenshot (snip)")
          // Notify sidebar to hide
          chrome.runtime.sendMessage({ action: "snippingStart" });
          // Remove any existing snip overlay
          const existingHost = document.getElementById("snip-shadow-host");
          if (existingHost) existingHost.remove();
          // Create shadow host
          const host = document.createElement("div");
          host.id = "snip-shadow-host";
          host.style.position = "fixed";
          host.style.top = "0";
          host.style.left = "0";
          host.style.width = "100vw";
          host.style.height = "100vh";
          host.style.zIndex = "2147483647";
          host.style.pointerEvents = "auto";
          document.body.appendChild(host);
          const shadow = host.attachShadow({ mode: "open" });
          // Add overlay style
          const style = document.createElement("style");
          style.textContent = `
            .snip-overlay {
              position: fixed;
              top: 0; left: 0; width: 100vw; height: 100vh;
              background: rgba(0,0,0,0.2);
              cursor: crosshair;
              user-select: none;
            }
            .snip-selection {
              position: fixed;
              border: 2px dashed #4A3AFF;
              background: rgba(74,58,255,0.15);
              pointer-events: none;
            }
          `;
          shadow.appendChild(style);
          // Create overlay
          const overlay = document.createElement("div");
          overlay.className = "snip-overlay";
          shadow.appendChild(overlay);
          // Selection box
          const selectionBox = document.createElement("div");
          selectionBox.className = "snip-selection";
          selectionBox.style.display = "none";
          shadow.appendChild(selectionBox);
          // Mouse logic
          let startX = 0, startY = 0, endX = 0, endY = 0, isSelecting = false;
          overlay.addEventListener("mousedown", (e) => {
            isSelecting = true;
            startX = e.clientX;
            startY = e.clientY;
            selectionBox.style.display = "block";
            selectionBox.style.left = `${startX}px`;
            selectionBox.style.top = `${startY}px`;
            selectionBox.style.width = "0px";
            selectionBox.style.height = "0px";
          });
          overlay.addEventListener("mousemove", (e) => {
            if (!isSelecting) return;
            endX = e.clientX;
            endY = e.clientY;
            const left = Math.min(startX, endX);
            const top = Math.min(startY, endY);
            const width = Math.abs(endX - startX);
            const height = Math.abs(endY - startY);
            selectionBox.style.left = `${left}px`;
            selectionBox.style.top = `${top}px`;
            selectionBox.style.width = `${width}px`;
            selectionBox.style.height = `${height}px`;
          });
          overlay.addEventListener("mouseup", (e) => {
            isSelecting = false;
            selectionBox.style.display = "none";
            host.remove();
            // Notify sidebar to show again
            chrome.runtime.sendMessage({ action: "snippingEnd" });
            // Calculate crop region with scroll and device pixel ratio
            const dpr = window.devicePixelRatio || 1;
            const scrollX = window.scrollX;
            const scrollY = window.scrollY;
            const cropX = (Math.min(startX, endX) + scrollX) * dpr;
            const cropY = (Math.min(startY, endY) + scrollY) * dpr;
            const cropWidth = Math.abs(endX - startX) * dpr;
            const cropHeight = Math.abs(endY - startY) * dpr;
            const rect = {
              x: cropX,
              y: cropY,
              width: cropWidth,
              height: cropHeight
            };
            console.log("[Snip] Mouse up. Final rect:", rect);
            if (rect.width < 5 || rect.height < 5) {
              setIsCapturing(false);
              return;
            }
            chrome.runtime.sendMessage({ action: "captureRegionScreenshot", rect }, (response) => {
              if (response.status === "success" && response.screenshot) {
                // Crop the image in the content script
                const img = new window.Image();
                img.onload = function () {
                  const canvas = document.createElement("canvas");
                  canvas.width = rect.width;
                  canvas.height = rect.height;
                  const ctx = canvas.getContext("2d");
                  ctx.drawImage(
                    img,
                    rect.x,
                    rect.y,
                    rect.width,
                    rect.height,
                    0,
                    0,
                    rect.width,
                    rect.height
                  );
                  const cropped = canvas.toDataURL("image/png");
                  setScreenshot(cropped);
                  setIsCapturing(false);
                  console.log("[Screenshot] Custom screenshot set in state");
                };
                img.onerror = function () {
                  setIsCapturing(false);
                  console.log("[Screenshot] Error processing screenshot");
                };
                img.src = response.screenshot;
              } else {
                setIsCapturing(false);
                console.log("[Screenshot] Custom screenshot failed", response);
              }
            });
          });
        }}
        disabled={isCapturing}
        className={`mt-2 px-4 py-2 text-white rounded transition-colors ${
          isCapturing
            ? "bg-gray-400 cursor-not-allowed"
            : "bg-[#FF7A3A] hover:bg-[#cc632e]"
        }`}
      >
        {isCapturing ? "Capturing..." : "Custom Screenshot (Snip)"}
      </button>

      {screenshot && (
        <div className="mt-4 flex-1 flex flex-col min-h-0">
          <h2 className="text-md font-semibold mb-2">Captured Screenshot:</h2>
          <div className="flex-1 overflow-auto border rounded mb-4">
            <img src={screenshot} alt="Screenshot" className="w-full h-auto" />
          </div>
          {/* Removed 'Use This Screenshot for Tailoring' button */}
        </div>
      )}
    </div>
  )
}
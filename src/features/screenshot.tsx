/*
import { useState, useEffect } from "react"

interface ScreenshotProps {
  onScreenshotCaptured?: (screenshot: string) => void
  initialScreenshot?: string
  onSidebarVisibilityChange?: (visible: boolean, data?: { capturedScreenshot?: string }) => void
}

export default function Screenshot({ onScreenshotCaptured, initialScreenshot, onSidebarVisibilityChange }: ScreenshotProps) {
  console.log("[Screenshot] initialScreenshot prop:", initialScreenshot)
  const [screenshot, setScreenshot] = useState<string | null>(initialScreenshot || null)
  const [isCapturing, setIsCapturing] = useState(false)

  // Update screenshot state if initialScreenshot prop changes
  useEffect(() => {
    setScreenshot(initialScreenshot || null)
    console.log("[Screenshot] Screenshot state updated from prop:", initialScreenshot)
  }, [initialScreenshot])

  const handleCapture = async () => {
      setIsCapturing(true)
    console.log("[Screenshot] Capture started")
    // Simulate screenshot capture
        setTimeout(() => {
      const fakeScreenshot = "data:image/png;base64,fakeScreenshotData"
      setScreenshot(fakeScreenshot)
      setIsCapturing(false)
      console.log("[Screenshot] Capture completed")
      if (onScreenshotCaptured) onScreenshotCaptured(fakeScreenshot)
    }, 2000)
  }

  return (
    <div>
      <button onClick={handleCapture} disabled={isCapturing}>
        {isCapturing ? "Capturing..." : "Capture Screenshot"}
      </button>
      {screenshot && <img src={screenshot} alt="Screenshot" />}
    </div>
  )
}
*/
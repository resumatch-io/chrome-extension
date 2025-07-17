import cssText from "data-text:~style.css"
import type { PlasmoCSConfig } from "plasmo"
import { ClerkProvider } from "@clerk/chrome-extension"
import { Sidebar } from "~features/sidebar"
import { useState, useEffect } from "react"

declare global {
  interface Window {
    setResumatchSidebarVisible?: (visible: boolean) => void;
    setResumatchSidebarMessageData?: (data: any) => void;
  }
}

const PUBLISHABLE_KEY = process.env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY

const SYNC_HOST = process.env.PLASMO_PUBLIC_CLERK_SYNC_HOST

if (!PUBLISHABLE_KEY || !SYNC_HOST ) {
  throw new Error(
    "Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY to the .env.development file"
  )
}

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"]
}

export const getStyle = (): HTMLStyleElement => {
  const baseFontSize = 16
  let updatedCssText = cssText.replaceAll(":root", ":host(plasmo-csui)")
  const remRegex = /([\d.]+)rem/g
  updatedCssText = updatedCssText.replace(remRegex, (match, remValue) => {
    const pixelsValue = parseFloat(remValue) * baseFontSize
    return `${pixelsValue}px`
  })
  const styleElement = document.createElement("style")
  styleElement.textContent = updatedCssText
  return styleElement
}

// Listen for sidebar control messages
// Remove all mountSidebar/unmountSidebar and sidebarRoot logic
// Remove Sidebar mounting root, mountSidebar, unmountSidebar, and related chrome.runtime.onMessage.addListener
// Replace with only React state logic in PlasmoOverlay
const PlasmoOverlay = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [messageData, setMessageData] = useState<any>(null)

  useEffect(() => {
    window.setResumatchSidebarVisible = setIsVisible;
    window.setResumatchSidebarMessageData = setMessageData;
    return () => {
      delete window.setResumatchSidebarVisible;
      delete window.setResumatchSidebarMessageData;
    };
  }, [setIsVisible, setMessageData]);

  useEffect(() => {
    const messageListener = (message, sender, sendResponse) => {
      try {
        if (message.action === "getSelectedText") {
          const selectedText = window.getSelection()?.toString() || "";
          sendResponse({ selectedText });
          return true;
        }
        if (
          [
            "openSidebar",
            "saveJob",
            "saveContact",
            "findEmail",
            "findReferrals",
            "requestIntro"
          ].includes(message.action)
        ) {
          console.log("[Sidebar] openSidebar message received", message)
          setIsVisible(true)
          setMessageData(message)
          console.log("[Sidebar] Sidebar set to visible, messageData:", message)
          sendResponse({ status: "success", message: `Action ${message.action} triggered` })
        }
        // Custom screenshot region selection
        // if (message.action === "startCustomScreenshot") {
        //   console.log("[Snip] startCustomScreenshot received");
        //   // Hide sidebar
        //   setIsVisible(false);
        //   setMessageData(null);
        //   // Remove any existing snip overlay
        //   const existingHost = document.getElementById("snip-shadow-host");
        //   if (existingHost) existingHost.remove();
        //   // Create shadow host
        //   const host = document.createElement("div");
        //   host.id = "snip-shadow-host";
        //   host.style.position = "fixed";
        //   host.style.top = "0";
        //   host.style.left = "0";
        //   host.style.width = "100vw";
        //   host.style.height = "100vh";
        //   host.style.zIndex = "2147483647";
        //   host.style.pointerEvents = "auto";
        //   document.body.appendChild(host);
        //   const shadow = host.attachShadow({ mode: "open" });
        //   // Add overlay style
        //   const style = document.createElement("style");
        //   style.textContent = `
        //     .snip-overlay {
        //       position: fixed;
        //       top: 0; left: 0; width: 100vw; height: 100vh;
        //       background: rgba(0,0,0,0.2);
        //       cursor: crosshair;
        //       user-select: none;
        //     }
        //     .snip-selection {
        //       position: fixed;
        //       border: 2px dashed #4747E1;
        //       background: rgba(74,58,255,0.15);
        //       pointer-events: none;
        //     }
        //   `;
        //   shadow.appendChild(style);
        //   // Create overlay
        //   const overlay = document.createElement("div");
        //   overlay.className = "snip-overlay";
        //   shadow.appendChild(overlay);
        //   // Selection box
        //   const selectionBox = document.createElement("div");
        //   selectionBox.className = "snip-selection";
        //   selectionBox.style.display = "none";
        //   shadow.appendChild(selectionBox);
        //   // Mouse logic
        //   let startX = 0, startY = 0, endX = 0, endY = 0, isSelecting = false;
        //   overlay.addEventListener("mousedown", (e) => {
        //     isSelecting = true;
        //     startX = e.clientX;
        //     startY = e.clientY;
        //     selectionBox.style.display = "block";
        //     selectionBox.style.left = `${startX}px`;
        //     selectionBox.style.top = `${startY}px`;
        //     selectionBox.style.width = "0px";
        //     selectionBox.style.height = "0px";
        //   });
        //   overlay.addEventListener("mousemove", (e) => {
        //     if (!isSelecting) return;
        //     endX = e.clientX;
        //     endY = e.clientY;
        //     const left = Math.min(startX, endX);
        //     const top = Math.min(startY, endY);
        //     const width = Math.abs(endX - startX);
        //     const height = Math.abs(endY - startY);
        //     selectionBox.style.left = `${left}px`;
        //     selectionBox.style.top = `${top}px`;
        //     selectionBox.style.width = `${width}px`;
        //     selectionBox.style.height = `${height}px`;
        //   });
        //   overlay.addEventListener("mouseup", (e) => {
        //     isSelecting = false;
        //     selectionBox.style.display = "none";
        //     host.remove();
        //     // Show sidebar again with screenshot page
        //     setIsVisible(true);
        //     setMessageData({ initialPage: "screenshot" });
        //     // Calculate crop region with scroll and device pixel ratio
        //     const dpr = window.devicePixelRatio || 1;
        //     const scrollX = window.scrollX;
        //     const scrollY = window.scrollY;
        //     const cropX = (Math.min(startX, endX) + scrollX) * dpr;
        //     const cropY = (Math.min(startY, endY) + scrollY) * dpr;
        //     const cropWidth = Math.abs(endX - startX) * dpr;
        //     const cropHeight = Math.abs(endY - startY) * dpr;
        //     const rect = {
        //       x: cropX,
        //       y: cropY,
        //       width: cropWidth,
        //       height: cropHeight
        //     };
        //     console.log("[Snip] Mouse up. Final rect:", rect);
        //     if (rect.width < 5 || rect.height < 5) {
        //       sendResponse({ status: "error", message: "Selection too small" });
        //       return;
        //     }
            
        //     // Send the rect to background script for screenshot capture and cropping
        //     chrome.runtime.sendMessage({ action: "captureRegionScreenshot", rect }, (response) => {
        //       if (response?.status === "success" && response.screenshot) {
        //         console.log("[Snip] Screenshot captured and cropped successfully");
        //         // Open sidebar with the cropped screenshot
        //         setIsVisible(true);
        //         setMessageData({ initialPage: "screenshot", capturedScreenshot: response.screenshot });
        //         sendResponse({ status: "success", screenshot: response.screenshot });
        //       } else {
        //         console.error("[Snip] Screenshot capture failed:", response);
        //         sendResponse({ status: "error", message: response?.error || "Failed to capture screenshot" });
        //       }
        //     });
        //   });
        //   return true;
        // }
        // Handle snippingStart and snippingEnd from background/messages
      } catch (error) {
        sendResponse({ status: "error", message: "Error processing message" })
      }
    }

    chrome.runtime.onMessage.addListener(messageListener)

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener)
    }
  }, [])

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl={window.location.href}
      signInFallbackRedirectUrl={window.location.href}
      signUpFallbackRedirectUrl={window.location.href}
      syncHost={SYNC_HOST}>
      <div
        className={`plasmo-z-50 plasmo-flex plasmo-fixed plasmo-top-32 plasmo-right-8 ${
          isVisible ? "plasmo-block" : "plasmo-hidden"
        }`}>
        <Sidebar
          initialPage={messageData?.page || messageData?.initialPage}
          capturedScreenshot={messageData?.screenshot || messageData?.capturedScreenshot}
          jobDescription={messageData?.jobDescription}
          onClose={() => {
            setIsVisible(false)
            setMessageData(null)
          }}
          onFileDialogOpen={() => {}}
          onFileDialogClose={() => {}}
        />
      </div>
    </ClerkProvider>
  )
}

export default PlasmoOverlay

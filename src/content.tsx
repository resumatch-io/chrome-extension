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

if (!PUBLISHABLE_KEY || !SYNC_HOST) {
  throw new Error(
    "Please add the PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY and PLASMO_PUBLIC_CLERK_SYNC_HOST to the .env.development file"
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
        if (message.action === "startCustomScreenshot") {
          console.log("[Snip] startCustomScreenshot received");
          // Hide sidebar
          setIsVisible(false);
          setMessageData(null);
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
            :host {
              display: block;
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: rgba(0, 0, 0, 0.5);
              z-index: 2147483647;
              pointer-events: auto;
            }
          `;
          shadow.appendChild(style);
          // Add snipping tool UI
          const snipTool = document.createElement("div");
          snipTool.textContent = "Snip Tool Active";
          snipTool.style.position = "absolute";
          snipTool.style.top = "50%";
          snipTool.style.left = "50%";
          snipTool.style.transform = "translate(-50%, -50%)";
          snipTool.style.color = "white";
          snipTool.style.fontSize = "24px";
          shadow.appendChild(snipTool);
        }
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
      >
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

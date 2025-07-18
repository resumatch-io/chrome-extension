import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/build/pdf";

chrome.runtime.onInstalled.addListener(() => {
  const menuItems = [
    { id: "save-job", title: "Save Job" },
    { id: "save-contact", title: "Save Contact" },
    { id: "find-email", title: "Find E-mail" },
    { id: "find-referrals", title: "Find Referrals" },
    { id: "request-intro", title: "Request Intro" },
    { id: "capture-screenshot", title: "Capture Screenshot" },
    {id:"Tailor My Resume", title:"Tailor My Resume"}
  ]

  menuItems.forEach((item) => {
    chrome.contextMenus.create({
      id: item.id,
      title: item.title,
      contexts: ["all"]
    })
  })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return

  switch (info.menuItemId) {
    case "save-job":
    case "save-contact":
    case "find-email":
    case "find-referrals":
    case "request-intro":
      chrome.tabs.sendMessage(tab.id, { action: info.menuItemId })
      break
    case "capture-screenshot":
      chrome.tabs.sendMessage(tab.id, { action: "startCustomScreenshot" });
      break
    case "Tailor My Resume":
      // Always request the selected text from the content script
      chrome.tabs.sendMessage(tab.id, { action: "getSelectedText" }, (response) => {
        const jobDescription = response?.selectedText || "";
        chrome.tabs.sendMessage(tab.id, {
          action: "openSidebar",
          page: "tailor",
          jobDescription
        });
      });
      break
  }
})

// Set the workerSrc for pdfjs-dist
GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("pdf.worker.min.js")

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Unified resume generation and saving
  if (message.action === "GENERATE_AND_SAVE_RESUME") {
    const body = {
      parsedText: message.parsedText || "",
      jobDescription: message.jobDescription || "",
      name: "sample",
      resumeTemplate: "default"
    }
    fetch("https://resumatch.io/api/external/generate-and-save-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        sendResponse({ success: true, ...data })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  // PDF parsing in background
  if (message.action === "PARSE_PDF" && message.pdfData) {
    (async () => {
      try {
        // Accepts base64 or ArrayBuffer
        let data;
        if (typeof message.pdfData === "string") {
          // base64 string
          data = Uint8Array.from(atob(message.pdfData), c => c.charCodeAt(0));
        } else {
          // ArrayBuffer
          data = new Uint8Array(message.pdfData);
        }
        const pdf = await getDocument({ data }).promise;
        let text = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map(item => item.str).join(" ") + "\n";
        }
        sendResponse({ success: true, text });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // async response
  }

  if (message.action === "captureRegionScreenshot" && message.rect) {
    console.log('[Background] Received captureRegionScreenshot request with rect:', message.rect);
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (image) => {
      if (!image) {
        console.error('[Background] Failed to capture screenshot');
        sendResponse({ status: "error", error: "Failed to capture screenshot" });
        return;
      }
      
      console.log('[Background] Screenshot captured successfully, sending back with rect');
      // Send the full screenshot and rect back to content script for cropping
      sendResponse({ 
        status: "success", 
        screenshot: image,
        rect: message.rect
      });
    });
    return true;
  }

  // Full screenshot capture
  // if (message.action === "captureScreenshot") {
  //   // Try to get the sender's tab/window
  //   let windowId = sender.tab ? sender.tab.windowId : undefined;
  //   chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (image) => {
  //     if (!image) {
  //       sendResponse({ status: "error", message: "Failed to capture screenshot" });
  //       return;
  //     }
  //     sendResponse({ status: "success", screenshot: image });
  //   });
  //   return true;
  // }

  // Relay startCustomScreenshot from sidebar to content script in active tab
  // if (message.action === "startCustomScreenshot") {
  //   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  //     if (tabs[0]?.id) {
  //       chrome.tabs.sendMessage(
  //         tabs[0].id,
  //         { action: "startCustomScreenshot" },
  //         (response) => {
  //           sendResponse(response);
  //         }
  //       );
  //     } else {
  //       sendResponse({ status: "error", message: "No active tab found." });
  //     }
  //   });
  //   return true; // keep channel open for async response
  // }

  // Resume generator
  if (message.action === "GENERATE_RESUME") {
    const body = {
      parsedText: message.parsedText || "",
      jobDescription: message.jobDescription || ""
    }
    fetch("https://resumatch.io/api/external/generate-resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        sendResponse({ success: true, data })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  // Save Resume 
  if (message.action === "SAVE_RESUME") {
    const body = {
      parsedText: message.parsedText ,
      text: message.text,
      jobDescription: message.jobDescription ,
      name: "sai",
      summary: message.summary,
      resumeTemplate: "Default"
    }
    fetch("https://resumatch.io/api/external/resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(res => res.json())
      .then(data => {
        sendResponse({ success: true, data })
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message })
      })
    return true 
  }

  // Fetch Collections
  if (message.action === "FETCH_COLLECTIONS") {
    const body = {
      email: message.email
    }
    fetch("https://resumatch.io/api/external/collections", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    })
      .then(res => {
        console.log("Collections API response status:", res.status);
        console.log("Collections API response headers:", res.headers);
        
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        // Check if response has content
        return res.text().then(text => {
          console.log("Collections API raw response:", text);
          
          if (!text || text.trim() === '') {
            throw new Error("Empty response from server");
          }
          
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error("Failed to parse JSON:", e);
            throw new Error(`Invalid JSON response: ${text.substring(0, 100)}...`);
          }
        });
      })
      .then(data => {
        console.log("Collections API parsed data:", data);
        sendResponse({ success: true, data })
      })
      .catch(error => {
        console.error("Collections API error:", error);
        sendResponse({ success: false, error: error.message })
      })
    return true
  }

  if (message.action === "OCR_IMAGE" && message.imageData) {
    // imageData is a base64 data URL
    (async () => {
      try {
        // Convert base64 to Blob
        const res = await fetch(message.imageData);
        const blob = await res.blob();
        const formData = new FormData();
        formData.append('file', blob, 'screenshot.png');

        const ocrRes = await fetch("http://127.0.0.1:8000/ocr", {
          method: "POST",
          body: formData,
        });
        const data = await ocrRes.json();
        sendResponse({ success: true, ...data });
      } catch (err) {
        sendResponse({ success: false, error: err.message || String(err) });
      }
    })();
    return true; // async
  }
})


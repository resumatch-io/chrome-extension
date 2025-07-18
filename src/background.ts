import { GlobalWorkerOptions, getDocument } from "pdfjs-dist/build/pdf";

const pdfjsLib = { GlobalWorkerOptions, getDocument };

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

const pdfjsWorkerSrc = chrome.runtime.getURL("pdf.worker.min.js");
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "GENERATE_RESUME") {
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

    if (message.action === "PARSE_PDF") {
    try {
      let uint8Array;
      if (typeof message.pdfData === "string") {
        const binaryString = atob(message.pdfData.split(",")[1]);
        uint8Array = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          uint8Array[i] = binaryString.charCodeAt(i);
        }
      } else {
        uint8Array = new Uint8Array(message.pdfData);
      }
      
      // Add proper handling for the PDF data
      sendResponse({ success: true, message: "PDF data processed" });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }

  if (message.action === "captureRegionScreenshot" && message.rect) {
    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: "png" }, (image) => {
      if (!image) {
        sendResponse({ status: "error", error: "Failed to capture screenshot" });
        return;
      }
      
      sendResponse({ 
        status: "success", 
        screenshot: image,
        rect: message.rect
      });
    });
    return true;
  }

  if (message.action === "captureScreenshot") {
    let windowId = sender.tab ? sender.tab.windowId : undefined;
    chrome.tabs.captureVisibleTab(windowId, { format: "png" }, (image) => {
      if (!image) {
        sendResponse({ status: "error", message: "Failed to capture screenshot" });
        return;
      }
      sendResponse({ status: "success", screenshot: image });
    });
    return true;
  }

  // Relay startCustomScreenshot from sidebar to content script in active tab
  if (message.action === "startCustomScreenshot") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: "startCustomScreenshot" },
          (response) => {
            sendResponse(response);
          }
        );
      } else {
        sendResponse({ status: "error", message: "No active tab found." });
      }
    });
    return true;
  }

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
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        return res.text().then(text => {
          if (!text || text.trim() === '') {
            throw new Error("Empty response from server");
          }
          
          try {
            return JSON.parse(text);
          } catch (e) {
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

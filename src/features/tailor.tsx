import React, { useState, useRef } from 'react'
import { Upload, CheckCircle, Loader2 } from 'lucide-react'
import { Camera } from 'lucide-react'
import { SignedIn, SignedOut } from "@clerk/chrome-extension"
import Tesseract from 'tesseract.js';

// Define ParseResult type locally
interface ParseResult {
  fileName: string;
  parsedText: string;
  error?: string;
}

interface TailorResumePageProps {
  onSelectFromCollections?: () => void
  selectedResume?: string | null
  onTailorStart?: (shareableLink: string) => void
  onResumeRemove?: () => void
  jobDescriptionText?: string
  onJobDescriptionChange?: (text: string) => void
  onFileDialogOpen?: () => void
  onFileDialogClose?: () => void
  onSidebarVisibilityChange?: (visible: boolean, data?: { capturedScreenshot?: string }) => void
}

// Define types for screenshot response
interface OcrResult {
  text: string;
  error?: string;
}

interface ScreenshotResponse {
  status: "success" | "error";
  screenshot?: string;
  ocrResult?: OcrResult;
  error?: string;
}

const TailorResumePage: React.FC<TailorResumePageProps> = ({
  onSelectFromCollections,
  selectedResume,
  onTailorStart,
  onResumeRemove,
  jobDescriptionText = '',
  onJobDescriptionChange,
  onFileDialogOpen,
  onFileDialogClose,
  onSidebarVisibilityChange
}) => {
  const [jobDescription, setJobDescription] = useState(jobDescriptionText)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [parsedText, setParsedText] = useState<string>('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isOcrLoading, setIsOcrLoading] = useState(false)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [ocrError, setOcrError] = useState<string | null>(null)
  const [ocrWarning, setOcrWarning] = useState<string | null>(null)
  const [lastOcrImage, setLastOcrImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File) => {
    const allowedTypes = ['application/pdf']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF file only.')
      return false
    }
    if (file.size > maxSize) {
      alert('File size must be less than 5MB.')
      return false
    }
    return true
  }

  const parseDocumentLocal = async (file: File): Promise<ParseResult> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(
          { action: "PARSE_PDF", pdfData: arrayBuffer },
          (response) => {
            if (response?.success) {
              resolve({ fileName: file.name, parsedText: response.text });
            } else {
              resolve({
                fileName: file.name,
                parsedText: `File processing failed for ${file.name}. Error: ${response?.error || 'Unknown error'}. Please try with a different file.`,
                error: response?.error || 'Unknown error'
              });
            }
          }
        );
      });
    } catch (error) {
      return {
        fileName: file.name,
        parsedText: `File processing failed for ${file.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try with a different file.`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  function cleanOcrText(text: string): string {
    return text
      .replace(/[^\x20-\x7E\n]+/g, '') // Keep printable ASCII and newlines
      .replace(/\n{2,}/g, '\n') // Collapse multiple newlines
      .replace(/[ \t]+/g, ' ') // Collapse whitespace
      .replace(/^ +| +$/gm, '') // Trim lines
      .trim();
  }

  const processOcrImage = async (imageData: string) => {
    setIsOcrLoading(true);
    setOcrError(null);
    setOcrWarning(null);
    
    try {
      console.log('[Tailor] OCR started');
      const ocrResult = await Tesseract.recognize(imageData, 'eng', {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`[Tailor] OCR Progress: ${m.progress * 100}%`);
          }
        }
      });

      let text = cleanOcrText(ocrResult.data.text || '');
      console.log('[Tailor] OCR finished:', text);

      if (text.length < 20) {
        setOcrWarning('Extracted text looks incomplete. Try recapturing or retrying.');
        console.warn('[Tailor] OCR warning: text too short');
      } else {
        setOcrWarning(null);
      }

      setJobDescription(text);
      onJobDescriptionChange?.(text);
      return { success: true, text };
    } catch (err) {
      console.error('[Tailor] OCR failed:', err);
      setOcrError('OCR failed. Please try again.');
      return { success: false, error: err instanceof Error ? err.message : 'OCR failed' };
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleRetryOcr = async () => {
    if (!lastOcrImage) return;
    setScreenshotPreview(lastOcrImage);
    await processOcrImage(lastOcrImage);
  };

  const handleTakeScreenshot = async () => {
    // Reset state for a new capture
    setScreenshotPreview(null);
    setOcrError(null);
    setOcrWarning(null);
    setIsOcrLoading(false);
    console.log('[Tailor] Screenshot capture started');

    try {
      if (onSidebarVisibilityChange) onSidebarVisibilityChange(false);

      // Create and setup the snipping tool overlay
      const existingHost = document.getElementById("snip-shadow-host");
      if (existingHost) existingHost.remove();

      const host = document.createElement("div");
      host.id = "snip-shadow-host";
      Object.assign(host.style, {
        position: "fixed",
        top: "0",
        left: "0",
        width: "100vw",
        height: "100vh",
        zIndex: "2147483647",
        pointerEvents: "auto"
      });

      const shadow = host.attachShadow({ mode: "open" });
      
      const style = document.createElement("style");
      style.textContent = `
        .snip-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0,0,0,0.2);
          cursor: crosshair;
          user-select: none;
        }
        .snip-selection {
          position: fixed;
          border: 2px dashed #4747E1;
          background: rgba(74,58,255,0.15);
          pointer-events: none;
          display: none;
        }
      `;
      
      const overlay = document.createElement("div");
      overlay.className = "snip-overlay";
      
      const selection = document.createElement("div");
      selection.className = "snip-selection";

      shadow.appendChild(style);
      shadow.appendChild(overlay);
      shadow.appendChild(selection);
      document.body.appendChild(host);

      let startX = 0;
      let startY = 0;
      let isSelecting = false;

      const cleanup = () => {
        host.remove();
        if (onSidebarVisibilityChange) {
          onSidebarVisibilityChange(true);
        }
      };

      return await new Promise((resolve) => {
        const handleMouseDown = (e: MouseEvent) => {
          isSelecting = true;
          startX = e.clientX;
          startY = e.clientY;
          selection.style.display = "block";
          selection.style.left = `${startX}px`;
          selection.style.top = `${startY}px`;
          selection.style.width = "0";
          selection.style.height = "0";
          console.log('[Tailor] Snip selection started');
        };

        const handleMouseMove = (e: MouseEvent) => {
          if (!isSelecting) return;

          const currentX = e.clientX;
          const currentY = e.clientY;
          const width = Math.abs(currentX - startX);
          const height = Math.abs(currentY - startY);
          const left = Math.min(startX, currentX);
          const top = Math.min(startY, currentY);

          selection.style.left = `${left}px`;
          selection.style.top = `${top}px`;
          selection.style.width = `${width}px`;
          selection.style.height = `${height}px`;
        };

        const handleMouseUp = async (e: MouseEvent) => {
          if (!isSelecting) return;
          isSelecting = false;

          const endX = e.clientX;
          const endY = e.clientY;
          const dpr = window.devicePixelRatio || 1;
          
          const rect = {
            x: Math.round((Math.min(startX, endX) + window.scrollX) * dpr),
            y: Math.round((Math.min(startY, endY) + window.scrollY) * dpr),
            width: Math.round(Math.abs(endX - startX) * dpr),
            height: Math.round(Math.abs(endY - startY) * dpr)
          };

          // Remove listeners
          overlay.removeEventListener('mousedown', handleMouseDown);
          overlay.removeEventListener('mousemove', handleMouseMove);
          overlay.removeEventListener('mouseup', handleMouseUp);
          
          cleanup();

          if (rect.width < 5 || rect.height < 5) {
            console.warn('[Tailor] Snip selection too small, cancelled');
            resolve(null);
            return;
          }

          try {
            // Capture the screenshot
            chrome.runtime.sendMessage(
              { action: "captureRegionScreenshot", rect },
              async (response: ScreenshotResponse) => {
                if (response?.status === "success" && response.screenshot) {
                  console.log('[Tailor] Screenshot captured successfully');
                  setScreenshotPreview(response.screenshot);
                  setLastOcrImage(response.screenshot);
                  
                  // Process the cropped image with OCR
                  await processOcrImage(response.screenshot);
                  resolve(response);
                } else {
                  throw new Error(response?.error || "Failed to capture screenshot");
                }
              }
            );
          } catch (error) {
            console.error("[Tailor] Screenshot capture failed:", error);
            setOcrError(error instanceof Error ? error.message : "Failed to process screenshot");
            setScreenshotPreview(null);
            resolve(null);
          }
        };

        // Add listeners
        overlay.addEventListener('mousedown', handleMouseDown);
        overlay.addEventListener('mousemove', handleMouseMove);
        overlay.addEventListener('mouseup', handleMouseUp);
      });
    } catch (error) {
      console.error("[Tailor] Error during screenshot capture:", error);
      setOcrError(error instanceof Error ? error.message : 'Screenshot capture failed');
      setScreenshotPreview(null);
      if (onSidebarVisibilityChange) onSidebarVisibilityChange(true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    onFileDialogClose?.()
    const file = event.target.files?.[0]

    if (file && validateFile(file)) {
      setIsUploading(true)
      setUploadedFile(file)

      try {
        const result = await parseDocumentLocal(file)
        setParsedText(result.parsedText)
      } catch (error) {
        alert("There was an error parsing your document. Please try again.")
        setUploadedFile(null)
        setParsedText('')
      } finally {
        setIsUploading(false)
      }
    }

    if (event.target) event.target.value = ''
  }

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
    const file = event.dataTransfer.files[0]

    if (file && validateFile(file)) {
      setIsUploading(true)
      setUploadedFile(file)

      try {
        const result = await parseDocumentLocal(file)
        setParsedText(result.parsedText)
      } catch (error) {
        alert("There was an error parsing your document. Please try again.")
        setUploadedFile(null)
        setParsedText('')
      } finally {
        setIsUploading(false)
      }
    }
  }

  const handleUploadButtonClick = () => {
    onFileDialogOpen?.()
    fileInputRef.current?.click()
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    setParsedText('')
  }

  const isFormComplete = () => {
    return (selectedResume || uploadedFile) && jobDescription.trim().length > 0
  }

  const handleTailorResume = async () => {
    if (!parsedText || !jobDescription.trim()) {
      alert('Please upload a resume and enter a job description.')
      return
    }
    if (onTailorStart) onTailorStart('')
    setIsGenerating(true)
    try {
      chrome.runtime.sendMessage(
        { action: 'GENERATE_RESUME', parsedText, jobDescription },
        (response) => {
          if (response?.success && response.data?.resume) {
            const summary = Array.isArray(response.data.resume.summary) && response.data.resume.summary.length > 0
              ? response.data.resume.summary[0]
              : '';
            chrome.runtime.sendMessage(
              {
                action: 'SAVE_RESUME',
                parsedText,
                text: response.data.resume,
                jobDescription,
                summary,
                resumeTemplate: 'Default'
              },
              (saveResponse) => {
                setIsGenerating(false)
                if (saveResponse?.success && saveResponse.data?.resumeId) {
                  const link = `https://resumatch.io/share/${saveResponse.data.resumeId}`;
                  if (onTailorStart) onTailorStart(link)
                } else {
                  alert('There was an error saving your tailored resume.')
                }
              }
            )
          } else {
            setIsGenerating(false)
            alert('There was an error generating your tailored resume.')
          }
        }
      )
    } catch (error) {
      setIsGenerating(false)
      alert('There was an error generating your tailored resume.')
    }
  }

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h1 className="text-sm font-semibold text-left text-gray-900 mb-4">Tailor My Resume</h1>

        <div className="w-full mb-4">
          <h2 className="text-center text-xs font-semibold text-gray-800 mb-3">Job Description</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
            <label className="block text-xs font-medium text-gray-800 mb-2 flex items-center justify-between">
              <span>Job Description <span className="text-red-500">*</span></span>
              {isOcrLoading ? (
                <div className="ml-2 flex items-center gap-2 px-3 py-1.5 border border-[#4747E1] bg-white text-[#4747E1] text-xs font-semibold rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Extracting text...</span>
                </div>
              ) : screenshotPreview ? (
                <div className="ml-2 flex items-center gap-2">
                  <img
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    className="w-24 h-16 object-cover border border-gray-300 rounded shadow-sm bg-white"
                  />
                  <button
                    onClick={() => setScreenshotPreview(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="ml-2 flex items-center gap-1 px-3 py-1.5 border border-[#4747E1] bg-white text-[#4747E1] text-xs font-semibold rounded-lg shadow-sm hover:bg-[#f5f5ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleTakeScreenshot}
                  disabled={isOcrLoading}
                >
                  <Camera className="w-4 h-4" />
                  <span>Screenshot</span>
                </button>
              )}
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => {
                const newValue = e.target.value
                setJobDescription(newValue)
                onJobDescriptionChange?.(newValue)
                // If user types, the preview is no longer relevant
                if (screenshotPreview) {
                  setScreenshotPreview(null);
                }
              }}
              rows={4}
              className={`w-full text-xs border border-gray-300 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 ${isOcrLoading ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Enter job description here..."
              disabled={isOcrLoading}
            />
            {isOcrLoading && (
              <div className="flex items-center gap-2 mt-2 text-xs text-[#4747E1]">
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting text from screenshot...
              </div>
            )}
            {ocrWarning && !isOcrLoading && (
              <div className="flex items-center gap-2 mt-2 text-xs text-yellow-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                <span>⚠️ {ocrWarning}</span>
                <button
                  className="ml-auto px-2 py-1 text-xs border border-yellow-400 rounded bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleRetryOcr}
                  disabled={isOcrLoading}
                >
                  Retry
                </button>
              </div>
            )}
            {ocrError && !isOcrLoading && (
              <div className="flex items-center gap-2 mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2">
                <span>❌ {ocrError}</span>
                <button
                  className="ml-auto px-2 py-1 text-xs border border-red-400 rounded bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleRetryOcr}
                  disabled={isOcrLoading}
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full mb-4">
          {!selectedResume && !uploadedFile && (
            <div className="flex justify-center space-x-4 mb-3">
              <button
                onClick={handleUploadButtonClick}
                disabled={isUploading}
                className="text-xs font-semibold text-gray-800 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                Upload Resume
              </button>

              <SignedIn>
                <button
                  onClick={onSelectFromCollections}
                  className="text-xs font-semibold text-gray-800 hover:text-blue-600 transition-colors"
                >
                  Select from Collections
                </button>
              </SignedIn>

              <SignedOut>
                <button
                  onClick={() => alert("Please sign in to access your resume collections")}
                  className="text-xs font-semibold text-gray-400 cursor-not-allowed"
                >
                  Sign in to access Collections
                </button>
              </SignedOut>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          {uploadedFile ? (
            <div className="bg-white border-2 border-[#4747E1] rounded-lg p-4 text-center">
              <div className="mx-auto w-10 h-10 bg-[#4747E1] rounded-full flex items-center justify-center mb-2">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-white" />
                )}
              </div>
              <p className="text-xs font-semibold text-[#4747E1] mb-1">
                {isUploading ? 'Processing Resume...' : 'Resume Uploaded'}
              </p>
              <p className="text-xs text-gray-600 mb-1">{uploadedFile.name}</p>
              {!isUploading && (
                <button
                  onClick={handleRemoveFile}
                  className="text-[10px] text-[#4747E1] hover:underline"
                >
                  Remove File
                </button>
              )}
            </div>
          ) : selectedResume ? (
            <div className="bg-white border-2 border-[#4747E1] rounded-lg p-4 text-center">
              <div className="mx-auto w-10 h-10 bg-[#4747E1] rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs font-semibold text-[#4747E1] mb-1">Resume Selected</p>
              <p className="text-xs text-gray-600 mb-1">{selectedResume}</p>
              <div className="flex justify-center space-x-3">
                <SignedIn>
                  <button
                    onClick={onSelectFromCollections}
                    className="text-[10px] text-[#4747E1] hover:underline"
                  >
                    Change Resume
                  </button>
                </SignedIn>
                <button
                  onClick={onResumeRemove}
                  className="text-[10px] text-red-500 hover:underline"
                >
                  Remove Resume
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`bg-white border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isDragOver
                  ? 'border-[#4747E1] bg-[#4747E1]/5'
                  : 'border-gray-300 hover:border-gray-400'
              } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
              onClick={handleUploadButtonClick}
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false) }}
            >
              <div className="mx-auto w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-600 mb-1">
                {isUploading ? 'Processing...' : 'Click or Drag to add your resume.'}
              </p>
              <p className="text-[10px] text-gray-500 mb-1">or drag and drop</p>
              <p className="text-[10px] text-gray-400">PDF up to 5MB.</p>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4">
        <button
          type="button"
          disabled={!isFormComplete() || isUploading || isGenerating}
          onClick={handleTailorResume}
          className={`w-full py-2 rounded-lg shadow-md transition-all text-xs font-medium ${
            isFormComplete() && !isUploading && !isGenerating
              ? 'bg-[#4747E1] hover:bg-[#4747E1]/90 text-white cursor-pointer'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isUploading ? 'Processing Resume...' : isGenerating ? 'Generating...' : 'Tailor My Resume'}
        </button>
        {!isFormComplete() && !isUploading && !isGenerating && (
          <p className="text-[10px] text-gray-500 text-center mt-2">
            Please {!jobDescription.trim() ? 'enter job description' : ''}
            {!jobDescription.trim() && !(selectedResume || uploadedFile) ? ' and ' : ''}
            {!(selectedResume || uploadedFile) ? 'upload/select a resume' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

export default TailorResumePage
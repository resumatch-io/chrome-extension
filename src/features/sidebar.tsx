import { useState, useEffect } from "react";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  useUser,
  useClerk
} from "@clerk/chrome-extension";
import "../style.css";
import resumatchLogo from "data-base64:../../assets/resumatch-logo.svg";
import tailorIcon from "data-base64:../../assets/tailor-icon.svg";
import GoogleLogo from "data-base64:../../assets/google-logo.svg";
import docSignGif from "data-base64:../../assets/doc-sign.gif";
import Upload from "data-base64:../../assets/screenshot.svg";
// import collectionsIcon from "data-base64:../../assets/collections-icon.svg";
import { FiArrowLeft, FiLogOut, FiX, FiUpload } from "react-icons/fi";

// Collections Icon Component
const CollectionsIcon = () => (
  <svg width="32" height="32" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 6.5C3 4.843 3 4.015 3.464 3.464C3.929 3 4.757 3 6.414 3H8.5C9.328 3 9.742 3 10.121 3.121C10.5 3.243 10.828 3.472 11.485 3.929L12.515 4.571C13.172 5.028 13.5 5.257 13.879 5.379C14.258 5.5 14.672 5.5 15.5 5.5H16.586C18.243 5.5 19.071 5.5 19.536 6.036C20 6.571 20 7.399 20 9.056V13.5C20 16.328 20 17.743 19.121 18.621C18.243 19.5 16.828 19.5 14 19.5H8C5.172 19.5 3.757 19.5 2.879 18.621C2 17.743 2 16.328 2 13.5V8" stroke="#4747E1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 8.5H19" stroke="#4747E1" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M6 12.5H10M6 15.5H14" stroke="#4747E1" strokeWidth="1.2" strokeLinecap="round"/>
    <circle cx="16.5" cy="13" r="1.5" stroke="#4747E1" strokeWidth="1.2"/>
  </svg>
);
import TailorResumePage from "./tailor";
import SelectResumePage from "./select";
import ResumePage from "./resume";
import Screenshot from "./screenshot";
import Collections from "../pages/collections";

interface SidebarProps {
  forceVisible?: boolean;
  initialPage?: string;
  capturedScreenshot?: string;
  jobDescription?: string;
  onClose?: () => void;
  onFileDialogOpen?: () => void;
  onFileDialogClose?: () => void;
}

export const Sidebar = ({ forceVisible = false, initialPage, capturedScreenshot: initialCapturedScreenshot, jobDescription: initialJobDescription, onClose, onFileDialogOpen, onFileDialogClose }: SidebarProps) => {
  const [isVisible, setIsVisible] = useState(forceVisible);
  const [currentPage, setCurrentPage] = useState("main");
  const [selectedResume, setSelectedResume] = useState<string | null>(null);
  const [showLoading, setShowLoading] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [capturedScreenshot, setCapturedScreenshot] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState<string | null>(null);
  const { user } = useUser();
  const { signOut } = useClerk();

  useEffect(() => {
    if (forceVisible) {
      setIsVisible(true);
      if (initialPage) setCurrentPage(initialPage);
      if (initialCapturedScreenshot) {
        setCapturedScreenshot(initialCapturedScreenshot);
        console.log("[Sidebar] initialCapturedScreenshot received:", initialCapturedScreenshot);
      }
    }
  }, [forceVisible, initialPage, initialCapturedScreenshot]);

  useEffect(() => {
    if (initialJobDescription !== undefined) {
      setJobDescription(initialJobDescription);
      setIsVisible(true);
      if (initialPage) setCurrentPage(initialPage);
    }
  }, [initialJobDescription, initialPage]);

  // Always update screenshot and show sidebar when initialCapturedScreenshot changes
  useEffect(() => {
    if (initialCapturedScreenshot) {
      setCapturedScreenshot(initialCapturedScreenshot);
      setCurrentPage("screenshot");
      setIsVisible(true);
      console.log("[Sidebar] (effect) Showing sidebar with new screenshot:", initialCapturedScreenshot);
    }
  }, [initialCapturedScreenshot]);

  const navItems = [
    {
      title: "Tailor My Resume",
      description: "Tailor my resume according to the job description or resumes.",
      icon: <img src={tailorIcon} alt="Tailor Icon" className="w-10 h-10" />,
      action: "tailorResume",
      visibleTo: "all"
    },
    {
      title: "Upload JD screenshot",
      description: "Upload a screenshot of the job description to tailor your resume.",
      icon: <img src={Upload} alt="Upload Icon" className="w-10 h-10" />,
      action: "uploadScreenshot",
      visibleTo: "signedIn"
    },
    {
      title: "Collections",
      description: "View your collections of tailored resumes.",
      icon: <CollectionsIcon />,
      action: "collections",
      visibleTo: "signedIn"
    }
  ];

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: window.location.href })
    } catch (error) {
      window.location.reload()
    }
  }

  const handleNavigation = (action: string) => {
    if (action === "tailorResume") {
      setCurrentPage("tailor");
    } else if (action === "selectResume") {
      setCurrentPage("select");
    } else if (action === "uploadScreenshot") {
      setCurrentPage("screenshot");
    } else if (action === "collections") {
      setCurrentPage("collections");
    }
  };

  const handleResumeSelection = (resumeName: string) => {
    setSelectedResume(resumeName);
    setCurrentPage("tailor");
  };

  const handleTailorStart = (link?: string) => {
    setShowLoading(true);
    setShowResume(false);
    if (link) {
      setShowLoading(false);
      setShowResume(true);
      setShareableLink(link);
    } else {
      setShareableLink(null);
    }
  };

  const handleResumeBack = () => {
    setShowResume(false);
    setShowLoading(false);
    setSelectedResume(null);
    setJobDescription('');
    setCurrentPage("main");
  };

  const handleScreenshotCaptured = (screenshot: string) => {
    setCapturedScreenshot(screenshot);
    setJobDescription("Job description extracted from screenshot");
    setCurrentPage("tailor");
  };

  const renderPageHeader = (backPage?: string) => (
    <div className="flex pt-5 pb-4 items-center px-4 border-b border-gray-200 relative">
      {backPage && (
        <button
          onClick={() => setCurrentPage(backPage)}
          className="text-gray-600 hover:text-gray-800 transition-colors"
        >
          <FiArrowLeft className="text-lg" />
        </button>
      )}

      <div className="flex items-center space-x-2 absolute left-1/2 transform -translate-x-1/2">
        <img src={resumatchLogo} alt="Resumatch Logo" className="w-6 h-6" />
        <span className="text-sm font-semibold text-gray-900">Resumatch.io</span>
      </div>
    </div>
  );

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (currentPage === "screenshot") {
    console.log("[Sidebar] Passing initialScreenshot to Screenshot:", capturedScreenshot);
  }

  // Apply consistent styles to navigation items
  const navItemStyle = "flex items-center space-x-3 px-5 py-3 bg-white text-blue-800 border border-blue-200 rounded-lg hover:bg-blue-50 transition duration-200 ease-in-out text-sm font-medium shadow-sm hover:shadow-md";

  return (
    <>
      {/* Hover Trigger - only show when sidebar is not visible */}
      {!isVisible && !forceVisible && (
        <div
          className="fixed top-1/2 right-0 w-8 h-32 -translate-y-1/2 z-[999998] bg-[#4747E1] text-white text-xs font-mono font-bold cursor-pointer flex items-center justify-center transition-all duration-300 rounded-l-lg max-sm:w-6 max-sm:h-24 opacity-15 hover:opacity-100 hover:scale-110"
          onClick={() => setIsVisible(true)}
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          <img
            src={resumatchLogo}
            alt="Resumatch Logo"
            className="w-6 h-6 bg-white p-1 rounded rotate-90 max-sm:w-4 max-sm:h-4"
          />
          <p className="p-1 max-sm:text-[10px]">ResuMatch</p>
        </div>
      )}

      {/* Sidebar Content */}
      {(isVisible || forceVisible) && (
        <div
          className={`fixed top-5 right-5 bottom-5 w-[400px] max-w-[90vw] z-[999999] bg-white rounded-2xl shadow-2xl border border-gray-200 font-sans animate-slide-in-right flex flex-col overflow-hidden`}
        >
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 z-[1000000] p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            title="Close"
          >
            <FiX className="text-lg" />
          </button>
          <div className="flex flex-col w-full h-full min-h-0">
            {currentPage === "tailor" ? (
              <>
                {renderPageHeader("main")}
                <div className="flex-1 min-h-0">
                  {showLoading ? (
                    <div className="flex flex-col items-center justify-center h-full p-6">
                      <img src={docSignGif} alt="Processing..." className="w-32 h-32 mb-4" />
                      <p className="text-lg font-bold text-[#4747E1]">Tailoring your resume...</p>
                    </div>
                  ) : showResume ? (
                    <ResumePage onBack={handleResumeBack} shareableLink={shareableLink || undefined} />
                  ) : (
                    <TailorResumePage
                      onSelectFromCollections={() => setCurrentPage("select")}
                      selectedResume={selectedResume}
                      onTailorStart={handleTailorStart}
                      onResumeRemove={() => setSelectedResume(null)}
                      jobDescriptionText={jobDescription}
                      onJobDescriptionChange={setJobDescription}
                      onFileDialogOpen={onFileDialogOpen}
                      onFileDialogClose={onFileDialogClose}
                      onSidebarVisibilityChange={(visible) => {
                        setIsVisible(visible);
                        if (onClose && !visible) onClose();
                      }}
                    />
                  )}
                </div>
              </>
            ) : currentPage === "select" ? (
              <>
                {renderPageHeader("tailor")}
                <div className="flex-1 min-h-0">
                  <SelectResumePage onResumeSelect={handleResumeSelection} />
                </div>
              </>
            ) : currentPage === "screenshot" ? (
              <>
                {renderPageHeader("main")}
                <div className="flex-1 min-h-0">
                  <Screenshot
                    onScreenshotCaptured={handleScreenshotCaptured}
                    initialScreenshot={capturedScreenshot}
                    onSidebarVisibilityChange={(visible, data) => {
                      setIsVisible(visible);
                      if (data?.capturedScreenshot) {
                        setCapturedScreenshot(data.capturedScreenshot);
                      }
                      if (onClose && !visible) onClose();
                    }}
                  />
                </div>
              </>
            ) : currentPage === "collections" ? (
              <Collections onBack={() => setCurrentPage("main")} />
            ) : (
              <>
                <div className="bg-[#4747E1] flex justify-center items-center h-[150px] relative">
                  <div className="flex items-center space-x-3 text-white">
                    <div className="bg-white p-2 rounded">
                      <img
                        src={resumatchLogo}
                        alt="Resumatch Logo"
                        className="w-6 h-6"
                      />
                    </div>
                    <h1 className="text-2xl font-bold">Resumatch.io</h1>
                  </div>
                  <div className="absolute top-4 right-4">
                    <SignedOut>

                    </SignedOut>
                  </div>
                </div>

                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-5">
                    <div className="space-y-4">
                      <SignedOut>
                        <div className="flex flex-col items-center justify-center py-6 space-y-4 rounded-2xl bg-white shadow-sm">
                          <SignInButton mode="modal">
                            <button className="flex items-center justify-center w-full max-w-xs border border-[#e0cffe] rounded-full py-3 px-5 bg-white text-gray-800 font-semibold text-sm shadow-sm hover:shadow-md transition-all">
                              <img
                                src={GoogleLogo}
                                alt="Google logo"
                                className="w-5 h-5 mr-3"
                              />
                              Sign up using Google
                            </button>
                          </SignInButton>
                        </div>
                      </SignedOut>

                      <SignedIn>
                        {user && (
                          <div className="flex justify-center items-center p-4">
                            <div className="text-[#6366F1] text-center font-medium text-sm">
                              Hi! {user.firstName || user.username || 'User'} !!
                            </div>
                          </div>
                        )}
                      </SignedIn>

                      {navItems
                        .filter((item) => {
                          if (item.visibleTo === "all") return true;
                          if (item.visibleTo === "signedIn") return !!user;
                          return false;
                        })
                        .map((item, index) => (
                          <div
                            key={index}
                            className="flex items-start space-x-3 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all cursor-pointer hover:border-[#4747E1]"
                            onClick={() => handleNavigation(item.action)}
                          >
                            <div className="flex items-center justify-center">
                              {item.icon}
                            </div>
                            <div>
                              <div className="font-semibold text-base text-[#6366F1]">
                                {item.title}
                              </div>
                              <div className="text-sm text-gray-600">
                                {item.description}
                              </div>
                            </div>
                          </div>
                        ))}

                      <SignedIn>
                        <button className={navItemStyle} onClick={handleSignOut}>
                          <FiLogOut className="text-base" />
                          <span>Sign Out</span>
                        </button>
                      </SignedIn>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 p-4">
                    <div className="text-center text-xs text-gray-400">
                      © 2025 Resumatch
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

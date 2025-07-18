import React from "react";
import { FiArrowLeft, FiDownload } from "react-icons/fi";
import achivemntIcon from "data-base64:../../assets/achivemnt.svg";
import docIcon from "data-base64:../../assets/doc.svg";
import {
  Star,
  Trash2,
  FileSignature,
  Pencil,
  Download,
  LayoutGrid,
} from "lucide-react";
import { SiGoogledrive } from "react-icons/si";
import { SignedIn, SignedOut } from "@clerk/chrome-extension";

interface ResumePageProps {
  onBack?: () => void;
  shareableLink?: string;
}

const ResumePage: React.FC<ResumePageProps> = ({ onBack, shareableLink }) => {
  return (
    <div className="flex flex-col h-full bg-white">
      {onBack && (
        <div className="p-4">
          <button
            onClick={onBack}
            className="flex items-center text-xs font-medium text-gray-600 hover:text-[#4747E1]"
          >
            <FiArrowLeft className="mr-1" />
            Back to Editor
          </button>
        </div>
      )}

      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        <h2 className="text-left text-sm font-semibold text-gray-900 mb-4 pt-4">
          Download Resume
        </h2>

        <SignedIn>
          <div className="flex justify-center space-x-3 mb-6">
            <button className="w-10 h-10 rounded-xl bg-[#FDF7EC] flex items-center justify-center">
              <Star className="w-4 h-4 text-yellow-500" fill="currentColor" />
            </button>

            <button className="w-10 h-10 rounded-xl bg-[#F3F3FF] flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-[#4747E1]" />
            </button>

            <button className="w-10 h-10 rounded-xl bg-[#F3F3FF] flex items-center justify-center">
              <FileSignature className="w-4 h-4 text-[#4747E1]" />
            </button>

            <button className="w-10 h-10 rounded-xl bg-[#F3F3FF] flex items-center justify-center">
              <Pencil className="w-4 h-4 text-[#4747E1]" />
            </button>

            <button className="w-10 h-10 rounded-xl bg-[#F3F3FF] flex items-center justify-center">
              <SiGoogledrive className="w-4 h-4 text-[#4747E1]" />
            </button>

            <button className="w-10 h-10 rounded-xl bg-[#F3F3FF] flex items-center justify-center">
              <Download className="w-4 h-4 text-[#4747E1]" />
            </button>

            <button className="px-4 py-2 bg-[#4747E1] text-white rounded-md text-xs font-medium shadow hover:bg-[#3a2aff] transition">
              <div className="flex items-center space-x-1">
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Templates</span>
              </div>
            </button>
          </div>
        </SignedIn>
        
        <SignedOut>
          <div className="mb-6 text-center">
            <p className="text-xs text-gray-600">Sign in to access more features</p>
          </div>
        </SignedOut>

        <div className="text-center mb-6">
          <div className="mx-auto w-24 h-24 flex items-center justify-center">
            <img src={achivemntIcon} alt="Achievement" className="w-16 h-16" />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 mt-2">
            Resume Created Successfully
          </h3>
          <p className="text-xs text-gray-600 mt-1">
            Your resume has been crafted successfully. Download and utilize for the job you are looking
          </p>
        </div>

        <div className="w-full bg-[#F9F9FF] border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-6">
          <div>
            <p className="text-sm font-medium text-gray-800">My Resume</p>
            <p className="text-xs text-gray-500">Created on 10-Jan-2024</p>
          </div>
          <div className="bg-[#4747E1] p-2 rounded-lg">
            <img src={docIcon} alt="Document" className="w-5 h-5" />
          </div>
        </div>

        <SignedIn>
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => alert("Download triggered")}
              className="flex items-center justify-center px-6 py-2 bg-[#4747E1] text-white rounded-full text-sm font-medium shadow hover:bg-[#3a2aff] transition"
            >
              <FiDownload className="mr-2" />
              Download
            </button>
            {shareableLink && (
              <a
                href={shareableLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#4747E1] hover:underline"
              >
                Preview
              </a>
            )}
          </div>
        </SignedIn>
        
        <SignedOut>
          <div className="flex flex-col items-center space-y-2">
            {shareableLink && (
              <a
                href={shareableLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#4747E1] hover:underline"
              >
                Preview
              </a>
            )}
          </div>
        </SignedOut>
      </div>
    </div>
  );
};

export default ResumePage;
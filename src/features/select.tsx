'use client';

import { useState, useEffect } from 'react';
import { Star, Edit2, Download, Trash2, FileText, Copy } from 'lucide-react';
import { useUser } from '@clerk/chrome-extension';

interface SelectResumePageProps {

  onResumeSelect?: (resumeName: string, resumeText: string) => void;

}

const SelectResumePage: React.FC<SelectResumePageProps> = ({ onResumeSelect }) => {
  const { user } = useUser();
  const [search, setSearch] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null);
  const [collections, setCollections] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      if (!user?.id || !user?.emailAddresses?.[0]?.emailAddress) {
        setError('User not authenticated or email not available');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const userEmail = user.emailAddresses[0].emailAddress;
        const response = await chrome.runtime.sendMessage({
          action: 'FETCH_COLLECTIONS',
          email: userEmail,
        });
        if (!response.success) {
          throw new Error(response.error || 'Failed to fetch collections');
        }
        setCollections(response.data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCollections();
  }, [user?.id, user?.emailAddresses]);

  const handleResumeClick = (resumeName: string, resumeId: string) => {
    setSelectedResumeId(resumeId);
  };

  const handleSelectResume = () => {
    if (selectedResumeId && onResumeSelect) {
      const selectedResume = collections?.find(item => item.id === selectedResumeId);
      const resumeName = selectedResume ? selectedResume.name : 'Unknown Resume';

      const resumeText = selectedResume ? selectedResume.text : '';
      onResumeSelect(resumeName, resumeText);

    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isPaginationNeeded = collections && collections.length > 10; // Set your threshold here

  // Assuming each page shows 10 resumes
  const resumesPerPage = 10;
  const totalPages = collections ? Math.ceil(collections.length / resumesPerPage) : 1;
  const [currentPage, setCurrentPage] = useState(1);

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Select Resume to tailor</h2>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="UI UX Designer"
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button className="bg-black text-white px-3 py-2 rounded-md text-xs">Search</button>
        </div>

        

        {isPaginationNeeded && (
          <p className="text-[10px] text-gray-500 mb-3">

            {collections ? `${collections.length} results based on your ` : ''}
            <span className="text-blue-600 underline cursor-pointer">profile</span> and activity
          </p>
        )}

        <div className="space-y-3 pb-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4747E1] mr-2" />
              <span className="text-xs text-gray-500">Loading collections...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-xs text-red-700">
              {error}
            </div>
          ) : collections && collections.length > 0 ? (
            collections.map((item, index) => (
              <div
                key={item.id || index}
                className={`group border rounded-xl p-4 bg-white shadow-sm cursor-pointer transition-all flex flex-col gap-2 hover:shadow-lg hover:border-[#6366F1] active:scale-[0.98] ${
                  selectedResumeId === `${item.id}`
                    ? 'border-[#4747E1] bg-[#f5f5ff] border-2 shadow-md'
                    : 'border-gray-200'
                }`}
                onClick={() => handleResumeClick(item.name || 'Untitled', `${item.id}`)}
              >
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 truncate max-w-[60%]">{item.name || 'Untitled'}</h3>
                  <div className="flex gap-1">
                    <div className="bg-gray-100 p-1 rounded-md cursor-pointer group-hover:bg-gray-200 transition-colors">
                      <Star className="w-4 h-4 text-[#4747E1]" />
                    </div>
                    <div className="bg-gray-100 p-1 rounded-md cursor-pointer group-hover:bg-gray-200 transition-colors">
                      <Copy className="w-4 h-4 text-[#4747E1]" />
                    </div>
                    <div className="bg-gray-100 p-1 rounded-md cursor-pointer group-hover:bg-gray-200 transition-colors">
                      <Edit2 className="w-4 h-4 text-[#4747E1]" />
                    </div>
                    <div className="bg-gray-100 p-1 rounded-md cursor-pointer group-hover:bg-gray-200 transition-colors">
                      <Download className="w-4 h-4 text-[#4747E1]" />
                    </div>
                    <div className="bg-gray-100 p-1 rounded-md cursor-pointer group-hover:bg-gray-200 transition-colors">
                      <Trash2 className="w-4 h-4 text-[#4747E1]" />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-1 text-[11px] min-h-[20px]">
                  {Array.isArray(item.tags) && item.tags.length > 0 ? (
                    item.tags.map((tag: string) => (
                      <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full">No tags</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-[11px] text-gray-500 mt-1">
                  <span>Created on {formatDate(item.createdAt)}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    (item.type || '').toLowerCase().includes('cover')
                      ? 'bg-pink-100 text-pink-700'
                      : 'bg-[#4747E1] text-white'
                  }`}>
                    {item.type || 'Resume'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-xs text-gray-500">No resumes found. Start creating your first tailored resume!</div>
          )}
        </div>
      </div>
      <div className="border-t border-gray-200 p-4 space-y-3">
        <div className="flex justify-center items-center gap-1 text-xs text-gray-700">
          <button
            className="w-6 h-6 flex items-center justify-center rounded-full border bg-white hover:bg-gray-100"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] ${
                n === currentPage ? 'bg-purple-200 text-purple-800' : 'bg-white hover:bg-gray-100'
              }`}
              onClick={() => handlePageChange(n)}
            >
              {n}
            </button>
          ))}
          <button
            className="w-6 h-6 flex items-center justify-center rounded-full border bg-white hover:bg-gray-100"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            &gt;
          </button>
        </div>
        <button
          onClick={handleSelectResume}
          disabled={!selectedResumeId}
          className={`w-full py-2 rounded-lg shadow-md transition-all text-xs font-medium ${
            selectedResumeId
              ? 'bg-[#4747E1] hover:bg-[#4747E1]/90 text-white'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {selectedResumeId ? `Selected: ${collections?.find(item => item.id === selectedResumeId)?.name || 'Unknown Resume'}` : 'Choose a Resume'}
        </button>
      </div>
    </div>
  );
};

export default SelectResumePage;

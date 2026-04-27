// components/DeleteConfirmationModal.jsx
import { useState, useEffect } from 'react';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export default function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  job,
  loading = false
}) {
  const [confirmText, setConfirmText] = useState('');
  const hasApplications = job?.currentApplications > 0;
  const action = hasApplications ? 'cancel' : 'delete';
  const actionText = hasApplications ? 'cancelled' : 'deleted';
  const requiredText = 'DELETE';

  // Reset confirmation text when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  if (!isOpen || !job) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900">
              {hasApplications ? 'Cancel Job' : 'Delete Job'}
            </h3>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Job Info */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-1">{job.jobTitle}</h4>
            <p className="text-sm text-gray-600">{job.companyName}</p>
            <div className="flex items-center justify-between mt-2 text-sm">
              <span className="text-gray-500">Status: {job.status}</span>
              <span className="text-gray-500">Applications: {job.currentApplications || 0}</span>
            </div>
          </div>

          {/* Warning Message */}
          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Are you sure you want to <strong>{action}</strong> this job?
            </p>

            {hasApplications ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <h5 className="font-medium text-amber-800 mb-2">
                  ⚠️ This job has {job.currentApplications} application(s)
                </h5>
                <p className="text-sm text-amber-700 mb-3">
                  Cancelling this job will:
                </p>
                <ul className="text-sm text-amber-700 space-y-1 ml-4">
                  <li>• Stop accepting new applications</li>
                  <li>• Notify all applied candidates</li>
                  <li>• Preserve application data for review</li>
                  <li>• Mark the job as cancelled</li>
                </ul>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h5 className="font-medium text-red-800 mb-2">
                  🗑️ Permanent Deletion
                </h5>
                <p className="text-sm text-red-700">
                  This will permanently delete the job and all associated data.
                  This action cannot be undone.
                </p>
              </div>
            )}

            <p className="text-sm text-gray-600 font-medium">
              This action cannot be undone.
            </p>
          </div>

          {/* Confirmation Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-mono bg-gray-100 px-1 rounded">{requiredText}</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={`Type ${requiredText} to confirm`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              disabled={loading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(job)}
            disabled={loading || confirmText !== requiredText}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center ${
              confirmText === requiredText && !loading
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {hasApplications ? 'Cancelling...' : 'Deleting...'}
              </>
            ) : (
              <>
                {hasApplications ? 'Cancel Job' : 'Delete Job'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
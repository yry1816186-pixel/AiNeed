import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Loader2, AlertCircle } from 'lucide-react';
import { featureFlagApi, type FeatureFlag } from '@/lib/feature-flag-api';

const TYPE_BADGE: Record<FeatureFlag['type'], { label: string; className: string }> = {
  boolean: { label: 'Boolean', className: 'bg-blue-100 text-blue-800' },
  percentage: { label: 'Percentage', className: 'bg-yellow-100 text-yellow-800' },
  variant: { label: 'Variant', className: 'bg-purple-100 text-purple-800' },
  segment: { label: 'Segment', className: 'bg-green-100 text-green-800' },
};

export function FlagListPage() {
  const navigate = useNavigate();
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FeatureFlag['type'] | ''>('');
  const [deleteTarget, setDeleteTarget] = useState<FeatureFlag | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await featureFlagApi.getAll();
      setFlags(data);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load feature flags';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlags();
  }, [fetchFlags]);

  const handleToggle = async (flag: FeatureFlag) => {
    setTogglingId(flag.id);
    try {
      const updated = await featureFlagApi.update(flag.id, { enabled: !flag.enabled });
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? updated : f)));
    } catch {
      setError('Failed to toggle flag');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await featureFlagApi.delete(deleteTarget.id);
      setFlags((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setError('Failed to delete flag');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = flags.filter((flag) => {
    const matchesSearch =
      !search ||
      flag.key.toLowerCase().includes(search.toLowerCase()) ||
      flag.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = !typeFilter || flag.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500">Loading feature flags...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
        <p className="mt-2 text-red-700">{error}</p>
        <button
          onClick={fetchFlags}
          className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Feature Flags</h2>
          <p className="mt-1 text-sm text-gray-500">{flags.length} flag{flags.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={() => navigate('/feature-flags/new')}
          className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Flag
        </button>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by key or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as FeatureFlag['type'] | '')}
          className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Types</option>
          <option value="boolean">Boolean</option>
          <option value="percentage">Percentage</option>
          <option value="variant">Variant</option>
          <option value="segment">Segment</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center">
          <p className="text-gray-500">
            {flags.length === 0 ? 'No feature flags yet. Create your first one!' : 'No flags match your search.'}
          </p>
          {flags.length === 0 && (
            <button
              onClick={() => navigate('/feature-flags/new')}
              className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Flag
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Updated</th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((flag) => (
                <tr key={flag.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4">
                    <button
                      onClick={() => handleToggle(flag)}
                      disabled={togglingId === flag.id}
                      className="focus:outline-none"
                      title={flag.enabled ? 'Click to disable' : 'Click to enable'}
                    >
                      {togglingId === flag.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      ) : flag.enabled ? (
                        <ToggleRight className="h-6 w-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-300" />
                      )}
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="font-medium text-gray-900">{flag.name}</div>
                    {flag.description && (
                      <div className="mt-0.5 max-w-xs truncate text-sm text-gray-500">{flag.description}</div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-sm font-mono text-gray-700">{flag.key}</code>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[flag.type].className}`}>
                      {TYPE_BADGE[flag.type].label}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                    {formatDate(flag.updatedAt)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => navigate(`/feature-flags/${flag.id}/edit`)}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(flag)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Delete Feature Flag</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete <span className="font-semibold">{deleteTarget.name}</span> (
              <code className="text-xs">{deleteTarget.key}</code>)? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

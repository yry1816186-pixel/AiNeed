import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Plus, X } from 'lucide-react';
import { featureFlagApi, type FeatureFlag, type CreateFeatureFlagDto } from '@/lib/feature-flag-api';

type FlagType = FeatureFlag['type'];

interface VariantItem {
  name: string;
  weight: number;
}

const SEGMENT_OPTIONS = [
  { value: 'new_user', label: 'New User' },
  { value: 'active_user', label: 'Active User' },
  { value: 'paid_user', label: 'Paid User' },
  { value: 'vip_user', label: 'VIP User' },
];

const DEFAULT_VALUES: Record<FlagType, Record<string, unknown>> = {
  boolean: { enabled: true },
  percentage: { percentage: 50 },
  variant: { variants: [{ name: 'control', weight: 50 }, { name: 'treatment', weight: 50 }] },
  segment: { segments: [] },
};

export function FlagFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<FlagType>('boolean');
  const [enabled, setEnabled] = useState(true);

  const [boolValue, setBoolValue] = useState(true);
  const [percentageValue, setPercentageValue] = useState(50);
  const [variants, setVariants] = useState<VariantItem[]>([
    { name: 'control', weight: 50 },
    { name: 'treatment', weight: 50 },
  ]);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [rulesJson, setRulesJson] = useState('{}');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    featureFlagApi
      .getById(id)
      .then((flag) => {
        setKey(flag.key);
        setName(flag.name);
        setDescription(flag.description ?? '');
        setType(flag.type);
        setEnabled(flag.enabled);
        populateValueFromFlag(flag);
        setRulesJson(JSON.stringify(flag.rules ?? {}, null, 2));
      })
      .catch((err: unknown) => {
        const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
        setError(axiosErr.response?.data?.message ?? axiosErr.message ?? 'Failed to load flag');
      })
      .finally(() => setLoading(false));
  }, [id]);

  const populateValueFromFlag = (flag: FeatureFlag) => {
    const v = flag.value ?? {};
    switch (flag.type) {
      case 'boolean':
        setBoolValue((v.enabled as boolean | undefined) ?? (v.value as boolean | undefined) ?? true);
        break;
      case 'percentage':
        setPercentageValue((v.percentage as number | undefined) ?? (v.value as number | undefined) ?? 50);
        break;
      case 'variant':
        if (Array.isArray(v.variants)) {
          setVariants(v.variants.map((item: Record<string, unknown>) => ({ name: (item.name as string) ?? '', weight: (item.weight as number) ?? 0 })));
        }
        break;
      case 'segment':
        if (Array.isArray(v.segments)) {
          setSelectedSegments(v.segments as string[]);
        }
        break;
    }
  };

  const buildValue = (): Record<string, unknown> => {
    switch (type) {
      case 'boolean':
        return { enabled: boolValue };
      case 'percentage':
        return { percentage: percentageValue };
      case 'variant':
        return { variants: variants.filter((v) => v.name.trim()) };
      case 'segment':
        return { segments: selectedSegments };
    }
  };

  const parseRules = (): Record<string, unknown> => {
    try {
      return JSON.parse(rulesJson);
    } catch {
      return {};
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!key.trim()) { setError('Key is required'); return; }
    if (!name.trim()) { setError('Name is required'); return; }

    const payload: CreateFeatureFlagDto = {
      key: key.trim(),
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      value: buildValue(),
      enabled,
      rules: parseRules(),
    };

    setSaving(true);
    try {
      if (isEdit && id) {
        await featureFlagApi.update(id, payload);
      } else {
        await featureFlagApi.create(payload);
      }
      navigate('/feature-flags');
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save flag';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleTypeChange = (newType: FlagType) => {
    setType(newType);
    const defaults = DEFAULT_VALUES[newType] as Record<string, any>;
    switch (newType) {
      case 'boolean':
        setBoolValue(defaults.enabled as boolean);
        break;
      case 'percentage':
        setPercentageValue(defaults.percentage as number);
        break;
      case 'variant':
        setVariants(defaults.variants as VariantItem[]);
        break;
      case 'segment':
        setSelectedSegments(defaults.segments as string[]);
        break;
    }
  };

  const addVariant = () => {
    setVariants((prev) => [...prev, { name: '', weight: 0 }]);
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof VariantItem, val: string | number) => {
    setVariants((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: val } : item))
    );
  };

  const toggleSegment = (seg: string) => {
    setSelectedSegments((prev) =>
      prev.includes(seg) ? prev.filter((s) => s !== seg) : [...prev, seg]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500">Loading flag...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => navigate('/feature-flags')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Feature Flags
        </button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Edit Feature Flag' : 'Create Feature Flag'}
        </h2>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="key" className="block text-sm font-medium text-gray-700">
              Key <span className="text-red-500">*</span>
            </label>
            <input
              id="key"
              type="text"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              disabled={isEdit}
              placeholder="e.g. enable_new_checkout"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
            />
            {isEdit && <p className="mt-1 text-xs text-gray-400">Key cannot be changed after creation</p>}
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Enable New Checkout Flow"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe what this flag controls..."
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type <span className="text-red-500">*</span>
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as FlagType)}
              disabled={isEdit}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              <option value="boolean">Boolean</option>
              <option value="percentage">Percentage</option>
              <option value="variant">Variant</option>
              <option value="segment">Segment</option>
            </select>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-3 text-sm font-medium text-gray-700">Value</h3>

            {type === 'boolean' && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBoolValue(!boolValue)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    boolValue ? 'bg-indigo-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      boolValue ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-700">{boolValue ? 'Enabled (true)' : 'Disabled (false)'}</span>
              </div>
            )}

            {type === 'percentage' && (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={percentageValue}
                    onChange={(e) => setPercentageValue(Number(e.target.value))}
                    className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-200 accent-indigo-600"
                  />
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={percentageValue}
                      onChange={(e) => setPercentageValue(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-16 rounded-md border border-gray-300 px-2 py-1 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-500">%</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{percentageValue}% of users will see this feature</p>
              </div>
            )}

            {type === 'variant' && (
              <div className="space-y-3">
                {variants.map((variant, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => updateVariant(index, 'name', e.target.value)}
                      placeholder="Variant name"
                      className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={variant.weight}
                      onChange={(e) => updateVariant(index, 'weight', Number(e.target.value))}
                      placeholder="Weight"
                      className="w-20 rounded-md border border-gray-300 px-2 py-1.5 text-center text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeVariant(index)}
                      disabled={variants.length <= 1}
                      className="rounded p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addVariant}
                  className="inline-flex items-center rounded-md px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Variant
                </button>
              </div>
            )}

            {type === 'segment' && (
              <div className="space-y-2">
                {SEGMENT_OPTIONS.map((seg) => (
                  <label key={seg.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSegments.includes(seg.value)}
                      onChange={() => toggleSegment(seg.value)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-700">{seg.label}</span>
                  </label>
                ))}
                {selectedSegments.length === 0 && (
                  <p className="text-xs text-gray-400">No segments selected - flag will not apply to any segment</p>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Enabled</label>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  enabled ? 'bg-green-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-sm text-gray-500">{enabled ? 'Active' : 'Inactive'}</span>
            </div>
          </div>

          <div>
            <label htmlFor="rules" className="block text-sm font-medium text-gray-700">
              Rules (JSON)
            </label>
            <textarea
              id="rules"
              value={rulesJson}
              onChange={(e) => setRulesJson(e.target.value)}
              rows={4}
              placeholder="{}"
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <button
              type="button"
              onClick={() => navigate('/feature-flags')}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {isEdit ? 'Update Flag' : 'Create Flag'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

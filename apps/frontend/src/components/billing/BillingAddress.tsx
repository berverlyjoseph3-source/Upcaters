// enterprise-ai-agent-platform/apps/frontend/src/components/billing/BillingAddress.tsx
import React, { useState, useEffect } from 'react';
import { MapPin, Save, Edit, X, AlertCircle, CheckCircle } from 'lucide-react';
import { BillingAddress as BillingAddressType } from '../../types/billing.types';

interface BillingAddressProps {
  initialAddress ? : BillingAddressType;
  onSave: (address: BillingAddressType) => Promise < void > ;
  isLoading ? : boolean;
}

const emptyAddress: BillingAddressType = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
};

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'JP', name: 'Japan' },
  { code: 'SG', name: 'Singapore' },
];

export const BillingAddress: React.FC < BillingAddressProps > = ({
  initialAddress,
  onSave,
  isLoading = false,
}) => {
  const [isEditing, setIsEditing] = useState(!initialAddress);
  const [address, setAddress] = useState < BillingAddressType > (initialAddress || emptyAddress);
  const [errors, setErrors] = useState < Partial < Record < keyof BillingAddressType, string >>> ({});
  const [saveStatus, setSaveStatus] = useState < 'idle' | 'saving' | 'success' | 'error' > ('idle');
  const [errorMessage, setErrorMessage] = useState < string | null > (null);
  
  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
    }
  }, [initialAddress]);
  
  const validate = (): boolean => {
    const newErrors: Partial < Record < keyof BillingAddressType, string >> = {};
    if (!address.line1.trim()) newErrors.line1 = 'Street address is required';
    if (!address.city.trim()) newErrors.city = 'City is required';
    if (!address.state.trim()) newErrors.state = 'State/Province is required';
    if (!address.postalCode.trim()) newErrors.postalCode = 'Postal code is required';
    if (!address.country) newErrors.country = 'Country is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (field: keyof BillingAddressType, value: string) => {
    setAddress(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };
  
  const handleSubmit = async () => {
    if (!validate()) return;
    setSaveStatus('saving');
    setErrorMessage(null);
    try {
      await onSave(address);
      setSaveStatus('success');
      setIsEditing(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to save billing address');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };
  
  const handleCancel = () => {
    if (initialAddress) {
      setAddress(initialAddress);
      setIsEditing(false);
    }
    setErrors({});
  };
  
  if (!isEditing && initialAddress) {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-secondary-400 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-secondary-900 dark:text-white">Billing Address</h3>
              <div className="mt-1 text-sm text-secondary-600 dark:text-secondary-400">
                <p>{address.line1}</p>
                {address.line2 && <p>{address.line2}</p>}
                <p>{address.city}, {address.state} {address.postalCode}</p>
                <p>{countries.find(c => c.code === address.country)?.name || address.country}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700"
          >
            <Edit className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="h-4 w-4 text-secondary-500" />
        <h3 className="text-sm font-medium text-secondary-900 dark:text-white">
          {initialAddress ? 'Edit Billing Address' : 'Add Billing Address'}
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Street Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={address.line1}
            onChange={(e) => handleChange('line1', e.target.value)}
            placeholder="123 Main St"
            className={`w-full px-3 py-2 rounded-lg border ${errors.line1 ? 'border-red-500' : 'border-secondary-300 dark:border-secondary-600'} bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500`}
          />
          {errors.line1 && <p className="mt-1 text-xs text-red-500">{errors.line1}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
            Apartment, suite, etc. (optional)
          </label>
          <input
            type="text"
            value={address.line2 || ''}
            onChange={(e) => handleChange('line2', e.target.value)}
            placeholder="Apt 4B"
            className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address.city}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="New York"
              className={`w-full px-3 py-2 rounded-lg border ${errors.city ? 'border-red-500' : 'border-secondary-300 dark:border-secondary-600'} bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500`}
            />
            {errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              State/Province <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address.state}
              onChange={(e) => handleChange('state', e.target.value)}
              placeholder="NY"
              className={`w-full px-3 py-2 rounded-lg border ${errors.state ? 'border-red-500' : 'border-secondary-300 dark:border-secondary-600'} bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500`}
            />
            {errors.state && <p className="mt-1 text-xs text-red-500">{errors.state}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Postal Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={address.postalCode}
              onChange={(e) => handleChange('postalCode', e.target.value)}
              placeholder="10001"
              className={`w-full px-3 py-2 rounded-lg border ${errors.postalCode ? 'border-red-500' : 'border-secondary-300 dark:border-secondary-600'} bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500`}
            />
            {errors.postalCode && <p className="mt-1 text-xs text-red-500">{errors.postalCode}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
              Country <span className="text-red-500">*</span>
            </label>
            <select
              value={address.country}
              onChange={(e) => handleChange('country', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${errors.country ? 'border-red-500' : 'border-secondary-300 dark:border-secondary-600'} bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500`}
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>{country.name}</option>
              ))}
            </select>
            {errors.country && <p className="mt-1 text-xs text-red-500">{errors.country}</p>}
          </div>
        </div>
      </div>

      {/* Status Messages */}
      {saveStatus === 'success' && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 rounded-lg p-2 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Billing address saved successfully
        </div>
      )}

      {saveStatus === 'error' && errorMessage && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-2 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {errorMessage}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700">
        <button
          onClick={handleCancel}
          disabled={saveStatus === 'saving'}
          className="px-4 py-2 rounded-lg border border-secondary-300 hover:bg-secondary-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={saveStatus === 'saving'}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
        >
          {saveStatus === 'saving' ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Address
        </button>
      </div>
    </div>
  );
};
export default BillingAddress;

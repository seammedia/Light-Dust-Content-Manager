import React, { useState } from 'react';
import { Client } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { Check, X, AlertCircle } from 'lucide-react';

interface MetaSettingsProps {
  client: Client;
  onUpdate: (client: Client) => void;
  onClose: () => void;
}

export function MetaSettings({ client, onUpdate, onClose }: MetaSettingsProps) {
  const [formData, setFormData] = useState({
    meta_page_id: client.meta_page_id || '',
    meta_access_token: client.meta_access_token || '',
    instagram_account_id: client.instagram_account_id || '',
    auto_post_enabled: client.auto_post_enabled || false,
    auto_post_to_facebook: client.auto_post_to_facebook ?? true,
    auto_post_to_instagram: client.auto_post_to_instagram ?? true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          meta_page_id: formData.meta_page_id || null,
          meta_access_token: formData.meta_access_token || null,
          instagram_account_id: formData.instagram_account_id || null,
          auto_post_enabled: formData.auto_post_enabled,
          auto_post_to_facebook: formData.auto_post_to_facebook,
          auto_post_to_instagram: formData.auto_post_to_instagram,
        })
        .eq('id', client.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setSuccess(true);
      onUpdate({ ...client, ...formData });

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving Meta settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-serif font-bold text-brand-dark mb-2">
                Meta Integration Settings
              </h2>
              <p className="text-sm text-stone-600">
                Connect your Facebook Page and Instagram Business Account
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-800">
              <Check className="w-5 h-5" />
              <span>Settings saved successfully!</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Facebook Page ID */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">
                Facebook Page ID
              </label>
              <input
                type="text"
                value={formData.meta_page_id}
                onChange={(e) => setFormData({ ...formData, meta_page_id: e.target.value })}
                placeholder="123456789012345"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
              <p className="mt-1 text-xs text-stone-500">
                Find this in your Facebook Page settings
              </p>
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">
                Meta Access Token
              </label>
              <textarea
                value={formData.meta_access_token}
                onChange={(e) => setFormData({ ...formData, meta_access_token: e.target.value })}
                placeholder="EAAxxxxxxxxxxxx..."
                rows={3}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green font-mono text-xs"
              />
              <p className="mt-1 text-xs text-stone-500">
                Generate this from Meta for Developers
              </p>
            </div>

            {/* Instagram Account ID */}
            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">
                Instagram Business Account ID
              </label>
              <input
                type="text"
                value={formData.instagram_account_id}
                onChange={(e) => setFormData({ ...formData, instagram_account_id: e.target.value })}
                placeholder="17841400000000000"
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-green"
              />
              <p className="mt-1 text-xs text-stone-500">
                Find this using the Graph API Explorer
              </p>
            </div>

            {/* Auto-Post Settings */}
            <div className="border-t border-stone-200 pt-6">
              <h3 className="text-lg font-bold text-stone-700 mb-4">Auto-Post Settings</h3>

              {/* Enable Auto-Post */}
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="auto_post_enabled"
                  checked={formData.auto_post_enabled}
                  onChange={(e) => setFormData({ ...formData, auto_post_enabled: e.target.checked })}
                  className="w-5 h-5 text-brand-green border-stone-300 rounded focus:ring-brand-green"
                />
                <label htmlFor="auto_post_enabled" className="text-sm font-medium text-stone-700">
                  Enable auto-posting when status = "Approved"
                </label>
              </div>

              {/* Platform Toggles */}
              {formData.auto_post_enabled && (
                <div className="ml-8 space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto_post_to_facebook"
                      checked={formData.auto_post_to_facebook}
                      onChange={(e) =>
                        setFormData({ ...formData, auto_post_to_facebook: e.target.checked })
                      }
                      className="w-4 h-4 text-brand-green border-stone-300 rounded focus:ring-brand-green"
                    />
                    <label htmlFor="auto_post_to_facebook" className="text-sm text-stone-600">
                      Auto-post to Facebook
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="auto_post_to_instagram"
                      checked={formData.auto_post_to_instagram}
                      onChange={(e) =>
                        setFormData({ ...formData, auto_post_to_instagram: e.target.checked })
                      }
                      className="w-4 h-4 text-brand-green border-stone-300 rounded focus:ring-brand-green"
                    />
                    <label htmlFor="auto_post_to_instagram" className="text-sm text-stone-600">
                      Auto-post to Instagram
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-brand-dark text-white py-3 rounded-lg hover:bg-black transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-stone-300 rounded-lg hover:bg-stone-50 transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-bold text-blue-900 mb-2">Need help setting this up?</h4>
            <p className="text-xs text-blue-800 leading-relaxed">
              Follow the setup guide in <code className="bg-blue-100 px-1 py-0.5 rounded">META-SETUP.md</code> to create a Facebook App and get your credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

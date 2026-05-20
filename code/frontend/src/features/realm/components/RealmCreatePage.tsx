import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useCreateRealm } from '@/lib/trpc/hooks/realm.hooks';
import { useAuthStore } from '@/core/auth/authStore';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { PageContent } from '@/shared/components/layout/PageContent';

export default function RealmCreatePage() {
  const navigate = useNavigate();
  const createRealm = useCreateRealm();
  const setCurrentRealmId = useAuthStore((state) => state.setCurrentRealmId);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createRealm.mutateAsync({
        name: formData.name,
        displayName: formData.displayName,
        description: formData.description || undefined,
        visibility: 'public',
      });

      // Switch to the new realm
      setCurrentRealmId(result.realm.id);

      // Reload to apply the new realm context
      window.location.href = '/';
    } catch (error) {
      console.error('Failed to create realm:', error);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <PageContent>
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-white mb-2">Create New Realm</h1>
          <p className="text-white/60">
            Create a new workspace for your team to collaborate.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
              Realm Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="my-realm"
              required
              className="w-full"
            />
            <p className="mt-1 text-xs text-white/50">
              Unique identifier for the realm (lowercase, no spaces)
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-white mb-2">
              Display Name <span className="text-red-400">*</span>
            </label>
            <Input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              placeholder="My Realm"
              required
              className="w-full"
            />
            <p className="mt-1 text-xs text-white/50">
              Human-readable name shown in the UI
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-white mb-2">
              Description
            </label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="A workspace for..."
              rows={4}
              className="w-full"
            />
            <p className="mt-1 text-xs text-white/50">
              Optional description of the realm's purpose
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4">
            <Button
              type="submit"
              disabled={createRealm.isPending || !formData.name || !formData.displayName}
              className="min-w-32"
            >
              {createRealm.isPending ? 'Creating...' : 'Create Realm'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate(-1)}
              disabled={createRealm.isPending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </PageContent>
  );
}

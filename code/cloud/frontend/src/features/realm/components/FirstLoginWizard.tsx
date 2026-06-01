/**
 * FirstLoginWizard - 首次登录向导
 *
 * 引导新用户选择 Realm
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RealmCard } from './';
import type { RealmInfo } from './';
import { useRealmStore } from '@/core/stores/realmStore';

interface FirstLoginWizardProps {
  realms: RealmInfo[];
}

type Step = 'welcome' | 'select' | 'ready';

export function FirstLoginWizard({ realms }: FirstLoginWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedRealmId, setSelectedRealmId] = useState<string>();
  const { setCurrentRealm } = useRealmStore();
  const navigate = useNavigate();

  const handleComplete = () => {
    if (selectedRealmId) {
      setCurrentRealm(selectedRealmId);
      navigate(`/realm/${selectedRealmId}`);
    }
  };

  const selectedRealm = realms.find((r) => r.realmId === selectedRealmId);

  return (
    <div className="first-login-wizard min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl w-full">
        {step === 'welcome' && (
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Welcome to Cove</h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Let's get you started by selecting a realm to work in.
            </p>
            <button
              onClick={() => setStep('select')}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-lg"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 'select' && (
          <div>
            <h2 className="text-3xl font-bold mb-6 text-center">
              Choose Your Realm
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {realms.map((realm) => (
                <RealmCard
                  key={realm.realmId}
                  realm={realm}
                  selected={selectedRealmId === realm.realmId}
                  onClick={() => setSelectedRealmId(realm.realmId)}
                  variant="detailed"
                  showDeviceStatus
                />
              ))}
            </div>
            <button
              onClick={() => setStep('ready')}
              disabled={!selectedRealmId}
              className="w-full py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        )}

        {step === 'ready' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">You're All Set!</h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              You're now ready to start working in{' '}
              <span className="font-semibold">{selectedRealm?.displayName}</span>
            </p>
            <button
              onClick={handleComplete}
              className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-lg"
            >
              Enter Realm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

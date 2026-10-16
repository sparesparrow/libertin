import React, { useCallback, useMemo, useState } from 'react';
import { createClient } from '@libertin/api/client';
import {
  FeedScreen,
  LoginScreen,
  OnboardingScreen,
  SuccessScreen,
  VerifyEmailScreen,
  type FeedScreenItem,
} from '@libertin/ui/native';
import {
  completeFeedLoad,
  nextStepAfterLogin,
  supportsFrozenContractNetwork,
} from './authFlowLogic';
import type { RuntimeConfig } from './runtimeConfig';

type Step = 'login' | 'verify' | 'success' | 'onboarding' | 'feed';

export function AuthFlow({ config }: { config: RuntimeConfig }) {
  // The frozen JSON/bearer contract is a mock/demo contract until the live
  // swingerslife.cz session flow is reproduced safely. Never point it at a live
  // base URL merely because one was configured.
  const client = useMemo(
    () =>
      supportsFrozenContractNetwork(config.networkMode)
        ? createClient(config.apiBaseUrl)
        : null,
    [config],
  );
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [feed, setFeed] = useState<FeedScreenItem[]>([]);

  const handleLogin = useCallback(async (inputEmail: string, password: string) => {
    setError(undefined);
    if (client === null) {
      setToken('');
      setError('Živý backend zatím nemá bezpečně ověřený přihlašovací kontrakt.');
      return;
    }

    setLoading(true);
    try {
      const res = await client.auth.login({ email: inputEmail, password });
      const nextStep = nextStepAfterLogin(res.user.verified, config.networkMode);

      if (nextStep === 'blocked') {
        setToken('');
        setError('Stav účtu nelze v živém režimu bezpečně ověřit.');
        return;
      }

      setEmail(res.user.email);
      setToken(res.token);
      setStep(nextStep);
    } catch {
      setError('Přihlášení se nezdařilo. Zkontrolujte údaje.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerified = useCallback(() => {
    // VerifyEmailScreen is explicitly a mock/dev affordance. Never turn its
    // button into a real verification request unless the live contract has
    // been observed and implemented deliberately.
    if (config.networkMode !== 'mock') {
      setToken('');
      setError('Ověření e-mailu není pro živý backend zatím potvrzené.');
      setStep('login');
      return;
    }
    setStep('success');
  }, [config.networkMode]);

  const handleFinish = useCallback(async () => {
    setError(undefined);
    if (client === null) {
      setError('Živý feed zatím nemá bezpečně ověřený kontrakt.');
      return;
    }

    setLoading(true);
    try {
      const result = await completeFeedLoad(() => client.feed.get({ page: 1, limit: 20 }, token));
      setFeed(result.items);
      setStep(result.step);
    } catch {
      // Stay on onboarding. A failed request must never look like a successful
      // transition to the native feed.
      setError('Feed se nepodařilo načíst. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  switch (step) {
    case 'login':
      return <LoginScreen onSubmit={handleLogin} loading={loading} error={error} />;
    case 'verify':
      return <VerifyEmailScreen email={email} onVerified={handleVerified} loading={loading} />;
    case 'success':
      return <SuccessScreen onContinue={() => setStep('onboarding')} />;
    case 'onboarding':
      return <OnboardingScreen onFinish={handleFinish} />;
    case 'feed':
      return <FeedScreen items={feed} loading={loading} />;
  }
}

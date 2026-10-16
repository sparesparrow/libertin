import React, { useCallback, useState } from 'react';
import { createClient } from '@libertin/api/client';
import {
  FeedScreen,
  LoginScreen,
  OnboardingScreen,
  SuccessScreen,
  VerifyEmailScreen,
  type FeedScreenItem,
} from '@libertin/ui/native';
import { completeFeedLoad, nextStepAfterLogin } from './authFlowLogic';
import { runtimeConfig } from './runtimeConfig';

const client = createClient(runtimeConfig.apiBaseUrl);

type Step = 'login' | 'verify' | 'success' | 'onboarding' | 'feed';

export function AuthFlow() {
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [feed, setFeed] = useState<FeedScreenItem[]>([]);

  const handleLogin = useCallback(async (inputEmail: string, password: string) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await client.auth.login({ email: inputEmail, password });
      const nextStep = nextStepAfterLogin(res.user.verified, runtimeConfig.networkMode);

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
    if (runtimeConfig.networkMode !== 'mock') {
      setToken('');
      setError('Ověření e-mailu není pro živý backend zatím potvrzené.');
      setStep('login');
      return;
    }
    setStep('success');
  }, []);

  const handleFinish = useCallback(async () => {
    setLoading(true);
    setError(undefined);
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

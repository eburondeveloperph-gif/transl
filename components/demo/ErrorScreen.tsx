/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { useLiveAPIContext } from '../../contexts/LiveAPIContext';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../../lib/auth';

export interface ExtendedErrorType {
  code?: number;
  message?: string;
  status?: string;
}

export default function ErrorScreen() {
  const { client } = useLiveAPIContext();
  const { signOut } = useAuth();
  const [error, setError] = useState<{ message?: string } | null>(null);

  useEffect(() => {
    function onError(error: ErrorEvent) {
      console.error(error);
      setError(error);
    }

    client.on('error', onError);

    return () => {
      client.off('error', onError);
    };
  }, [client]);

  const quotaErrorMessage =
    'Gemini Live API in AI Studio has a limited free quota each day. Come back tomorrow or try a different account.';

  let errorMessage = 'Something went wrong. Please try again.';
  let rawMessage: string | null = error?.message || null;
  let tryAgainOption = true;
  let isQuotaError = false;

  if (error?.message?.includes('RESOURCE_EXHAUSTED')) {
    errorMessage = quotaErrorMessage;
    rawMessage = null;
    tryAgainOption = false;
    isQuotaError = true;
  }

  if (!error) {
    return <div style={{ display: 'none' }} />;
  }

  return (
    <div className="error-screen">
      <div
        style={{
          fontSize: 48,
        }}
      >
        💔
      </div>
      <div
        className="error-message-container"
        style={{
          fontSize: 22,
          lineHeight: 1.2,
          opacity: 0.5,
          textAlign: 'center',
          maxWidth: '80%',
          marginBottom: '1rem'
        }}
      >
        {errorMessage}
      </div>
      
      <div style={{ display: 'flex', gap: '10px' }}>
        {tryAgainOption && (
          <button
            className="close-button"
            onClick={() => {
              setError(null);
            }}
          >
            Close
          </button>
        )}
        
        {isQuotaError && (
          <button
            className="sign-out-button-error"
            onClick={async () => {
              await signOut();
              setError(null);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Try Guest Access
          </button>
        )}
      </div>

      {rawMessage ? (
        <div
          className="error-raw-message-container"
          style={{
            fontSize: 15,
            lineHeight: 1.2,
            opacity: 0.4,
            marginTop: '1rem'
          }}
        >
          {rawMessage}
        </div>
      ) : null}
    </div>
  );
}
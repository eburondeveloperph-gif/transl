/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/**
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { useEffect } from 'react';
import ControlTray from './components/console/control-tray/ControlTray';
import ErrorScreen from './components/demo/ErrorScreen';
import StreamingConsole from './components/demo/streaming-console/StreamingConsole';
import LoginScreen from './components/auth/LoginScreen';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { LiveAPIProvider } from './contexts/LiveAPIContext';
import { useAuth, updateUserSettings } from './lib/auth';
import { useSettings } from './lib/state';
import { syncHistoryWithFirestore } from './lib/history';
import { rtdb } from './lib/firebase';
import { ref, get } from 'firebase/database';

const API_KEY = process.env.GEMINI_API_KEY;
if (typeof API_KEY !== 'string' || !API_KEY || API_KEY === 'undefined') {
  throw new Error(
    'Missing required environment variable: GEMINI_API_KEY'
  );
}

/**
 * Main application component that provides a streaming interface for Live API.
 * Manages video streaming state and provides controls for webcam/screen capture.
 */
function App() {
  const { user, initialized, signInAnonymously } = useAuth();
  const settings = useSettings();

  // Autologin for anonymous users
  useEffect(() => {
    const hasAttempted = sessionStorage.getItem('autologin_attempted');
    if (initialized && !user && !hasAttempted) {
      sessionStorage.setItem('autologin_attempted', 'true');
      signInAnonymously().catch((err) => {
        console.error('Autologin failed:', err);
      });
    }
  }, [initialized, user, signInAnonymously]);

  // Settings sync: Remote (RTDB) -> Local (Zustand) on login
  useEffect(() => {
    if (!user) return;
    
    const fetchSettings = async () => {
      const settingsRef = ref(rtdb, `users/${user.uid}/settings/current`);
      try {
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.voice) settings.setVoice(data.voice);
          if (data.topic) settings.setTopic(data.topic);
          if (data.language1) settings.setLanguage1(data.language1);
          if (data.language2) settings.setLanguage2(data.language2);
          if (data.autoDetect !== undefined) settings.setAutoDetect(data.autoDetect);
        }
      } catch (error) {
        console.error('Error fetching settings from RTDB:', error);
      }
    };
    
    fetchSettings();
  }, [user, settings]);

  // History sync: Remote (RTDB) -> Local (Zustand) on login
  useEffect(() => {
    if (!user) return;
    const unsubHistory = syncHistoryWithFirestore(user.uid);
    return () => unsubHistory();
  }, [user]);

  // Settings sync: Local (Zustand) -> Remote (RTDB) on change
  useEffect(() => {
    if (!user) return;

    const unsub = useSettings.subscribe((state, prevState) => {
      const changes: any = {};
      if (state.voice !== prevState.voice) changes.voice = state.voice;
      if (state.topic !== prevState.topic) changes.topic = state.topic;
      if (state.language1 !== prevState.language1) changes.language1 = state.language1;
      if (state.language2 !== prevState.language2) changes.language2 = state.language2;
      if (state.autoDetect !== prevState.autoDetect) changes.autoDetect = state.autoDetect;

      if (Object.keys(changes).length > 0) {
        updateUserSettings(user.uid, changes);
      }
    });

    return () => unsub();
  }, [user]);

  if (!initialized) {
    return (
      <div className="loading-screen">
        <div className="loader"></div>
        <p>Loading application...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="App">
      <LiveAPIProvider apiKey={API_KEY}>
        <ErrorScreen />
        <Header />
        <Sidebar />
        <div className="streaming-console">
          <main>
            <div className="main-app-area">
              <StreamingConsole />
            </div>
            <ControlTray></ControlTray>
          </main>
        </div>
      </LiveAPIProvider>
    </div>
  );
}

export default App;
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Languages } from 'lucide-react';
import { useUI } from '../lib/state';

export default function Header() {
  const { toggleSidebar } = useUI();

  return (
    <header className="header">
      <div className="header-left">
        <Languages className="logo-icon" size={24} color="#3b82f6" />
      </div>
      <div className="header-right">
        <button
          className="settings-button"
          onClick={toggleSidebar}
          aria-label="Translations History"
          title="Translations History"
        >
          <span className="icon">history</span>
        </button>
      </div>
    </header>
  );
}
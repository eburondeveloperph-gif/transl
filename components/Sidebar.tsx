/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { useSettings, useUI } from '../lib/state';
import c from 'classnames';
import { useLiveAPIContext } from '../contexts/LiveAPIContext';
import { useHistoryStore, HistoryItem as HistoryItemType } from '../lib/history';
import { X, Trash2, Copy, Check, ArrowRight } from 'lucide-react';

const HistoryItem: React.FC<{ item: HistoryItemType }> = ({ item }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(item.translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="history-item">
      <div className="history-item-header">
        <div className="history-item-languages">
          <span>{item.lang1}</span>
          <ArrowRight size={12} />
          <span>{item.lang2}</span>
        </div>
        <button
          onClick={handleCopy}
          className={c('history-item-copy', { copied })}
          title="Copy translation"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>
      <div className="history-item-content">
        <div className="history-item-source">
          <div className="history-item-text">{item.sourceText}</div>
        </div>
        <div className="history-item-translation">
          <div className="history-item-text">{item.translatedText}</div>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { isSidebarOpen, toggleSidebar } = useUI();
  const { topic, setTopic } = useSettings();
  const { connected } = useLiveAPIContext();
  const { history, clearHistory } = useHistoryStore();

  const handleSave = () => {
    toggleSidebar();
  };

  return (
    <aside className={c('sidebar', { open: isSidebarOpen })}>
      <div className="sidebar-header">
        <h3>Translations History</h3>
        <button onClick={toggleSidebar} className="close-button">
          <X size={24} />
        </button>
      </div>
      <div className="sidebar-content">
        <div className="sidebar-section">
          <fieldset disabled={connected}>
            <label>
              Topic (Optional)
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                rows={4}
                placeholder="e.g., Discussing quarterly financial results, focusing on revenue growth and market expansion."
              />
            </label>
          </fieldset>
          <button
            onClick={handleSave}
            className="save-settings-button"
            disabled={connected}
          >
            Save
          </button>
        </div>
        <div className="sidebar-section history-section">
          <div className="sidebar-section-title-wrapper">
            <h4 className="sidebar-section-title">Translation History</h4>
            <button
              onClick={clearHistory}
              className="clear-history-button"
              disabled={history.length === 0}
              aria-label="Clear translation history"
            >
              <Trash2 size={16} /> Clear
            </button>
          </div>
          <div className="history-list">
            {history.length > 0 ? (
              history.map(item => (
                <HistoryItem key={item.id} item={item} />
              ))
            ) : (
              <p className="history-empty-placeholder">
                No history yet. Start a translation to see it here.
              </p>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

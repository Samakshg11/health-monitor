import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getLatestReading, getReadings } from '../utils/api';
import { TrackerIcon } from '../components/TrackerUI';

const compareMetric = (generatedValue, storedValue) => {
  if (generatedValue == null && storedValue == null) return { state: 'match', label: 'Match' };
  if (generatedValue == null || storedValue == null) return { state: 'missing', label: 'Missing' };
  return Number(generatedValue) === Number(storedValue)
    ? { state: 'match', label: 'Match' }
    : { state: 'mismatch', label: 'Mismatch' };
};

const formatJson = (value) => JSON.stringify(value, null, 2);

const Verification = () => {
  const { verification, wearable } = useAuth();
  const { lastSocketEvent } = useSocket();
  const [latestApiReading, setLatestApiReading] = useState(null);
  const [recentReadings, setRecentReadings] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadVerification = useCallback(async () => {
    setLoading(true);
    try {
      const [latestRes, readingsRes] = await Promise.all([
        getLatestReading(),
        getReadings({ limit: 5 }),
      ]);
      setLatestApiReading(latestRes.data.reading || null);
      setRecentReadings(readingsRes.data.readings || []);
    } catch {
      setLatestApiReading(null);
      setRecentReadings([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadVerification();
  }, [loadVerification]);

  const generated = verification.lastGeneratedPayload;
  const comparisonRows = useMemo(() => {
    if (!generated || !latestApiReading) return [];
    return [
      {
        label: 'Heart rate',
        generated: generated.heartRate?.value,
        stored: latestApiReading.heartRate?.value,
      },
      {
        label: 'SpO2',
        generated: generated.spo2?.value,
        stored: latestApiReading.spo2?.value,
      },
      {
        label: 'Temperature',
        generated: generated.temperature?.value,
        stored: latestApiReading.temperature?.value,
      },
      {
        label: 'Steps',
        generated: generated.steps?.value,
        stored: latestApiReading.steps?.value,
      },
      {
        label: 'Stress',
        generated: generated.stressLevel?.value,
        stored: latestApiReading.stressLevel?.value,
      },
    ].map((row) => ({ ...row, result: compareMetric(row.generated, row.stored) }));
  }, [generated, latestApiReading]);

  const matches = comparisonRows.filter((row) => row.result.state === 'match').length;
  const comparisonSummary = comparisonRows.length ? `${matches}/${comparisonRows.length} fields match` : 'Waiting for comparable data';

  return (
    <div>
      <div className="page-header tracker-header">
        <div>
          <span className="eyebrow">Verification</span>
          <h1>Data pipeline audit</h1>
          <p>Use this screen to explain exactly how the app generates, sends, stores, and displays readings.</p>
        </div>
      </div>

      <div className="page-content tracker-dashboard">
        <section className="tracker-history-overview">
          <article className="card tracker-highlight-card">
            <div className="tracker-highlight-icon"><TrackerIcon name="sync" size={18} /></div>
            <span className="eyebrow">Write status</span>
            <strong>{verification.lastPostStatus}</strong>
            <p>{verification.lastPostedAt ? `Last posted ${formatDistanceToNow(new Date(verification.lastPostedAt), { addSuffix: true })}` : 'No write captured yet'}</p>
          </article>
          <article className="card tracker-highlight-card">
            <div className="tracker-highlight-icon"><TrackerIcon name="verify" size={18} /></div>
            <span className="eyebrow">Compare</span>
            <strong>{comparisonSummary}</strong>
            <p>{generated && latestApiReading ? 'Generated payload vs latest stored reading' : 'Need one generated payload and one stored reading'}</p>
          </article>
          <article className="card tracker-highlight-card">
            <div className="tracker-highlight-icon"><TrackerIcon name="device" size={18} /></div>
            <span className="eyebrow">Source</span>
            <strong>{wearable.paired ? 'Device mode' : 'Estimated mode'}</strong>
            <p>{wearable.paired ? 'Marked as device-backed in payload source' : 'Generated from simulator with browser sensor influence'}</p>
          </article>
        </section>

        <section className="tracker-device-details">
          <div className="card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Flow</span>
                <h3>How data moves</h3>
              </div>
            </div>
            <div className="tracker-diagnostics-list">
              <div className="tracker-diagnostic-row"><span>1. Generated in frontend</span><strong>{verification.lastGeneratedAt ? 'Yes' : 'No'}</strong></div>
              <div className="tracker-diagnostic-row"><span>2. Posted to backend</span><strong>{verification.lastPostStatus}</strong></div>
              <div className="tracker-diagnostic-row"><span>3. Read back from API</span><strong>{latestApiReading ? 'Yes' : 'No'}</strong></div>
              <div className="tracker-diagnostic-row"><span>4. Live socket event seen</span><strong>{lastSocketEvent?.type || 'No event'}</strong></div>
            </div>
          </div>

          <div className="card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Socket</span>
                <h3>Latest live event</h3>
              </div>
            </div>
            <div className="tracker-diagnostics-list">
              <div className="tracker-diagnostic-row"><span>Type</span><strong>{lastSocketEvent?.type || '—'}</strong></div>
              <div className="tracker-diagnostic-row"><span>Received</span><strong>{lastSocketEvent?.receivedAt ? formatDistanceToNow(new Date(lastSocketEvent.receivedAt), { addSuffix: true }) : '—'}</strong></div>
              <div className="tracker-diagnostic-row"><span>Payload available</span><strong>{lastSocketEvent?.payload ? 'Yes' : 'No'}</strong></div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Comparison</span>
              <h3>Generated vs stored values</h3>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" style={{ width: 'auto' }} onClick={loadVerification}>Refresh</button>
          </div>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Refreshing verification data...</p>
          ) : comparisonRows.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>Not enough data yet to compare generated and stored values.</p>
          ) : (
            <div className="tracker-compare-table">
              {comparisonRows.map((row) => (
                <div key={row.label} className="tracker-compare-row">
                  <span>{row.label}</span>
                  <strong>{row.generated ?? '—'}</strong>
                  <strong>{row.stored ?? '—'}</strong>
                  <span className={`tracker-compare-badge ${row.result.state}`}>{row.result.label}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="tracker-device-details">
          <div className="card tracker-code-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Payload</span>
                <h3>Last generated payload</h3>
              </div>
            </div>
            <pre>{generated ? formatJson(generated) : 'No generated payload yet'}</pre>
          </div>
          <div className="card tracker-code-card">
            <div className="panel-heading">
              <div>
                <span className="eyebrow">Stored</span>
                <h3>Latest API reading</h3>
              </div>
            </div>
            <pre>{latestApiReading ? formatJson(latestApiReading) : 'No API reading available'}</pre>
          </div>
        </section>

        <section className="card tracker-code-card">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Recent</span>
              <h3>Last 5 stored readings</h3>
            </div>
          </div>
          <pre>{recentReadings.length ? formatJson(recentReadings) : 'No readings fetched'}</pre>
        </section>
      </div>
    </div>
  );
};

export default Verification;

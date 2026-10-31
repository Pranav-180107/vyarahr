import React, { useState, useEffect } from 'react';
import { ShieldAlert, Search, RefreshCw, Clock } from 'lucide-react';
import { auditService } from '../../services/auditService';
import type { AuditLog } from '../../types/tenant';
import { masterSupabase } from '../../lib/supabase';

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await auditService.getAll();
      setLogs(data);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const channel = masterSupabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setLogs(prev => [payload.new as AuditLog, ...prev]);
        }
      )
      .subscribe();

    return () => {
      masterSupabase.removeChannel(channel);
    };
  }, []);

  const filteredLogs = logs.filter(l => 
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.actor_email.toLowerCase().includes(search.toLowerCase()) ||
    l.target_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-brand-navy">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Audit Records</h2>
          <p className="text-xs text-gray-500">Review platform level configuration changes and management activities.</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin text-brand-orange' : 'text-brand-orange'} />
          <span>Reload Logs</span>
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white border border-gray-200 rounded-xl max-w-md shadow-sm">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Filter logs by action, operator email or target ID..."
          className="bg-transparent border-none outline-none text-sm text-brand-navy placeholder-gray-400 w-full"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-orange"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            No audit records registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-xs text-gray-500 font-bold bg-gray-50/50">
                  <th className="p-5">Timestamp</th>
                  <th className="p-5">Operator</th>
                  <th className="p-5">Action Perform</th>
                  <th className="p-5">Target</th>
                  <th className="p-5">Metadata Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-5 text-xs text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <Clock size={12} className="text-brand-orange" />
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <div>
                        <p className="font-bold text-brand-navy">{log.actor_email}</p>
                        <p className="text-[10px] text-brand-orange font-bold uppercase tracking-wider mt-0.5">{log.actor_role}</p>
                      </div>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-brand-orange/10 text-brand-orange rounded-lg">
                          <ShieldAlert size={12} />
                        </div>
                        <span className="font-semibold text-brand-navy">{log.action}</span>
                      </div>
                    </td>
                    <td className="p-5 text-xs">
                      {log.target_type ? (
                        <div>
                          <span className="text-gray-500">{log.target_type}: </span>
                          <span className="text-brand-navy font-bold font-mono bg-gray-100 px-1.5 py-0.5 rounded">{log.target_id}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="p-5 text-xs text-gray-500 font-mono max-w-[250px] truncate" title={log.metadata ? JSON.stringify(log.metadata) : ''}>
                      {log.metadata ? JSON.stringify(log.metadata) : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;

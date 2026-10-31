import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AlertCircle, CheckCircle, User, Laptop, Search, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getScopedKey } from '../../utils/tenantHelper';

const Query = () => {
  const { profile, user } = useAuth();
  const [queries, setQueries] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Initial mock data using scoped keys
  useEffect(() => {
    if (profile || user) {
      const queryKey = getScopedKey('asset_queries', profile, user);
      const initialQueries: any[] = [];
      setQueries(JSON.parse(localStorage.getItem(queryKey) || JSON.stringify(initialQueries)));
    }
  }, [profile, user]);

  const handleResolve = (id: number) => {
    const queryKey = getScopedKey('asset_queries', profile, user);
    const equipKey = getScopedKey('all_equipment', profile, user);
    const updated = queries.map(q => q.id === id ? { ...q, status: 'Resolved' } : q);
    setQueries(updated);
    localStorage.setItem(queryKey, JSON.stringify(updated));
    
    // Update the equipment status in local storage (to be synced with Equipment.tsx)
    const equipment = JSON.parse(localStorage.getItem(equipKey) || '[]');
    const targetQuery = queries.find(q => q.id === id);
    if (targetQuery) {
       const updatedEquip = equipment.map((e: any) => 
         e.employee === targetQuery.employee && e.item === targetQuery.asset 
         ? { ...e, status: 'Active' } 
         : e
       );
       localStorage.setItem(equipKey, JSON.stringify(updatedEquip));
    }
  };

  const filteredQueries = queries.filter(q => 
    q.employee.toLowerCase().includes(searchTerm.toLowerCase()) || 
    q.asset.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
            <AlertCircle size={24} className="text-status-amber" /> Asset Queries & Issues
          </h2>
          <p className="text-sm text-gray-500 mt-1">Review and resolve hardware/software issues reported by employees.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search queries..." 
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-teal outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-xl shadow-brand-navy/5">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-brand-navy text-white text-xs uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-6 py-4">Employee Details</th>
                  <th className="px-6 py-4">Asset & Issue</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Date Reported</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredQueries.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-brand-navy/10 text-brand-navy flex items-center justify-center font-bold">
                          {q.employee[0]}
                        </div>
                        <span className="font-bold text-brand-navy">{q.employee}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-semibold text-gray-700">
                           <Laptop size={14} className="text-brand-teal" /> {q.asset}
                        </div>
                        <Badge variant={q.status === 'Resolved' ? 'green' : 'amber'} className="text-[10px] font-bold">
                          {q.type}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-6 py-5 max-w-xs">
                      <p className="text-gray-500 text-xs leading-relaxed">{q.description}</p>
                    </td>
                    <td className="px-6 py-5 text-gray-400 text-xs italic">{q.date}</td>
                    <td className="px-6 py-5 text-right">
                      {q.status === 'Pending' ? (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="gap-2 border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white transition-all shadow-sm"
                          onClick={() => handleResolve(q.id)}
                        >
                          <CheckCircle size={14} /> Mark Resolved
                        </Button>
                      ) : (
                        <div className="flex items-center justify-end gap-1 text-status-green font-bold text-xs uppercase tracking-wider">
                          <CheckCircle size={14} /> Resolved
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredQueries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic bg-gray-50/50">
                      No matching queries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Query;

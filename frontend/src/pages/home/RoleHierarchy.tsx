import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { User, ChevronDown, ChevronRight, Briefcase, Calendar, Award, Layers } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getScopedKey } from '../../utils/tenantHelper';

interface Employee {
  id: string;
  name: string;
  role: string;
  experience: string;
  project?: string;
  avatar?: string;
  children?: Employee[];
}

const hierarchyData: Employee = {
  id: 'ADM-001',
  name: 'Admin',
  role: 'Admin / CEO',
  experience: '12 Years',
  project: 'Corporate Strategy',
  avatar: 'https://i.pravatar.cc/150?img=68',
  children: []
};


// Wrapper for TreeNode that handles isSelected correctly per node
const TreeNodeWrapper = ({ node, selectedNode, onSelect }: { node: Employee, selectedNode: Employee | null, onSelect: (node: Employee) => void }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedNode?.id === node.id;

  return (
    <div className="flex flex-col items-center">
      <div 
        onClick={() => onSelect(node)}
        className={`relative z-10 cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 flex flex-col items-center min-w-[180px] shadow-sm hover:shadow-md ${
          isSelected 
            ? 'bg-brand-navy border-brand-navy text-white scale-105 ring-4 ring-brand-navy/10' 
            : 'bg-white border-brand-navy/5 text-brand-navy hover:border-brand-teal/30'
        }`}
      >
        <div className={`w-12 h-12 rounded-full mb-2 border-2 ${isSelected ? 'border-white/50' : 'border-brand-teal/20'} overflow-hidden`}>
          <img src={node.avatar} alt={node.name} className="w-full h-full object-cover" />
        </div>
        <div className="text-center">
          <p className={`font-black text-sm uppercase tracking-wider ${isSelected ? 'text-white' : 'text-brand-navy'}`}>
            {node.name}
          </p>
          <p className={`text-[10px] font-bold mt-0.5 ${isSelected ? 'text-white/80' : 'text-brand-teal'}`}>
            {node.role}
          </p>
        </div>
        
        {hasChildren && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
              isSelected ? 'bg-brand-teal text-white border-white scale-110' : 'bg-brand-navy text-white border-white shadow-sm'
            }`}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col items-center relative mt-6">
          <div className="absolute top-[-24px] w-0.5 h-6 bg-brand-navy/10" />
          <div className="absolute top-0 w-[calc(100%-180px)] h-0.5 bg-brand-navy/10" />
          <div className="flex gap-6 relative">
            {node.children?.map(child => (
              <div key={child.id} className="relative">
                <div className="absolute top-[-24px] left-1/2 -translate-x-1/2 w-0.5 h-6 bg-brand-navy/10" />
                <TreeNodeWrapper 
                  node={child} 
                  selectedNode={selectedNode}
                  onSelect={onSelect}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RoleHierarchy = () => {
  const { profile, user } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin';
  const [treeData, setTreeData] = useState<Employee>(hierarchyData);
  const [selectedNode, setSelectedNode] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editRoleStr, setEditRoleStr] = useState('');

  useEffect(() => {
    if (profile || user) {
      const key = getScopedKey('hr_role_hierarchy', profile, user);
      const saved = localStorage.getItem(key);
      const data = saved ? JSON.parse(saved) : hierarchyData;
      setTreeData(data);
      setSelectedNode(data);
    }
  }, [profile, user]);

  useEffect(() => {
    if (profile || user) {
      const key = getScopedKey('hr_role_hierarchy', profile, user);
      localStorage.setItem(key, JSON.stringify(treeData));
    }
  }, [treeData, profile, user]);

  const handleSelectNode = (node: Employee) => {
    setSelectedNode(node);
    setIsEditing(false);
  };

  const handleSaveRole = () => {
    if (!selectedNode) return;
    
    if (selectedNode.id === treeData.id) {
       const newTree = { ...treeData, role: editRoleStr };
       setTreeData(newTree);
       setSelectedNode(newTree);
       setIsEditing(false);
       return;
    }

    let targetNode: Employee | null = null;
    let oldParentId: string | null = null;

    const removeNode = (node: Employee): Employee => {
      if (!node.children) return node;
      if (node.children.some(c => c.id === selectedNode.id)) {
        targetNode = node.children.find(c => c.id === selectedNode.id) || null;
        oldParentId = node.id;
        return { ...node, children: node.children.filter(c => c.id !== selectedNode.id) };
      }
      return {
        ...node,
        children: node.children.map(removeNode)
      };
    };

    let treeWithoutTarget = removeNode(treeData);
    if (!targetNode) targetNode = { ...selectedNode };
    
    targetNode = { ...targetNode, role: editRoleStr };

    const isManager = /manager|director|vp|head|chief|mgr/i.test(editRoleStr);
    let newParentId = 'ADM-001';
    if (!isManager) {
      if (oldParentId === 'ADM-001') {
        newParentId = 'MGR-001';
      } else {
        newParentId = oldParentId || 'MGR-001';
      }
    }

    const insertNode = (node: Employee): Employee => {
      if (node.id === newParentId) {
        return { ...node, children: [...(node.children || []), targetNode!] };
      }
      if (node.children) {
        return { ...node, children: node.children.map(insertNode) };
      }
      return node;
    };

    const newTree = insertNode(treeWithoutTarget);
    setTreeData(newTree);
    setSelectedNode(targetNode);
    setIsEditing(false);
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col items-center">
        <h3 className="text-xl font-black text-brand-navy uppercase tracking-widest mb-2">Organization Structure</h3>
        <p className="text-gray-500 text-sm font-medium">Click on any member to view their professional profile</p>
      </div>

      <div className="overflow-x-auto pb-20 pt-10 min-h-[500px] flex justify-start sm:justify-center px-4 w-full scrollbar-thin">
        <div className="inline-block align-top min-w-max mx-auto">
          <TreeNodeWrapper 
            node={treeData} 
            selectedNode={selectedNode}
            onSelect={handleSelectNode}
          />
        </div>
      </div>

      {/* Profile Detail Card */}
      {selectedNode && (
        <div className="animate-in slide-in-from-bottom duration-500 flex justify-center sticky bottom-8 z-30 px-4">
          <Card className="max-w-4xl w-full border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-white/90 backdrop-blur-xl border border-white/20">
            <CardContent className="p-0">
              <div className="flex flex-col md:flex-row">
                <div className="bg-brand-navy p-10 flex flex-col items-center justify-center md:w-1/3 text-white">
                  <div className="w-24 h-24 rounded-3xl border-4 border-brand-teal/30 overflow-hidden shadow-2xl mb-4 rotate-3">
                    <img src={selectedNode.avatar} alt={selectedNode.name} className="w-full h-full object-cover" />
                  </div>
                  <h4 className="text-xl font-black uppercase tracking-tight text-center">{selectedNode.name}</h4>
                  <Badge variant="blue" className="mt-2 bg-brand-teal/20 text-brand-teal border-none text-[10px] font-black uppercase tracking-widest">{selectedNode.role}</Badge>
                </div>
                
                <div className="p-10 flex-1 grid grid-cols-1 sm:grid-cols-2 gap-8 bg-white/50">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <User size={12} className="text-brand-teal" /> Employee ID
                    </p>
                    <p className="text-lg font-bold text-brand-navy font-mono">{selectedNode.id}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <Award size={12} className="text-brand-teal" /> Experience
                    </p>
                    <p className="text-lg font-bold text-brand-navy">{selectedNode.experience}</p>
                  </div>
                  
                  {selectedNode.project && (
                    <div className="space-y-1">
                      <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                        <Layers size={12} className="text-brand-teal" /> Current Project
                      </p>
                      <p className="text-lg font-bold text-brand-navy">{selectedNode.project}</p>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <Briefcase size={12} className="text-brand-teal" /> Role & Rank
                    </p>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={editRoleStr}
                          onChange={(e) => setEditRoleStr(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveRole()}
                          className="bg-white border focus:ring-1 focus:ring-brand-teal text-brand-navy rounded px-2 py-1 flex-1 text-sm outline-none shadow-sm h-8"
                          autoFocus
                        />
                        <button 
                          onClick={handleSaveRole}
                          className="bg-brand-teal text-white px-3 py-1 rounded text-xs font-bold hover:bg-brand-navy transition-all h-8 flex items-center shadow-sm"
                        >
                          Save
                        </button>
                        <button 
                          onClick={() => setIsEditing(false)}
                          className="bg-gray-100 text-gray-600 px-3 py-1 rounded text-xs font-bold hover:bg-gray-200 transition-all h-8 flex items-center shadow-sm"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-bold text-brand-navy">{selectedNode.role}</p>
                        {isAdmin && (
                           <button 
                             onClick={() => { setIsEditing(true); setEditRoleStr(selectedNode.role); }}
                             className="text-xs font-bold bg-brand-orange/10 text-brand-orange hover:bg-brand-orange hover:text-white transition-colors px-2 py-1 rounded shadow-sm"
                           >
                              Edit
                           </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
                      <Calendar size={12} className="text-brand-teal" /> Status
                    </p>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                       <p className="text-lg font-bold text-brand-navy">Active Member</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RoleHierarchy;

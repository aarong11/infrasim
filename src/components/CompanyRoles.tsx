'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ClientVectorMemoryService } from '../core/client-vector-memory-service';
import { CompanyMemoryRecord } from '../types/infrastructure';

interface CompanyRolesProps {
  companyId: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  department: string;
  level: 'executive' | 'manager' | 'senior' | 'junior' | 'intern';
  createdAt: Date;
}

export const CompanyRoles: React.FC<CompanyRolesProps> = ({ companyId }) => {
  const router = useRouter();
  const [company, setCompany] = useState<CompanyMemoryRecord | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddRole, setShowAddRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<Partial<Role>>({
    name: '',
    description: '',
    permissions: [],
    department: '',
    level: 'junior'
  });
  const vectorService = new ClientVectorMemoryService();

  useEffect(() => {
    loadCompanyAndRoles();
  }, [companyId]);

  const loadCompanyAndRoles = async () => {
    try {
      setLoading(true);
      const companies = await vectorService.getAllCompaniesFromMemory();
      const foundCompany = companies.find(c => c.id === companyId);
      
      if (foundCompany) {
        setCompany(foundCompany);
        // Load roles from company metadata or create sample roles
        const existingRoles = foundCompany.metadata?.roles || generateSampleRoles(foundCompany);
        setRoles(existingRoles);
      } else {
        setError('Company not found');
      }
    } catch (err) {
      console.error('Failed to load company:', err);
      setError('Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  const generateSampleRoles = (company: CompanyMemoryRecord): Role[] => {
    const baseRoles = [
      { name: 'CEO', description: 'Chief Executive Officer', department: 'Executive', level: 'executive' as const },
      { name: 'CTO', description: 'Chief Technology Officer', department: 'Technology', level: 'executive' as const },
      { name: 'Engineering Manager', description: 'Software Engineering Team Lead', department: 'Technology', level: 'manager' as const },
      { name: 'Senior Developer', description: 'Senior Software Developer', department: 'Technology', level: 'senior' as const },
      { name: 'Product Manager', description: 'Product Strategy and Management', department: 'Product', level: 'manager' as const },
    ];

    return baseRoles.map((role, index) => ({
      id: `role-${index + 1}`,
      ...role,
      permissions: generatePermissionsForRole(role.level),
      createdAt: new Date()
    }));
  };

  const generatePermissionsForRole = (level: Role['level']): string[] => {
    const basePermissions = ['read_company_data', 'update_profile'];
    const permissions = [...basePermissions];

    switch (level) {
      case 'executive':
        permissions.push('manage_all_users', 'manage_company', 'view_financials', 'manage_infrastructure');
        break;
      case 'manager':
        permissions.push('manage_team', 'approve_requests', 'view_reports');
        break;
      case 'senior':
        permissions.push('mentor_juniors', 'review_code', 'manage_projects');
        break;
      case 'junior':
        permissions.push('submit_requests', 'access_development_tools');
        break;
    }

    return permissions;
  };

  const handleAddRole = async () => {
    if (!newRole.name || !newRole.description) return;
    
    const role: Role = {
      id: `role-${Date.now()}`,
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions || [],
      department: newRole.department || 'General',
      level: newRole.level || 'junior',
      createdAt: new Date()
    };
    
    const updatedRoles = [...roles, role];
    setRoles(updatedRoles);
    
    // Persist to backend
    if (company) {
      try {
        const updatedCompany: CompanyMemoryRecord = {
          ...company,
          metadata: {
            ...company.metadata,
            roles: updatedRoles
          },
          updatedAt: new Date()
        };
        
        await vectorService.updateCompanyInMemory(updatedCompany);
        setCompany(updatedCompany);
        console.log('✅ Role added and persisted successfully');
      } catch (error) {
        console.error('Failed to persist role addition:', error);
        // Revert local state on error
        setRoles(roles);
      }
    }
    
    setNewRole({ name: '', description: '', permissions: [], department: '', level: 'junior' });
    setShowAddRole(false);
  };

  const handleDeleteRole = async (roleId: string) => {
    const updatedRoles = roles.filter(role => role.id !== roleId);
    setRoles(updatedRoles);
    
    // Persist to backend
    if (company) {
      try {
        const updatedCompany: CompanyMemoryRecord = {
          ...company,
          metadata: {
            ...company.metadata,
            roles: updatedRoles
          },
          updatedAt: new Date()
        };
        
        await vectorService.updateCompanyInMemory(updatedCompany);
        setCompany(updatedCompany);
        console.log('✅ Role deleted and persisted successfully');
      } catch (error) {
        console.error('Failed to persist role deletion:', error);
        // Revert local state on error
        setRoles(roles);
      }
    }
  };

  const handleBackToDashboard = () => {
    router.push(`/company/${companyId}/dashboard`);
  };

  const getLevelColor = (level: Role['level']) => {
    switch (level) {
      case 'executive': return 'bg-purple-600';
      case 'manager': return 'bg-blue-600';
      case 'senior': return 'bg-green-600';
      case 'junior': return 'bg-yellow-600';
      case 'intern': return 'bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-xl text-gray-400">Loading company roles...</h3>
        </div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-xl text-gray-400 mb-2">Error</h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToDashboard}
                className="text-gray-400 hover:text-white transition-colors"
                title="Back to Dashboard"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-white">Company Roles</h1>
            </div>
            <button
              onClick={() => setShowAddRole(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              Add New Role
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-6">
        {/* Add Role Modal */}
        {showAddRole && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-semibold text-white mb-4">Add New Role</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole(prev => ({...prev, name: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole(prev => ({...prev, description: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Department</label>
                  <input
                    type="text"
                    value={newRole.department}
                    onChange={(e) => setNewRole(prev => ({...prev, department: e.target.value}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Level</label>
                  <select
                    value={newRole.level}
                    onChange={(e) => setNewRole(prev => ({...prev, level: e.target.value as Role['level']}))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="intern">Intern</option>
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                    <option value="manager">Manager</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>
              </div>
              <div className="flex space-x-2 mt-6">
                <button
                  onClick={handleAddRole}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                >
                  Add Role
                </button>
                <button
                  onClick={() => setShowAddRole(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Roles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map((role) => (
            <div key={role.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{role.name}</h3>
                  <p className="text-gray-400 text-sm">{role.department}</p>
                </div>
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded text-xs text-white ${getLevelColor(role.level)}`}>
                    {role.level}
                  </span>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="text-red-400 hover:text-red-300"
                    title="Delete Role"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <p className="text-gray-300 text-sm mb-4">{role.description}</p>
              
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Permissions</h4>
                <div className="flex flex-wrap gap-1">
                  {role.permissions.slice(0, 3).map((permission, index) => (
                    <span key={index} className="px-2 py-1 bg-cyan-600 text-white rounded text-xs">
                      {permission.replace('_', ' ')}
                    </span>
                  ))}
                  {role.permissions.length > 3 && (
                    <span className="px-2 py-1 bg-gray-600 text-white rounded text-xs">
                      +{role.permissions.length - 3} more
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-xs text-gray-400">
                Created: {role.createdAt.toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>

        {roles.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl text-gray-400 mb-2">No roles defined</h3>
            <p className="text-gray-500 mb-4">Start by adding some roles for {company.name}</p>
            <button
              onClick={() => setShowAddRole(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
            >
              Add First Role
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
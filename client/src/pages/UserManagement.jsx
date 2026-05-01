import React, { useState, useEffect, useContext } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import AuthContext from '../context/AuthContext';
import { Search, User, Mail, Shield, Trash2, Edit3, XCircle, CheckCircle, Loader2, GraduationCap, Briefcase, Upload, Database, FileJson, FileSpreadsheet, AlertCircle } from 'lucide-react';
import api from '../utils/api';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', password: '', role: '', status: '', rollNumber: '', employeeId: '', branch: '', section: '' });
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [bulkData, setBulkData] = useState('');
    const [bulkType, setBulkType] = useState('json'); // 'json' or 'csv'
    const [isBulkUploading, setIsBulkUploading] = useState(false);
    const [bulkResults, setBulkResults] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const showAlert = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/auth/users');
            setUsers(res.data);
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => setSearchTerm(e.target.value);

    const filteredUsers = users.filter(user => {
        const name = (user.name || '').toLowerCase();
        const roll = (user.rollNumber || user.employeeId || '').toLowerCase();
        const branch = (user.branch || user.department || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return name.includes(search) || roll.includes(search) || branch.includes(search);
    });




    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await api.delete(`/auth/user/${deleteId}`);
            setUsers(users.filter(u => u._id !== deleteId));
            showAlert('Agent record purged from system');
            setDeleteId(null);
        } catch (err) {
            showAlert('Access Denied: Could not purge record', 'error');
        }
    };

    const handleToggleStatus = async (user) => {
        const newStatus = user.status === 'active' ? 'inactive' : 'active';
        try {
            await api.put(`/auth/user/${user._id}`, { status: newStatus });
            setUsers(users.map(u => u._id === user._id ? { ...u, status: newStatus } : u));
            showAlert(`Agent status set to ${newStatus.toUpperCase()}`);
        } catch (err) {
            showAlert('Status override failed', 'error');
        }
    };


    const startEdit = (user) => {
        setEditingUser(user);
        setEditForm({ 
            name: user.name || '', 
            password: '', 
            role: user.role, 
            status: user.status || (user.isActive ? 'active' : 'inactive'),
            rollNumber: user.rollNumber || '',
            employeeId: user.employeeId || '',
            branch: user.branch || user.department || '',
            section: user.section || ''
        });
    };





    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/auth/user/${editingUser._id}`, editForm);
            setUsers(users.map(u => u._id === editingUser._id ? { ...u, ...editForm } : u));
            setEditingUser(null);
            showAlert('Agent profile updated in database');
        } catch (err) {
            showAlert('Update rejected by server', 'error');
        }
    };

    const handleBulkUpload = async () => {
        if (!bulkData.trim()) return showAlert('Please provide data', 'error');

        setIsBulkUploading(true);
        setBulkResults(null);
        try {
            let parsedUsers = [];
            if (bulkType === 'json') {
                parsedUsers = JSON.parse(bulkData);
                if (!Array.isArray(parsedUsers)) parsedUsers = [parsedUsers];
            } else {
                // Basic CSV parsing
                const lines = bulkData.trim().split('\n');
                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                parsedUsers = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const user = {};
                    headers.forEach((header, i) => {
                        user[header] = values[i];
                    });
                    return user;
                });
            }

            const res = await api.post('/auth/bulk-create-users', { users: parsedUsers });
            setBulkResults(res.data.results);
            showAlert(res.data.msg);
            fetchUsers();
        } catch (err) {
            console.error('Bulk upload error:', err);
            showAlert(err.message || 'Failed to parse data', 'error');
        } finally {
            setIsBulkUploading(false);
        }
    };


    return (
        <DashboardLayout role="admin">
            <div className="space-y-8 animate-in fade-in duration-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
                            User <span className="text-[#ff6b00]">Management</span>
                        </h1>
                        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2">Elite System Authority</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsBulkModalOpen(true)}
                            className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-black italic uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                        >
                            <Upload size={16} /> Bulk Upload
                        </button>
                    </div>

                    {message.text && (
                        <div className={`fixed top-10 right-10 z-[200] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-500 border ${
                            message.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400'
                        }`}>
                            <div className="flex items-center gap-3">
                                {message.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
                                <p className="font-black italic uppercase tracking-tight text-sm">{message.text}</p>
                            </div>
                        </div>
                    )}


                    <div className="relative w-full md:w-96 group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-[#ff6b00] transition-colors">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, email, or ID..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="block w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#ff6b00]/50 focus:border-transparent transition-all font-medium"
                        />
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/10">
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Name</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">User ID</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Branch</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Section</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Joined</th>
                                    <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>

                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="8" className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <Loader2 className="text-[#ff6b00] animate-spin" size={40} />
                                                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Accessing Database...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="8" className="px-8 py-20 text-center">
                                            <p className="text-slate-500 font-bold italic">No agents found in the system.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user._id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-6 text-left">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shrink-0 ${
                                                        user.role === 'faculty' ? 'bg-indigo-600' : 
                                                        user.role === 'admin' ? 'bg-rose-600' : 'bg-emerald-600'
                                                    }`}>
                                                        {user.role === 'faculty' ? <Briefcase size={18} /> : 
                                                         user.role === 'admin' ? <Shield size={18} /> : <GraduationCap size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-black italic uppercase tracking-tight text-xs truncate max-w-[150px]">{user.name || 'Unknown Agent'}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.role}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-left">
                                                <p className="text-slate-300 font-black text-xs">{user.employeeId || user.rollNumber || (user.role === 'faculty' ? 'FACULTY' : 'N/A')}</p>
                                            </td>

                                            <td className="px-6 py-6 text-left">
                                                <p className="text-slate-300 font-black text-xs">{user.branch || user.department || (user.role === 'faculty' ? 'STAFF' : 'N/A')}</p>
                                            </td>
                                            <td className="px-6 py-6 text-left">
                                                <p className="text-slate-300 font-black text-xs">{user.section || (user.role === 'faculty' ? 'OFFICE' : 'N/A')}</p>
                                            </td>



                                            <td className="px-6 py-6 text-center">
                                                <div className="flex justify-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        (user.status === 'active' || user.isActive === true) 
                                                        ? 'bg-emerald-500/10 text-emerald-400' 
                                                        : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                        {user.status || (user.isActive ? 'active' : 'inactive')}
                                                    </span>
                                                </div>
                                            </td>

                                            <td className="px-6 py-6 text-center">
                                                <p className="text-slate-400 font-bold text-[10px]">
                                                    {new Date(user.createdAt).toLocaleDateString()}
                                                </p>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button 
                                                        onClick={() => startEdit(user)}
                                                        className="p-2.5 bg-white/5 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-lg transition-all border border-white/10 hover:border-transparent active:scale-90"
                                                    >
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleToggleStatus(user)}
                                                        className={`p-2.5 bg-white/5 rounded-lg transition-all border border-white/10 active:scale-90 ${
                                                            user.status === 'active' 
                                                            ? 'hover:bg-orange-600 text-slate-400 hover:text-white' 
                                                            : 'hover:bg-emerald-600 text-slate-400 hover:text-white'
                                                        }`}
                                                    >
                                                        {user.status === 'active' ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                                    </button>
                                                    <button 
                                                        onClick={() => setDeleteId(user._id)}
                                                        className="p-2.5 bg-white/5 hover:bg-red-600 text-slate-400 hover:text-white rounded-lg transition-all border border-white/10 hover:border-transparent active:scale-90"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>

                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>

                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0f172a]/80 backdrop-blur-sm" onClick={() => setEditingUser(null)}></div>
                    <div className="bg-[#1e293b] w-full max-w-lg rounded-[2.5rem] p-10 border border-white/10 relative z-10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="bg-[#ff6b00] p-3 rounded-2xl text-white">
                                <Edit3 size={24} />
                            </div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Edit <span className="text-[#ff6b00]">Agent</span></h2>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{editForm.role === 'faculty' ? 'Employee ID' : 'Roll Number'}</label>
                                <input
                                    type="text"
                                    value={editForm.role === 'faculty' ? editForm.employeeId : editForm.rollNumber}
                                    onChange={(e) => {
                                        if (editForm.role === 'faculty') {
                                            setEditForm({ ...editForm, employeeId: e.target.value });
                                        } else {
                                            setEditForm({ ...editForm, rollNumber: e.target.value });
                                        }
                                    }}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secure Password (Change Only If Needed)</label>
                                <input
                                    type="text"
                                    value={editForm.password}
                                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                    placeholder="Enter new password to reset"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-[#ff6b00] font-black focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all"
                                />
                            </div>


                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Role</label>
                                    <select
                                        value={editForm.role}
                                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all appearance-none"
                                    >
                                        <option value="student">Student</option>
                                        <option value="faculty">Faculty</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all appearance-none"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            {editForm.role === 'student' && (
                                <div className="grid grid-cols-3 gap-4 animate-in slide-in-from-top duration-300">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">User ID / Roll No</label>
                                        <input
                                            type="text"
                                            value={editForm.rollNumber}
                                            onChange={(e) => setEditForm({ ...editForm, rollNumber: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Branch</label>
                                        <input
                                            type="text"
                                            value={editForm.branch}
                                            onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sec</label>
                                        <input
                                            type="text"
                                            value={editForm.section}
                                            onChange={(e) => setEditForm({ ...editForm, section: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            )}


                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 px-8 py-4 bg-white/5 text-slate-400 rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-8 py-4 bg-[#ff6b00] text-white rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-orange-500 shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                                >
                                    Update Agent
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Bulk Upload Modal */}
            {isBulkModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0f172a]/90 backdrop-blur-md" onClick={() => !isBulkUploading && setIsBulkModalOpen(false)}></div>
                    <div className="bg-[#1e293b] w-full max-w-2xl rounded-[3rem] p-10 border border-white/10 relative z-10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="bg-[#ff6b00] p-3 rounded-2xl text-white">
                                    <Database size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Bulk <span className="text-[#ff6b00]">Migration</span></h2>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Inject multiple records into core database</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsBulkModalOpen(false)}
                                className="p-2 text-slate-500 hover:text-white transition-colors"
                            >
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setBulkType('json')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border transition-all ${
                                        bulkType === 'json' ? 'bg-[#ff6b00] border-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/20' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
                                    }`}
                                >
                                    <FileJson size={16} /> JSON Data
                                </button>
                                <button
                                    onClick={() => setBulkType('csv')}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border transition-all ${
                                        bulkType === 'csv' ? 'bg-[#ff6b00] border-[#ff6b00] text-white shadow-lg shadow-[#ff6b00]/20' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
                                    }`}
                                >
                                    <FileSpreadsheet size={16} /> CSV String
                                </button>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Input String</label>
                                    <span className="text-[9px] text-[#ff6b00] font-bold uppercase tracking-tighter">
                                        {bulkType === 'json' ? '[ { "name": "...", "password": "...", "role": "student", "rollNumber": "..." }, ... ]' : 'name, password, role, rollNumber, employeeId, branch, section'}
                                    </span>
                                </div>
                                <textarea
                                    value={bulkData}
                                    onChange={(e) => setBulkData(e.target.value)}
                                    placeholder={bulkType === 'json' ? 'Paste JSON array here...' : 'Paste CSV lines here (include headers)...'}
                                    className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 text-white font-mono text-xs focus:ring-2 focus:ring-[#ff6b00]/50 outline-none transition-all h-64 resize-none"
                                />
                            </div>

                            {bulkResults && (
                                <div className={`p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in duration-300 ${
                                    bulkResults.failed === 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                                }`}>
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-black uppercase tracking-tight text-xs">Migration Complete</p>
                                        <p className="text-[10px] font-bold mt-1 uppercase tracking-widest">
                                            {bulkResults.success} Succeeded | {bulkResults.failed} Failed
                                        </p>
                                        {bulkResults.errors.length > 0 && (
                                            <ul className="mt-2 space-y-1 max-h-20 overflow-y-auto pr-2">
                                                {bulkResults.errors.slice(0, 5).map((err, i) => (
                                                    <li key={i} className="text-[9px] font-medium">• {err}</li>
                                                ))}
                                                {bulkResults.errors.length > 5 && <li className="text-[9px] font-medium">• ...and {bulkResults.errors.length - 5} more</li>}
                                            </ul>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => {
                                        setIsBulkModalOpen(false);
                                        setBulkResults(null);
                                        setBulkData('');
                                    }}
                                    className="flex-1 px-8 py-4 bg-white/5 text-slate-400 rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBulkUpload}
                                    disabled={isBulkUploading || !bulkData.trim()}
                                    className="flex-1 px-8 py-4 bg-[#ff6b00] text-white rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-orange-500 shadow-lg shadow-orange-500/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    {isBulkUploading ? <Loader2 className="animate-spin" size={16} /> : <><Database size={16} /> Initiate Migration</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setDeleteId(null)}></div>
                    <div className="bg-[#1e293b] w-full max-w-md rounded-[2.5rem] p-10 border border-white/10 relative z-10 shadow-2xl animate-in zoom-in duration-300 text-center">
                        <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                            <Trash2 size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-2">Purge <span className="text-red-500">Record?</span></h2>
                        <p className="text-slate-400 text-sm font-medium mb-10 uppercase tracking-widest leading-relaxed">This action will permanently erase the agent from the secure database. This cannot be undone.</p>
                        
                        <div className="flex gap-4">
                            <button
                                onClick={() => setDeleteId(null)}
                                className="flex-1 px-8 py-4 bg-white/5 text-slate-400 rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
                            >
                                Abort
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 px-8 py-4 bg-red-600 text-white rounded-2xl font-black italic uppercase tracking-widest text-xs hover:bg-red-500 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                            >
                                Confirm Purge
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}


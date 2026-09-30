'use client';
import { useState, useEffect, FormEvent } from 'react';

type ModalMode = 'NEW_FORM' | 'EDIT_FORM' | 'ADD_EXAM' | 'EDIT_EXAM' | 'MANAGE_FORM_DOCS' | 'MANAGE_STAGE_DOCS' | null;

interface DocLink {
  title: string;
  url: string;
}

export default function Home() {
  const [exams, setExams] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [activeExam, setActiveExam] = useState<any>(null);
  const [activeStageIndex, setActiveStageIndex] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  // Dedicated state for the Document Manager Modal
  const [tempDocs, setTempDocs] = useState<DocLink[]>([]);
  const [newDoc, setNewDoc] = useState({ title: '', url: '' });

  const [formDetails, setFormDetails] = useState({
    examName: '', portalId: '', portalPassword: '', formFillDate: '', formLastDate: '', amountPaid: 0
  });

  const [stageData, setStageData] = useState({
    stageName: '', examDate: '', status: 'Waiting for Exam', remarks: ''
  });

  useEffect(() => { fetchExams(); }, []);

  const fetchExams = async () => {
    try {
      const res = await fetch('/api/exams');
      const json = await res.json();
      setExams(json.data || []); 
    } catch (error) {
      setExams([]);
    }
  };

  const openModal = (mode: ModalMode, exam: any = null, stageIndex: number | null = null) => {
    setModalMode(mode);
    setActiveExam(exam);
    setActiveStageIndex(stageIndex);
    setNewDoc({ title: '', url: '' });

    if (mode === 'NEW_FORM') {
      setFormDetails({ examName: '', portalId: '', portalPassword: '', formFillDate: '', formLastDate: '', amountPaid: 0 });
    } else if (mode === 'EDIT_FORM' && exam) {
      setFormDetails({
        examName: exam.examName,
        portalId: exam.portalId || '',
        portalPassword: exam.portalPassword || '',
        formFillDate: exam.formFillDate ? new Date(exam.formFillDate).toISOString().split('T')[0] : '',
        formLastDate: exam.formLastDate ? new Date(exam.formLastDate).toISOString().split('T')[0] : '',
        amountPaid: exam.amountPaid
      });
    } else if (mode === 'ADD_EXAM') {
      setStageData({ stageName: '', examDate: '', status: 'Waiting for Exam', remarks: '' });
    } else if (mode === 'EDIT_EXAM' && exam && stageIndex !== null) {
      const targetStage = exam.stages[stageIndex];
      setStageData({
        stageName: targetStage.stageName,
        examDate: targetStage.examDate ? new Date(targetStage.examDate).toISOString().split('T')[0] : '',
        status: targetStage.status || 'Waiting for Exam',
        remarks: targetStage.remarks || ''
      });
    } else if (mode === 'MANAGE_FORM_DOCS' && exam) {
      setTempDocs(exam.documents || []);
    } else if (mode === 'MANAGE_STAGE_DOCS' && exam && stageIndex !== null) {
      setTempDocs(exam.stages[stageIndex].documents || []);
    }
  };

  const handleAddTempDoc = () => {
    if (!newDoc.title || !newDoc.url) return;
    let safeUrl = newDoc.url;
    if (!/^https?:\/\//i.test(safeUrl)) safeUrl = 'https://' + safeUrl;
    setTempDocs([...tempDocs, { title: newDoc.title, url: safeUrl }]);
    setNewDoc({ title: '', url: '' });
  };

  const handleRemoveTempDoc = (index: number) => {
    const docs = [...tempDocs];
    docs.splice(index, 1);
    setTempDocs(docs);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    let endpoint = '/api/exams';
    let method = 'POST';
    let payload: any;

    if (modalMode === 'NEW_FORM') {
      payload = { ...formDetails, stages: [] };
      if (!payload.formFillDate) delete payload.formFillDate;
    } else if (modalMode === 'EDIT_FORM') {
      endpoint = `/api/exams/${activeExam._id}`;
      method = 'PUT';
      payload = { ...formDetails };
      if (!payload.formFillDate) delete payload.formFillDate;
    } else if (modalMode === 'MANAGE_FORM_DOCS') {
      endpoint = `/api/exams/${activeExam._id}`;
      method = 'PUT';
      payload = { documents: tempDocs };
    } else {
      endpoint = `/api/exams/${activeExam._id}`;
      method = 'PUT';
      
      if (modalMode === 'ADD_EXAM') {
        const formattedStage = { ...stageData };
        if (!formattedStage.examDate) delete (formattedStage as any).examDate;
        payload = { stages: [...activeExam.stages, formattedStage] };
      } else if (modalMode === 'EDIT_EXAM' && activeStageIndex !== null) {
        const formattedStage = { ...stageData };
        if (!formattedStage.examDate) delete (formattedStage as any).examDate;
        const updatedStages = [...activeExam.stages];
        (formattedStage as any).documents = updatedStages[activeStageIndex].documents;
        updatedStages[activeStageIndex] = formattedStage;
        payload = { stages: updatedStages };
      } else if (modalMode === 'MANAGE_STAGE_DOCS' && activeStageIndex !== null) {
        const updatedStages = [...activeExam.stages];
        updatedStages[activeStageIndex].documents = tempDocs;
        payload = { stages: updatedStages };
      }
    }

    const res = await fetch(endpoint, {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    
    if (res.ok) {
      setModalMode(null);
      fetchExams();
    } else {
      const err = await res.json();
      alert(`Error saving: ${err.error || 'Unknown error'}`);
    }
  };

  const handleDeleteForm = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this entire form and all its exams?')) {
      const res = await fetch(`/api/exams/${id}`, { method: 'DELETE' });
      if (res.ok) fetchExams();
    }
  };

  const handleDeleteStage = async (examId: string, stageIndex: number) => {
    if (confirm('Are you sure you want to delete this specific exam?')) {
      const targetExam = exams.find(e => e._id === examId);
      if (!targetExam) return;
      const updatedStages = targetExam.stages.filter((_: any, index: number) => index !== stageIndex);
      const res = await fetch(`/api/exams/${examId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stages: updatedStages }),
      });
      if (res.ok) fetchExams();
    }
  };

  const togglePasswordVisibility = (id: string) => setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  const filteredExams = exams.filter(exam => exam.examName.toLowerCase().includes(searchQuery.toLowerCase()));

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'Cleared': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20';
      case 'Not Cleared': return 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20';
      case 'Waiting for Exam': return 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/20';
      case 'Pending Result': return 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20';
      default: return 'bg-slate-100 text-slate-700 ring-1 ring-slate-600/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans pb-12">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">ExamTrack</h1>
          </div>
          
          <div className="flex w-full sm:w-auto gap-3">
            <div className="relative w-full sm:w-72">
              <input 
                type="text" placeholder="Search applications..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              />
              <svg className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <button onClick={() => openModal('NEW_FORM')} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-sm text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New App
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredExams.map((exam) => {
            const hasExams = exam.stages.length > 0;
            const lastStage = hasExams ? exam.stages[exam.stages.length - 1] : null;
            const isCleared = lastStage?.status === 'Cleared';

            return (
              <div key={exam._id} className="bg-white rounded-2xl shadow-[0_2px_12px_rgb(0,0,0,0.04)] border border-slate-200 overflow-hidden flex flex-col relative transition-all hover:shadow-[0_8px_24px_rgb(0,0,0,0.06)]">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                
                {/* Root Form Info */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                  <div className="w-full">
                    <div className="flex justify-between items-start mb-3">
                      <h2 className="text-xl font-bold text-slate-900 leading-tight pr-4">{exam.examName}</h2>
                      
                      {/* ACTION BUTTONS (Docs | Edit | Delete) */}
                      <div className="flex gap-2">
                        <button onClick={() => openModal('MANAGE_FORM_DOCS', exam)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Manage Documents">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                        </button>
                        <button onClick={() => openModal('EDIT_FORM', exam)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Form">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteForm(exam._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Form">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600 mb-4">
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        {exam.formLastDate && <span className="font-medium text-rose-600">Last Date: {new Date(exam.formLastDate).toLocaleDateString()}</span>}
                        {exam.formFillDate && <span className="text-slate-400 text-xs ml-1">(Filled: {new Date(exam.formFillDate).toLocaleDateString()})</span>}
                      </div>
                      <div className="flex items-center gap-1.5"><svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg> ₹{exam.amountPaid}</div>
                    </div>

                    {(exam.portalId || exam.portalPassword) && (
                      <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-wrap gap-4 text-sm mb-3">
                        {exam.portalId && <div className="flex flex-col"><span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Portal ID</span><span className="font-medium text-slate-700">{exam.portalId}</span></div>}
                        {exam.portalPassword && (
                          <div className="flex flex-col">
                            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Password</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700 font-mono tracking-tight">{showPassword[exam._id] ? exam.portalPassword : '••••••••'}</span>
                              <button onClick={() => togglePasswordVisibility(exam._id)} className="text-blue-500 hover:text-blue-700">{showPassword[exam._id] ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {exam.documents && exam.documents.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {exam.documents.map((doc: any, i: number) => (
                          <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:text-blue-800 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            {doc.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Nested Exams Info */}
                <div className="p-6 space-y-4 flex-1 bg-slate-50/50">
                  {!hasExams && <div className="text-center py-6 text-sm text-slate-400">No exam stages mapped yet.</div>}
                  {exam.stages.map((stage: any, index: number) => (
                    <div key={index} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative group">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-800">{stage.stageName}</h3>
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusStyles(stage.status)}`}>{stage.status}</span>
                      </div>
                      
                      {stage.examDate && (
                        <div className="text-sm text-slate-500 mb-2 flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          Exam: {new Date(stage.examDate).toLocaleDateString()}
                        </div>
                      )}
                      
                      {stage.remarks && <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-2 mb-2">{stage.remarks}</div>}
                      
                      {stage.documents && stage.documents.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {stage.documents.map((doc: any, i: number) => (
                            <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 text-indigo-700 hover:text-indigo-800 text-xs font-semibold rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                              {doc.title}
                            </a>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex gap-4 mt-3 pt-3 border-t border-slate-50">
                        <button onClick={() => openModal('MANAGE_STAGE_DOCS', exam, index)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium flex items-center gap-1">Docs</button>
                        <button onClick={() => openModal('EDIT_EXAM', exam, index)} className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center gap-1">Edit</button>
                        <button onClick={() => handleDeleteStage(exam._id, index)} className="text-rose-500 hover:text-rose-700 text-xs font-medium flex items-center gap-1">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-5 border-t border-slate-100 bg-white mt-auto">
                  {!hasExams ? (
                     <button onClick={() => openModal('ADD_EXAM', exam)} className="w-full py-2.5 border border-slate-300 text-slate-700 bg-white rounded-xl hover:bg-slate-50 hover:border-slate-400 font-medium transition-all shadow-sm">+ Add Exam Stage</button>
                  ) : isCleared ? (
                    <button onClick={() => openModal('ADD_EXAM', exam)} className="w-full py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-100 font-medium transition-all">+ Add Next Stage</button>
                  ) : (
                    <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-500">Clear current exam to unlock next stage</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal / Dialog Overlay */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setModalMode(null)}></div>
          
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden transform transition-all max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-800">
                {modalMode === 'NEW_FORM' && 'Create New Application'}
                {modalMode === 'EDIT_FORM' && 'Edit Application Details'}
                {modalMode === 'ADD_EXAM' && 'Add Exam Stage'}
                {modalMode === 'EDIT_EXAM' && 'Update Exam Stage'}
                {modalMode === 'MANAGE_FORM_DOCS' && 'Manage Application Documents'}
                {modalMode === 'MANAGE_STAGE_DOCS' && 'Manage Exam Documents'}
              </h2>
              <button onClick={() => setModalMode(null)} className="text-slate-400 hover:text-slate-600 bg-white p-1 rounded-md shadow-sm border border-slate-200"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="tracker-form" onSubmit={handleSubmit} className="space-y-5">
                
                {/* --- MODE 1 & 2: FORM FILLUP --- */}
                {(modalMode === 'NEW_FORM' || modalMode === 'EDIT_FORM') && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam / Recruitment Name *</label>
                      <input type="text" required value={formDetails.examName} onChange={e => setFormDetails({...formDetails, examName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Portal ID (Optional)</label>
                        <input type="text" value={formDetails.portalId} onChange={e => setFormDetails({...formDetails, portalId: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password (Optional)</label>
                        <input type="text" value={formDetails.portalPassword} onChange={e => setFormDetails({...formDetails, portalPassword: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Last Date *</label>
                        <input type="date" required value={formDetails.formLastDate} onChange={e => setFormDetails({...formDetails, formLastDate: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Fill Date (Optional)</label>
                        <input type="date" value={formDetails.formFillDate} onChange={e => setFormDetails({...formDetails, formFillDate: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Amount Paid (₹) *</label>
                        <input type="number" required value={formDetails.amountPaid} onChange={e => setFormDetails({...formDetails, amountPaid: Number(e.target.value)})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                      </div>
                    </div>
                  </>
                )}

                {/* --- MODE 3 & 4: EXAM STAGES --- */}
                {(modalMode === 'ADD_EXAM' || modalMode === 'EDIT_EXAM') && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Stage Name *</label>
                      <input type="text" required value={stageData.stageName} onChange={e => setStageData({...stageData, stageName: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Exam Date (Optional)</label>
                      <input type="date" value={stageData.examDate} onChange={e => setStageData({...stageData, examDate: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Status</label>
                      <select value={stageData.status} onChange={e => setStageData({...stageData, status: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all">
                        <option value="Waiting for Exam">Waiting for Exam</option>
                        <option value="Pending Result">Pending Result</option>
                        <option value="Cleared">Cleared</option>
                        <option value="Not Cleared">Not Cleared</option>
                        <option value="Not Appeared">Not Appeared</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks (Optional)</label>
                      <textarea rows={2} value={stageData.remarks} onChange={e => setStageData({...stageData, remarks: e.target.value})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none" />
                    </div>
                  </>
                )}

                {/* --- MODE 5 & 6: STANDALONE DOCUMENT MANAGER --- */}
                {(modalMode === 'MANAGE_FORM_DOCS' || modalMode === 'MANAGE_STAGE_DOCS') && (
                  <div className="space-y-4">
                    <p className="text-sm text-slate-500 mb-4">Add or remove document links (e.g., Google Drive PDFs) for this {modalMode === 'MANAGE_FORM_DOCS' ? 'application' : 'exam stage'}.</p>
                    
                    {/* Render Existing Links in Modal */}
                    <div className="space-y-2 mb-3">
                      {tempDocs.length === 0 && <p className="text-sm text-slate-400 italic">No documents attached yet.</p>}
                      {tempDocs.map((doc, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 px-3 py-2 border border-slate-200 rounded-lg text-sm">
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium truncate pr-4">{doc.title}</a>
                          <button type="button" onClick={() => handleRemoveTempDoc(i)} className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add New Link Form */}
                    <div className="flex gap-2 items-start mt-4 pt-4 border-t border-slate-100">
                      <div className="flex-1 space-y-2">
                        <input type="text" placeholder="Document Title (e.g. Admit Card)" value={newDoc.title} onChange={e => setNewDoc({...newDoc, title: e.target.value})} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                        <input type="url" placeholder="Drive URL (https://...)" value={newDoc.url} onChange={e => setNewDoc({...newDoc, url: e.target.value})} className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <button type="button" onClick={handleAddTempDoc} className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 h-[80px] transition-colors">Add</button>
                    </div>
                  </div>
                )}
              </form>
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button type="button" onClick={() => setModalMode(null)} className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors">Cancel</button>
              <button form="tracker-form" type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-colors">Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
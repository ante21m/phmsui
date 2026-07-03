'use client';
import React, { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { MdAdd, MdEdit, MdDelete, MdClose, MdSave, MdVisibility, MdCheckCircle } from 'react-icons/md';
import { SmartTable, type SmartColumn } from '@/components';
import {
  useGetApprovalWorkflowsQuery,
  useCreateApprovalWorkflowMutation,
  useUpdateApprovalWorkflowMutation,
  useDeleteApprovalWorkflowMutation,
  useToggleApprovalWorkflowActiveMutation,
  type ApprovalWorkflow,
  type ApprovalWorkflowPayload,
  type WorkflowStep,
} from '@/store/services/workflowApi';
import styles from './WorkflowManagement.module.css';

const ROLE_OPTIONS = [
  'employee', 'procurement-officer',
  'department-head', 'hr-manager', 'pharmacist', 'pharmacy-inventory-officer',
  'central-supply-technician', 'hospital-inventory-officer', 'hospital-manager',
];

const emptyStep = (): WorkflowStep => ({
  stepOrder: 1, stepName: '', role: '', canModifyQuantity: false, isRequired: true,
});

type PanelMode = 'create' | 'edit' | null;

export default function WorkflowManagementPage() {
  const { data, isLoading } = useGetApprovalWorkflowsQuery({});
  const workflows = data?.data ?? [];

  const [createWorkflow] = useCreateApprovalWorkflowMutation();
  const [updateWorkflow] = useUpdateApprovalWorkflowMutation();
  const [deleteWorkflow] = useDeleteApprovalWorkflowMutation();
  const [toggleActive] = useToggleApprovalWorkflowActiveMutation();

  // Modal for viewing steps
  const [viewingSteps, setViewingSteps] = useState<ApprovalWorkflow | null>(null);

  // Panel state
  const [panelMode, setPanelMode] = useState<PanelMode>(null);
  const [editTarget, setEditTarget] = useState<ApprovalWorkflow | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [moduleName, setModuleName] = useState('');
  const [workflowName, setWorkflowName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<WorkflowStep[]>([{ ...emptyStep(), stepOrder: 1 }]);

  const resetForm = () => {
    setModuleName(''); setWorkflowName(''); setDescription(''); setIsActive(true);
    setSteps([{ ...emptyStep(), stepOrder: 1 }]);
  };

  const openCreate = () => {
    resetForm(); setPanelMode('create'); setEditTarget(null);
  };

  const openEdit = (wf: ApprovalWorkflow) => {
    setEditTarget(wf);
    setModuleName(wf.moduleName);
    setWorkflowName(wf.workflowName);
    setDescription(wf.description ?? '');
    setIsActive(wf.isActive);
    setSteps(wf.steps?.length ? wf.steps.map(s => ({ ...s })) : [{ ...emptyStep(), stepOrder: 1 }]);
    setPanelMode('edit');
  };

  const closePanel = () => { setPanelMode(null); setEditTarget(null); resetForm(); };

  const addStep = () => {
    setSteps(prev => [...prev, { ...emptyStep(), stepOrder: prev.length + 1 }]);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 1) return;
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepOrder: i + 1 })));
  };

  const updateStepField = (idx: number, field: keyof WorkflowStep, value: any) => {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSave = async () => {
    if (!moduleName.trim()) { toast.error('Module name is required'); return; }
    if (!workflowName.trim()) { toast.error('Workflow name is required'); return; }
    if (steps.some(s => !s.stepName.trim())) { toast.error('Step name is required for all steps'); return; }
    if (steps.some(s => !s.role)) { toast.error('Role is required for all steps'); return; }

    setSaving(true);
    try {
      const payload: ApprovalWorkflowPayload = {
        moduleName: moduleName.trim(),
        workflowName: workflowName.trim(),
        description: description.trim(),
        isActive,
        steps: steps.map((s, i) => ({ ...s, stepOrder: i + 1 })),
      };

      if (panelMode === 'edit' && editTarget) {
        await updateWorkflow({ id: editTarget.id, body: payload }).unwrap();
        toast.success('Workflow updated');
      } else {
        await createWorkflow(payload).unwrap();
        toast.success('Workflow created');
      }
      closePanel();
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save workflow');
    } finally { setSaving(false); }
  };

  const handleDelete = async (wf: ApprovalWorkflow) => {
    if (!window.confirm(`Delete workflow "${wf.workflowName}"? This cannot be undone.`)) return;
    try {
      await deleteWorkflow(wf.id).unwrap();
      toast.success('Workflow deleted');
    } catch { toast.error('Failed to delete workflow'); }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleActive(id).unwrap();
      toast.success('Status toggled');
    } catch { toast.error('Failed to toggle status'); }
  };

  const statusBadge = (wf: ApprovalWorkflow) => {
    const isActive = wf.isActive && (wf.steps?.length ?? 0) > 0;
    return (
      <span
        className={`${styles.badge} ${isActive ? styles.badgeGreen : styles.badgeGray}`}
        onClick={() => handleToggle(wf.id)}
        style={{ cursor: 'pointer' }}
        title="Click to toggle"
      >
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const columns = useMemo<SmartColumn<ApprovalWorkflow>[]>(
    () => [
      {
        accessor: 'moduleName',
        header: 'Module Name',
        sortable: true,
      },
      {
        accessor: 'workflowName',
        header: 'Workflow Name',
        sortable: true,
      },
      {
        header: 'Description',
        render: (row) => <span style={{ color: 'var(--gray-500)', fontSize: 12 }}>{row.description || '—'}</span>,
      },
      {
        header: 'Steps',
        render: (row) => (
          <span className={`${styles.badge} ${styles.badgeViolet}`}>
            {row.steps?.length ?? 0} step{(row.steps?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        ),
      },
      {
        accessor: 'isActive',
        header: 'Status',
        sortable: true,
        render: (row) => statusBadge(row),
      },
      {
        header: 'Actions',
        textAlign: 'center',
        render: (row) => (
          <span className={styles.actionBtns}>
            <button className={styles.viewBtn} onClick={() => setViewingSteps(row)} title="View Steps"><MdVisibility size={14} /></button>
            <button className={styles.editBtn} onClick={() => openEdit(row)} title="Edit"><MdEdit size={14} /></button>
            <button className={styles.deleteBtn} onClick={() => handleDelete(row)} title="Delete"><MdDelete size={14} /></button>
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <div className={styles.page}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <SmartTable
            title="Approval Workflows"
            data={workflows}
            columns={columns}
            isLoading={isLoading}
            rowKey={(row) => row.id}
            withSearch withPagination withRowNumbers
            defaultPageSize={25}
            emptyMessage="No workflows found."
            headerAction={
              <button className={styles.addBtn} onClick={openCreate}><MdAdd /> New Workflow</button>
            }
            classNames={{
              pageHeader: styles.customPageHeader,
              headerAction: styles.customHeaderAction,
            }}
          />
        </div>

      {/* Steps Modal */}
        {panelMode && (
          <div className={styles.panel}>
            <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>
              {panelMode === 'edit' ? 'Edit Approval Workflow' : 'New Approval Workflow'}
            </h3>

            <div className={styles.sectionCard}>
              <div className={styles.sectionTitle}>Workflow Definition</div>
              <div className={styles.formGroup}>
                <label>Module Name <span style={{ color: 'red' }}>*</span></label>
                <input value={moduleName} onChange={e => setModuleName(e.target.value)} placeholder="Enter module name" />
              </div>
              <div className={styles.formGroup}>
                <label>Workflow Name <span style={{ color: 'red' }}>*</span></label>
                <input value={workflowName} onChange={e => setWorkflowName(e.target.value)} placeholder="Enter workflow name" />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Enter description" />
              </div>
              <div className={styles.formGroup}>
                <div className={styles.checkboxRow}>
                  <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
                  <label htmlFor="isActive" style={{ margin: 0 }}>Active</label>
                </div>
              </div>
            </div>

            <div className={styles.sectionCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className={styles.sectionTitle} style={{ margin: 0 }}>Approval Steps</div>
                <button className={styles.submitBtn} onClick={addStep}><MdAdd size={13} /> Add Step</button>
              </div>
              {steps.map((step, idx) => (
                <div key={idx} className={styles.sectionCard} style={{ background: 'var(--gray-50)', padding: 12, marginBottom: 8 }}>
                  <div className={styles.stepHeader}>
                    <div className={styles.stepBadge}>
                      <span className={styles.stepNum}>{idx + 1}</span>
                      <span className={styles.stepName}>{step.stepName || `Step ${idx + 1}`}</span>
                    </div>
                    <button className={styles.deleteBtn} disabled={steps.length === 1}
                      onClick={() => removeStep(idx)} style={{ padding: '2px 6px', opacity: steps.length === 1 ? 0.4 : 1 }}>
                      <MdDelete size={14} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <div className={styles.formGroup} style={{ flex: 1, margin: 0 }}>
                      <label>Step Name <span style={{ color: 'red' }}>*</span></label>
                      <input value={step.stepName} onChange={e => updateStepField(idx, 'stepName', e.target.value)}
                        placeholder="e.g. Department Head Approval" style={{ fontSize: 12, padding: '6px 8px' }} />
                    </div>
                    <div className={styles.formGroup} style={{ flex: 1, margin: 0 }}>
                      <label>Role <span style={{ color: 'red' }}>*</span></label>
                      <select value={step.role} onChange={e => updateStepField(idx, 'role', e.target.value)} style={{ fontSize: 12, padding: '6px 8px' }} aria-label="Role">
                        <option value="">Select role</option>
                        {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, paddingTop: 4 }}>
                    <div className={styles.checkboxRow}>
                      <input type="checkbox" id={`canModify-${idx}`} checked={step.canModifyQuantity}
                        onChange={e => updateStepField(idx, 'canModifyQuantity', e.target.checked)} />
                      <label htmlFor={`canModify-${idx}`} style={{ margin: 0, fontSize: 12 }}>Can Modify Quantity</label>
                    </div>
                    <div className={styles.checkboxRow}>
                      <input type="checkbox" id={`isRequired-${idx}`} checked={step.isRequired}
                        onChange={e => updateStepField(idx, 'isRequired', e.target.checked)} />
                      <label htmlFor={`isRequired-${idx}`} style={{ margin: 0, fontSize: 12 }}>Required</label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.formActions}>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                <MdSave /> {saving ? 'Saving...' : (panelMode === 'edit' ? 'Update' : 'Save')}
              </button>
              <button className={styles.cancelBtn} onClick={closePanel} disabled={saving}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {viewingSteps && (
        <div className={styles.modalOverlay} onClick={() => setViewingSteps(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Steps — {viewingSteps.workflowName}</h3>
              <button className={styles.modalCloseBtn} onClick={() => setViewingSteps(null)}><MdClose /></button>
            </div>
            <div className={styles.modalBody}>
              {viewingSteps.steps?.length ? (
                <table className={styles.stepTable}>
                  <thead>
                    <tr>
                      <th style={{ width: 30 }}>#</th>
                      <th>Step Name</th>
                      <th>Role</th>
                      <th style={{ width: 120 }}>Can Modify Qty</th>
                      <th style={{ width: 90 }}>Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...viewingSteps.steps]
                      .sort((a, b) => a.stepOrder - b.stepOrder)
                      .map(step => (
                        <tr key={step.id || step.stepOrder}>
                          <td style={{ color: 'var(--gray-500)' }}>{step.stepOrder}</td>
                          <td style={{ fontWeight: 500 }}>{step.stepName}</td>
                          <td><span className={`${styles.badge} ${styles.badgeViolet}`}>{step.role}</span></td>
                          <td>
                            <span className={`${styles.badge} ${step.canModifyQuantity ? styles.badgeTeal : styles.badgeGray}`}>
                              {step.canModifyQuantity ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`${styles.badge} ${step.isRequired ? styles.badgeOrange : styles.badgeGray}`}>
                              {step.isRequired ? 'Required' : 'Optional'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              ) : (
                <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>No steps defined.</span>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setViewingSteps(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

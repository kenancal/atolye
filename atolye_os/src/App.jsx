import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { supabase } from './lib/supabaseClient';

const ASSET_BUCKET = 'project-assets';

const emptyProjectForm = {
  title: '',
  description: '',
  status: 'Fikir',
  category: 'Mobil Uygulama',
  priority: 'Orta',
  progress: 0,
  targetDate: '',
  estimatedBudget: '',
  spentBudget: '',
  nextAction: '',
  logo: '',
  bannerClass: 'bannerEmerald',
};

const statusFilters = ['Tümü', 'Fikir', 'Araştırma', 'Prototip', 'MVP', 'Yayında', 'Beklemede'];

const categoryOptions = [
  'Mobil Uygulama',
  'Web Uygulama',
  'Yapay Zeka',
  'Enerji',
  'Donanım',
  'Marka',
  'Hizmet',
  'Diğer',
];

const statusOptions = [
  'Fikir',
  'Araştırma',
  'Fizibilite',
  'Tasarım',
  'Prototip',
  'MVP',
  'Test',
  'Yayında',
  'Beklemede',
  'İptal',
];

const priorityOptions = ['Düşük', 'Orta', 'Yüksek', 'Kritik'];

const roadmapStatusOptions = ['Planlandı', 'Devam Ediyor', 'Tamamlandı'];

const domainStatusOptions = ['Araştırılıyor', 'Müsait', 'Alındı', 'Müsait Değil'];

const emptyBrandForm = {
  domain: '',
  domain_status: 'Araştırılıyor',
  slogan: '',
  primary_color: '#10b981',
  notes: '',
};

const bannerOptions = [
  { label: 'Zümrüt', value: 'bannerEmerald' },
  { label: 'Amber', value: 'bannerAmber' },
  { label: 'Slate', value: 'bannerSlate' },
  { label: 'Mavi', value: 'bannerBlue' },
];

const detailTabs = [
  'Genel Bakış',
  'Görevler',
  'Bütçe',
  'Dosyalar',
  'Notlar',
  'Marka & Domain',
  'Rakipler',
  'Yol Haritası',
];

function formatDateForCard(dateValue) {
  if (!dateValue) return 'Belirlenmedi';

  const [year, month, day] = dateValue.split('-');
  if (!year || !month || !day) return dateValue;

  return `${day}.${month}.${year}`;
}

function formatDateForInput(dateValue) {
  if (!dateValue || dateValue === 'Belirlenmedi') return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;

  const [day, month, year] = dateValue.split('.');
  if (!day || !month || !year) return '';

  return `${year}-${month}-${day}`;
}

function parseBudget(value) {
  const normalizedValue = String(value || '')
    .replaceAll('.', '')
    .replace(',', '.')
    .replace(/tl/gi, '')
    .trim();

  const parsedValue = Number(normalizedValue);

  if (Number.isNaN(parsedValue)) return 0;

  return parsedValue;
}

function formatBudget(value) {
  const numericValue = Number(value || 0);

  return `${new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
  }).format(numericValue)} TL`;
}

function formatBudgetForInput(value) {
  return String(value || '')
    .replace(/\s?TL/gi, '')
    .replaceAll('.', '')
    .trim();
}

function getFileExtension(fileName) {
  return fileName.split('.').pop()?.toLowerCase() || 'png';
}

function formatFileSize(bytes) {
  const numericBytes = Number(bytes || 0);
  if (numericBytes < 1024) return `${numericBytes} B`;
  if (numericBytes < 1024 * 1024) return `${(numericBytes / 1024).toFixed(1)} KB`;
  return `${(numericBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStoragePathFromUrl(publicUrl) {
  if (!publicUrl) return '';

  const marker = `/${ASSET_BUCKET}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return '';

  return publicUrl.slice(markerIndex + marker.length).split('?')[0];
}

function mapProjectFromDatabase(project) {
  return {
    id: project.id,
    title: project.title,
    description: project.description || 'Kısa açıklama henüz eklenmedi.',
    status: project.status || 'Fikir',
    category: project.category || 'Diğer',
    priority: project.priority || 'Orta',
    progress: Number(project.progress || 0),
    targetDate: formatDateForCard(project.target_date),
    estimatedBudget: formatBudget(project.estimated_budget),
    spentBudget: formatBudget(project.spent_budget),
    nextAction: project.next_action || 'Sonraki adım henüz belirlenmedi.',
    logo: project.logo_text || project.title?.charAt(0)?.toLocaleUpperCase('tr-TR') || 'P',
    bannerClass: project.banner_class || 'bannerEmerald',
    logoUrl: project.logo_url || '',
    bannerUrl: project.banner_url || '',
  };
}

function App() {
  const [projects, setProjects] = useState([]);
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingProjectId, setEditingProjectId] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [appError, setAppError] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeDetailTab, setActiveDetailTab] = useState('Genel Bakış');
  const [assetMenu, setAssetMenu] = useState(null);
  const [assetPreview, setAssetPreview] = useState(null);
  const [brandLogo, setBrandLogo] = useState('A');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [projectTasks, setProjectTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState('');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [projectNotes, setProjectNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [roadmapItems, setRoadmapItems] = useState([]);
  const [roadmapLoading, setRoadmapLoading] = useState(false);
  const [roadmapError, setRoadmapError] = useState('');
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [projectFiles, setProjectFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [filesError, setFilesError] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [competitors, setCompetitors] = useState([]);
  const [competitorsLoading, setCompetitorsLoading] = useState(false);
  const [competitorsError, setCompetitorsError] = useState('');
  const [newCompetitor, setNewCompetitor] = useState({ name: '', url: '', notes: '' });
  const [isAddingCompetitor, setIsAddingCompetitor] = useState(false);
  const [brandForm, setBrandForm] = useState(emptyBrandForm);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState('');
  const [brandSaved, setBrandSaved] = useState(false);
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setAppError('');

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setAppError(`Projeler yüklenemedi: ${error.message}`);
      setProjects([]);
      setIsLoading(false);
      return;
    }

    setProjects((data || []).map(mapProjectFromDatabase));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchBrandLogo = useCallback(async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('brand_logo_url')
      .maybeSingle();

    if (error) {
      return;
    }

    setBrandLogoUrl(data?.brand_logo_url || '');
  }, []);

  useEffect(() => {
    fetchBrandLogo();
  }, [fetchBrandLogo]);

  const fetchTasks = useCallback(async (projectId) => {
    setTasksLoading(true);
    setTasksError('');

    const { data, error } = await supabase
      .from('project_tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) {
      setTasksError(`Görevler yüklenemedi: ${error.message}`);
      setProjectTasks([]);
      setTasksLoading(false);
      return;
    }

    setProjectTasks(data || []);
    setTasksLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject && activeDetailTab === 'Görevler') {
      fetchTasks(selectedProject.id);
    } else {
      setProjectTasks([]);
      setTasksError('');
      setNewTaskTitle('');
    }
  }, [selectedProject, activeDetailTab, fetchTasks]);

  async function handleAddTask(event) {
    event.preventDefault();

    const title = newTaskTitle.trim();
    if (!title || !selectedProject || isAddingTask) return;

    setIsAddingTask(true);
    setTasksError('');

    const { data, error } = await supabase
      .from('project_tasks')
      .insert({ project_id: selectedProject.id, title })
      .select()
      .single();

    if (error) {
      setTasksError(`Görev eklenemedi: ${error.message}`);
      setIsAddingTask(false);
      return;
    }

    setProjectTasks((current) => [...current, data]);
    setNewTaskTitle('');
    setIsAddingTask(false);
  }

  async function handleToggleTask(task) {
    const nextDone = !task.is_done;

    // Optimistic update; revert on failure.
    setProjectTasks((current) =>
      current.map((item) => (item.id === task.id ? { ...item, is_done: nextDone } : item))
    );

    const { error } = await supabase
      .from('project_tasks')
      .update({ is_done: nextDone })
      .eq('id', task.id);

    if (error) {
      setTasksError(`Görev güncellenemedi: ${error.message}`);
      setProjectTasks((current) =>
        current.map((item) => (item.id === task.id ? { ...item, is_done: task.is_done } : item))
      );
    }
  }

  async function handleDeleteTask(task) {
    const previousTasks = projectTasks;

    setProjectTasks((current) => current.filter((item) => item.id !== task.id));

    const { error } = await supabase.from('project_tasks').delete().eq('id', task.id);

    if (error) {
      setTasksError(`Görev silinemedi: ${error.message}`);
      setProjectTasks(previousTasks);
    }
  }

  const fetchNotes = useCallback(async (projectId) => {
    setNotesLoading(true);
    setNotesError('');

    const { data, error } = await supabase
      .from('project_notes')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      setNotesError(`Notlar yüklenemedi: ${error.message}`);
      setProjectNotes([]);
      setNotesLoading(false);
      return;
    }

    setProjectNotes(data || []);
    setNotesLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject && activeDetailTab === 'Notlar') {
      fetchNotes(selectedProject.id);
    } else {
      setProjectNotes([]);
      setNotesError('');
      setNewNoteContent('');
      setEditingNoteId(null);
      setEditingNoteContent('');
    }
  }, [selectedProject, activeDetailTab, fetchNotes]);

  async function handleAddNote(event) {
    event.preventDefault();

    const content = newNoteContent.trim();
    if (!content || !selectedProject || isAddingNote) return;

    setIsAddingNote(true);
    setNotesError('');

    const { data, error } = await supabase
      .from('project_notes')
      .insert({ project_id: selectedProject.id, content })
      .select()
      .single();

    if (error) {
      setNotesError(`Not eklenemedi: ${error.message}`);
      setIsAddingNote(false);
      return;
    }

    setProjectNotes((current) => [data, ...current]);
    setNewNoteContent('');
    setIsAddingNote(false);
  }

  function startEditNote(note) {
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  }

  function cancelEditNote() {
    setEditingNoteId(null);
    setEditingNoteContent('');
  }

  async function handleUpdateNote(note) {
    const content = editingNoteContent.trim();
    if (!content) return;

    setNotesError('');

    const { data, error } = await supabase
      .from('project_notes')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', note.id)
      .select()
      .single();

    if (error) {
      setNotesError(`Not güncellenemedi: ${error.message}`);
      return;
    }

    setProjectNotes((current) => current.map((item) => (item.id === note.id ? data : item)));
    cancelEditNote();
  }

  async function handleDeleteNote(note) {
    const previousNotes = projectNotes;

    setProjectNotes((current) => current.filter((item) => item.id !== note.id));

    const { error } = await supabase.from('project_notes').delete().eq('id', note.id);

    if (error) {
      setNotesError(`Not silinemedi: ${error.message}`);
      setProjectNotes(previousNotes);
    }
  }

  const fetchRoadmap = useCallback(async (projectId) => {
    setRoadmapLoading(true);
    setRoadmapError('');

    const { data, error } = await supabase
      .from('project_roadmap')
      .select('*')
      .eq('project_id', projectId)
      .order('target_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      setRoadmapError(`Yol haritası yüklenemedi: ${error.message}`);
      setRoadmapItems([]);
      setRoadmapLoading(false);
      return;
    }

    setRoadmapItems(data || []);
    setRoadmapLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject && activeDetailTab === 'Yol Haritası') {
      fetchRoadmap(selectedProject.id);
    } else {
      setRoadmapItems([]);
      setRoadmapError('');
      setNewMilestoneTitle('');
      setNewMilestoneDate('');
    }
  }, [selectedProject, activeDetailTab, fetchRoadmap]);

  async function handleAddMilestone(event) {
    event.preventDefault();

    const title = newMilestoneTitle.trim();
    if (!title || !selectedProject || isAddingMilestone) return;

    setIsAddingMilestone(true);
    setRoadmapError('');

    const { data, error } = await supabase
      .from('project_roadmap')
      .insert({
        project_id: selectedProject.id,
        title,
        target_date: newMilestoneDate || null,
      })
      .select()
      .single();

    if (error) {
      setRoadmapError(`Kilometre taşı eklenemedi: ${error.message}`);
      setIsAddingMilestone(false);
      return;
    }

    setRoadmapItems((current) =>
      [...current, data].sort((a, b) => (a.target_date || '9999').localeCompare(b.target_date || '9999'))
    );
    setNewMilestoneTitle('');
    setNewMilestoneDate('');
    setIsAddingMilestone(false);
  }

  async function handleUpdateMilestoneStatus(milestone, status) {
    setRoadmapItems((current) =>
      current.map((item) => (item.id === milestone.id ? { ...item, status } : item))
    );

    const { error } = await supabase
      .from('project_roadmap')
      .update({ status })
      .eq('id', milestone.id);

    if (error) {
      setRoadmapError(`Durum güncellenemedi: ${error.message}`);
      setRoadmapItems((current) =>
        current.map((item) => (item.id === milestone.id ? { ...item, status: milestone.status } : item))
      );
    }
  }

  async function handleDeleteMilestone(milestone) {
    const previousItems = roadmapItems;

    setRoadmapItems((current) => current.filter((item) => item.id !== milestone.id));

    const { error } = await supabase.from('project_roadmap').delete().eq('id', milestone.id);

    if (error) {
      setRoadmapError(`Kilometre taşı silinemedi: ${error.message}`);
      setRoadmapItems(previousItems);
    }
  }

  const fetchFiles = useCallback(async (projectId) => {
    setFilesLoading(true);
    setFilesError('');

    const { data, error } = await supabase
      .from('project_files')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      setFilesError(`Dosyalar yüklenemedi: ${error.message}`);
      setProjectFiles([]);
      setFilesLoading(false);
      return;
    }

    setProjectFiles(data || []);
    setFilesLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject && activeDetailTab === 'Dosyalar') {
      fetchFiles(selectedProject.id);
    } else {
      setProjectFiles([]);
      setFilesError('');
    }
  }, [selectedProject, activeDetailTab, fetchFiles]);

  function chooseAnyFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = () => {
        resolve(input.files?.[0] || null);
      };
      input.click();
    });
  }

  async function handleUploadProjectFile() {
    if (!selectedProject || isUploadingFile) return;

    const file = await chooseAnyFile();
    if (!file) return;

    setIsUploadingFile(true);
    setFilesError('');

    try {
      const publicUrl = await uploadFileToStorage(file, 'files');

      const { data, error } = await supabase
        .from('project_files')
        .insert({
          project_id: selectedProject.id,
          file_name: file.name,
          file_url: publicUrl,
          size_bytes: file.size,
        })
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      setProjectFiles((current) => [data, ...current]);
    } catch (error) {
      setFilesError(`Dosya yüklenemedi: ${error.message}`);
    } finally {
      setIsUploadingFile(false);
    }
  }

  async function handleDeleteProjectFile(fileRecord) {
    const previousFiles = projectFiles;

    setProjectFiles((current) => current.filter((item) => item.id !== fileRecord.id));

    const { error } = await supabase.from('project_files').delete().eq('id', fileRecord.id);

    if (error) {
      setFilesError(`Dosya silinemedi: ${error.message}`);
      setProjectFiles(previousFiles);
      return;
    }

    await removeFileFromStorage(fileRecord.file_url);
  }

  const fetchCompetitors = useCallback(async (projectId) => {
    setCompetitorsLoading(true);
    setCompetitorsError('');

    const { data, error } = await supabase
      .from('project_competitors')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      setCompetitorsError(`Rakipler yüklenemedi: ${error.message}`);
      setCompetitors([]);
      setCompetitorsLoading(false);
      return;
    }

    setCompetitors(data || []);
    setCompetitorsLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject && activeDetailTab === 'Rakipler') {
      fetchCompetitors(selectedProject.id);
    } else {
      setCompetitors([]);
      setCompetitorsError('');
      setNewCompetitor({ name: '', url: '', notes: '' });
    }
  }, [selectedProject, activeDetailTab, fetchCompetitors]);

  async function handleAddCompetitor(event) {
    event.preventDefault();

    const name = newCompetitor.name.trim();
    if (!name || !selectedProject || isAddingCompetitor) return;

    setIsAddingCompetitor(true);
    setCompetitorsError('');

    const { data, error } = await supabase
      .from('project_competitors')
      .insert({
        project_id: selectedProject.id,
        name,
        url: newCompetitor.url.trim() || null,
        notes: newCompetitor.notes.trim() || null,
      })
      .select()
      .single();

    if (error) {
      setCompetitorsError(`Rakip eklenemedi: ${error.message}`);
      setIsAddingCompetitor(false);
      return;
    }

    setCompetitors((current) => [data, ...current]);
    setNewCompetitor({ name: '', url: '', notes: '' });
    setIsAddingCompetitor(false);
  }

  async function handleDeleteCompetitor(competitor) {
    const previousCompetitors = competitors;

    setCompetitors((current) => current.filter((item) => item.id !== competitor.id));

    const { error } = await supabase.from('project_competitors').delete().eq('id', competitor.id);

    if (error) {
      setCompetitorsError(`Rakip silinemedi: ${error.message}`);
      setCompetitors(previousCompetitors);
    }
  }

  const fetchBrand = useCallback(async (projectId) => {
    setBrandLoading(true);
    setBrandError('');
    setBrandSaved(false);

    const { data, error } = await supabase
      .from('project_brand')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();

    if (error) {
      setBrandError(`Marka bilgisi yüklenemedi: ${error.message}`);
      setBrandForm(emptyBrandForm);
      setBrandLoading(false);
      return;
    }

    if (data) {
      setBrandForm({
        domain: data.domain || '',
        domain_status: data.domain_status || 'Araştırılıyor',
        slogan: data.slogan || '',
        primary_color: data.primary_color || '#10b981',
        notes: data.notes || '',
      });
    } else {
      setBrandForm(emptyBrandForm);
    }

    setBrandLoading(false);
  }, []);

  useEffect(() => {
    if (selectedProject && activeDetailTab === 'Marka & Domain') {
      fetchBrand(selectedProject.id);
    } else {
      setBrandForm(emptyBrandForm);
      setBrandError('');
      setBrandSaved(false);
    }
  }, [selectedProject, activeDetailTab, fetchBrand]);

  function updateBrandForm(field, value) {
    setBrandSaved(false);
    setBrandForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSaveBrand(event) {
    event.preventDefault();

    if (!selectedProject || isSavingBrand) return;

    setIsSavingBrand(true);
    setBrandError('');
    setBrandSaved(false);

    const { error } = await supabase.from('project_brand').upsert(
      {
        project_id: selectedProject.id,
        domain: brandForm.domain.trim() || null,
        domain_status: brandForm.domain_status,
        slogan: brandForm.slogan.trim() || null,
        primary_color: brandForm.primary_color || null,
        notes: brandForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'project_id' }
    );

    if (error) {
      setBrandError(`Marka bilgisi kaydedilemedi: ${error.message}`);
      setIsSavingBrand(false);
      return;
    }

    setBrandSaved(true);
    setIsSavingBrand(false);
  }

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesFilter = activeFilter === 'Tümü' || project.status === activeFilter;

      const normalizedSearch = searchQuery.trim().toLocaleLowerCase('tr-TR');
      const searchableText = [
        project.title,
        project.description,
        project.status,
        project.category,
        project.priority,
        project.nextAction,
      ]
        .join(' ')
        .toLocaleLowerCase('tr-TR');

      const matchesSearch = normalizedSearch.length === 0 || searchableText.includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, projects, searchQuery]);

  const averageProgress = useMemo(() => {
    if (projects.length === 0) return 0;

    const totalProgress = projects.reduce((total, project) => total + Number(project.progress || 0), 0);
    return Math.round(totalProgress / projects.length);
  }, [projects]);

  function isLogoAsset(type) {
    return type === 'projectLogo' || type === 'detailLogo';
  }

  function isBannerAsset(type) {
    return type === 'projectBanner' || type === 'detailBanner';
  }

  function openProjectModal() {
    setModalMode('create');
    setEditingProjectId(null);
    setProjectForm(emptyProjectForm);
    setIsModalOpen(true);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  function openEditProjectModal(project) {
    setAssetMenu(null);
    setAssetPreview(null);
    setModalMode('edit');
    setEditingProjectId(project.id);
    setProjectForm({
      title: project.title || '',
      description: project.description === 'Kısa açıklama henüz eklenmedi.' ? '' : project.description || '',
      status: project.status || 'Fikir',
      category: project.category || 'Diğer',
      priority: project.priority || 'Orta',
      progress: Number(project.progress || 0),
      targetDate: formatDateForInput(project.targetDate),
      estimatedBudget: formatBudgetForInput(project.estimatedBudget),
      spentBudget: formatBudgetForInput(project.spentBudget),
      nextAction: project.nextAction === 'Sonraki adım henüz belirlenmedi.' ? '' : project.nextAction || '',
      logo: project.logo || '',
      bannerClass: project.bannerClass || 'bannerEmerald',
    });
    setIsModalOpen(true);
  }

  function closeProjectModal() {
    if (isSaving) return;

    setIsModalOpen(false);
    setModalMode('create');
    setEditingProjectId(null);
    setProjectForm(emptyProjectForm);
  }

  function openProjectDetail(project) {
    setSelectedProject(project);
    setActiveDetailTab('Genel Bakış');
  }

  function closeProjectDetail() {
    setSelectedProject(null);
    setActiveDetailTab('Genel Bakış');
  }

  function updateProjectForm(field, value) {
    setProjectForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }));
  }

  function buildProjectPayload() {
    const title = projectForm.title.trim();

    return {
      title,
      description: projectForm.description.trim(),
      status: projectForm.status,
      category: projectForm.category,
      priority: projectForm.priority,
      progress: Math.min(100, Math.max(0, Number(projectForm.progress || 0))),
      target_date: projectForm.targetDate || null,
      estimated_budget: parseBudget(projectForm.estimatedBudget),
      spent_budget: parseBudget(projectForm.spentBudget),
      next_action: projectForm.nextAction.trim(),
      logo_text: (projectForm.logo.trim() || title.charAt(0) || 'P').charAt(0).toLocaleUpperCase('tr-TR'),
      banner_class: projectForm.bannerClass,
    };
  }

  async function handleCreateProject(event) {
    event.preventDefault();

    const title = projectForm.title.trim();

    if (!title) {
      alert('Proje adı zorunludur.');
      return;
    }

    setIsSaving(true);
    setAppError('');

    const projectPayload = buildProjectPayload();

    const { data, error } = await supabase
      .from('projects')
      .insert(projectPayload)
      .select()
      .single();

    if (error) {
      setAppError(`Proje kaydedilemedi: ${error.message}`);
      setIsSaving(false);
      return;
    }

    setProjects((currentProjects) => [mapProjectFromDatabase(data), ...currentProjects]);
    setIsSaving(false);
    closeProjectModal();
  }

  async function handleUpdateProject(event) {
    event.preventDefault();

    const title = projectForm.title.trim();

    if (!title) {
      alert('Proje adı zorunludur.');
      return;
    }

    if (!editingProjectId) {
      setAppError('Düzenlenecek proje bulunamadı.');
      return;
    }

    setIsSaving(true);
    setAppError('');

    const projectPayload = buildProjectPayload();

    const { data, error } = await supabase
      .from('projects')
      .update(projectPayload)
      .eq('id', editingProjectId)
      .select()
      .single();

    if (error) {
      setAppError(`Proje güncellenemedi: ${error.message}`);
      setIsSaving(false);
      return;
    }

    const updatedProject = mapProjectFromDatabase(data);

    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id === updatedProject.id ? updatedProject : project))
    );

    setSelectedProject((currentSelectedProject) =>
      currentSelectedProject?.id === updatedProject.id ? updatedProject : currentSelectedProject
    );

    setIsSaving(false);
    closeProjectModal();
  }

  async function handleDeleteProject(project) {
    if (!project?.id || isDeleting) return;

    const confirmed = window.confirm(
      `"${project.title}" projesini kalıcı olarak silmek istediğine emin misin? Bu işlem geri alınamaz.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setAppError('');

    const { error } = await supabase.from('projects').delete().eq('id', project.id);

    if (error) {
      setAppError(`Proje silinemedi: ${error.message}`);
      setIsDeleting(false);
      return;
    }

    // Clean up associated assets so they do not linger in storage.
    await removeFileFromStorage(project.logoUrl);
    await removeFileFromStorage(project.bannerUrl);

    setProjects((currentProjects) => currentProjects.filter((item) => item.id !== project.id));
    setSelectedProject((current) => (current?.id === project.id ? null : current));
    setIsDeleting(false);
  }

  function openAssetMenu(event, type, project = null) {
    event.stopPropagation();
    setAssetPreview(null);
    setAssetMenu({ type, project });
  }

  function closeAssetMenu() {
    setAssetMenu(null);
  }

  function getAssetMenuTitle() {
    if (!assetMenu) return '';

    if (assetMenu.type === 'brandLogo') return 'Atölye OS logosu';
    if (isLogoAsset(assetMenu.type)) return 'Proje logosu';
    if (isBannerAsset(assetMenu.type)) return 'Proje bannerı';

    return 'Görsel seçenekleri';
  }

  function getUploadActionLabel() {
    if (!assetMenu) return 'Yükle';

    if (assetMenu.type === 'brandLogo') return brandLogoUrl ? 'Logoyu Değiştir' : 'Logo Yükle';

    if (isLogoAsset(assetMenu.type)) {
      return assetMenu.project?.logoUrl ? 'Logoyu Değiştir' : 'Logo Yükle';
    }

    if (isBannerAsset(assetMenu.type)) {
      return assetMenu.project?.bannerUrl ? 'Bannerı Değiştir' : 'Banner Yükle';
    }

    return 'Yükle';
  }

  function getRemoveActionLabel() {
    if (!assetMenu) return 'Kaldır';

    if (assetMenu.type === 'brandLogo') return 'Logoyu Kaldır';
    if (isLogoAsset(assetMenu.type)) return 'Logoyu Kaldır';
    if (isBannerAsset(assetMenu.type)) return 'Bannerı Kaldır';

    return 'Kaldır';
  }

  function handleViewAsset() {
    if (!assetMenu) return;

    if (assetMenu.type === 'brandLogo') {
      setAssetPreview({
        kind: 'brandLogo',
        title: 'Atölye OS logosu',
        logo: brandLogo,
        logoUrl: brandLogoUrl,
        description: brandLogoUrl ? 'Ana marka logosu görsel önizlemesi.' : 'Ana marka logo harfi önizlemesi.',
      });
      setAssetMenu(null);
      return;
    }

    const project = assetMenu.project;

    if (isLogoAsset(assetMenu.type)) {
      setAssetPreview({
        kind: 'logo',
        title: `${project.title} logosu`,
        logo: project.logo,
        logoUrl: project.logoUrl,
        description: project.logoUrl ? 'Bu projenin yüklenen logo görseli.' : 'Bu projenin mevcut logo harfi.',
      });
      setAssetMenu(null);
      return;
    }

    if (isBannerAsset(assetMenu.type)) {
      setAssetPreview({
        kind: 'banner',
        title: `${project.title} bannerı`,
        bannerUrl: project.bannerUrl,
        bannerClass: project.bannerClass,
        description: project.bannerUrl ? 'Bu projenin yüklenen banner görseli.' : 'Bu projenin mevcut banner rengi.',
      });
      setAssetMenu(null);
    }
  }

  function chooseImageFile() {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg,image/jpg,image/webp,image/svg+xml';
      input.onchange = () => {
        resolve(input.files?.[0] || null);
      };
      input.click();
    });
  }

  async function uploadFileToStorage(file, folderName) {
    const extension = getFileExtension(file.name);
    const safeFileName = `${folderName}/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(ASSET_BUCKET)
      .upload(safeFileName, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data } = supabase.storage.from(ASSET_BUCKET).getPublicUrl(safeFileName);

    return data.publicUrl;
  }

  async function removeFileFromStorage(publicUrl) {
    const storagePath = getStoragePathFromUrl(publicUrl);
    if (!storagePath) return;

    // Best-effort cleanup; an orphaned file should not block the user action.
    await supabase.storage.from(ASSET_BUCKET).remove([storagePath]);
  }

  async function handleUploadAsset() {
    if (!assetMenu) return;

    const currentAssetMenu = assetMenu;

    if (currentAssetMenu.type === 'brandLogo') {
      await handleUploadBrandLogo();
      return;
    }

    if (isLogoAsset(currentAssetMenu.type)) {
      await handleUploadLogo(currentAssetMenu.project);
      return;
    }

    if (isBannerAsset(currentAssetMenu.type)) {
      await handleUploadBanner(currentAssetMenu.project);
    }
  }

  async function handleUploadBrandLogo() {
    const file = await chooseImageFile();

    if (!file) return;

    const previousUrl = brandLogoUrl;

    setIsSaving(true);
    setAppError('');

    try {
      const publicUrl = await uploadFileToStorage(file, 'brand');
      setBrandLogoUrl(publicUrl);
      const { error: settingsError } = await supabase
        .from('app_settings')
        .upsert({ owner_id: (await supabase.auth.getUser()).data.user?.id, brand_logo_url: publicUrl });
      if (settingsError) {
        throw new Error(settingsError.message);
      }
      await removeFileFromStorage(previousUrl);
      setAssetMenu(null);
    } catch (error) {
      setAppError(`Logo yüklenemedi: ${error.message}`);
      setAssetMenu(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUploadLogo(project) {
    if (!project?.id) return;

    const file = await chooseImageFile();

    if (!file) return;

    setIsSaving(true);
    setAppError('');

    try {
      const publicUrl = await uploadFileToStorage(file, 'logos');

      const { error } = await supabase
        .from('projects')
        .update({ logo_url: publicUrl })
        .eq('id', project.id);

      if (error) {
        throw new Error(error.message);
      }

      await removeFileFromStorage(project.logoUrl);

      const updatedProject = {
        ...project,
        logoUrl: publicUrl,
      };

      updateProjectInState(updatedProject);
      setAssetMenu(null);
    } catch (error) {
      setAppError(`Logo yüklenemedi: ${error.message}`);
      setAssetMenu(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUploadBanner(project) {
    if (!project?.id) return;

    const file = await chooseImageFile();

    if (!file) return;

    setIsSaving(true);
    setAppError('');

    try {
      const publicUrl = await uploadFileToStorage(file, 'banners');

      const { error } = await supabase
        .from('projects')
        .update({ banner_url: publicUrl })
        .eq('id', project.id);

      if (error) {
        throw new Error(error.message);
      }

      await removeFileFromStorage(project.bannerUrl);

      const updatedProject = {
        ...project,
        bannerUrl: publicUrl,
      };

      updateProjectInState(updatedProject);
      setAssetMenu(null);
    } catch (error) {
      setAppError(`Banner yüklenemedi: ${error.message}`);
      setAssetMenu(null);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRemoveAsset() {
    if (!assetMenu) return;

    if (assetMenu.type === 'brandLogo') {
      handleRemoveBrandLogo();
      return;
    }

    if (isLogoAsset(assetMenu.type)) {
      await handleRemoveLogo(assetMenu.project);
      return;
    }

    if (isBannerAsset(assetMenu.type)) {
      await handleRemoveBanner(assetMenu.project);
    }
  }

  async function handleRemoveBrandLogo() {
    const previousUrl = brandLogoUrl;
    setBrandLogo('A');
    setBrandLogoUrl('');
    setAssetMenu(null);
    await supabase
      .from('app_settings')
      .update({ brand_logo_url: null })
      .eq('owner_id', (await supabase.auth.getUser()).data.user?.id);
    removeFileFromStorage(previousUrl);
  }

  async function handleRemoveLogo(project) {
    if (!project?.id) {
      setAssetMenu(null);
      return;
    }

    const fallbackLogo = project.title?.charAt(0)?.toLocaleUpperCase('tr-TR') || 'P';

    setIsSaving(true);
    setAppError('');

    const { error } = await supabase
      .from('projects')
      .update({
        logo_url: null,
        logo_text: fallbackLogo,
      })
      .eq('id', project.id);

    if (error) {
      setAppError(`Logo kaldırılamadı: ${error.message}`);
      setIsSaving(false);
      setAssetMenu(null);
      return;
    }

    await removeFileFromStorage(project.logoUrl);

    const updatedProject = {
      ...project,
      logo: fallbackLogo,
      logoUrl: '',
    };

    updateProjectInState(updatedProject);

    setIsSaving(false);
    setAssetMenu(null);
  }

  async function handleRemoveBanner(project) {
    if (!project?.id) {
      setAssetMenu(null);
      return;
    }

    setIsSaving(true);
    setAppError('');

    const { error } = await supabase
      .from('projects')
      .update({
        banner_url: null,
        banner_class: 'bannerEmerald',
      })
      .eq('id', project.id);

    if (error) {
      setAppError(`Banner kaldırılamadı: ${error.message}`);
      setIsSaving(false);
      setAssetMenu(null);
      return;
    }

    await removeFileFromStorage(project.bannerUrl);

    const updatedProject = {
      ...project,
      bannerUrl: '',
      bannerClass: 'bannerEmerald',
    };

    updateProjectInState(updatedProject);

    setIsSaving(false);
    setAssetMenu(null);
  }

  function updateProjectInState(updatedProject) {
    setProjects((currentProjects) =>
      currentProjects.map((project) => (project.id === updatedProject.id ? updatedProject : project))
    );

    setSelectedProject((currentSelectedProject) =>
      currentSelectedProject?.id === updatedProject.id ? updatedProject : currentSelectedProject
    );
  }

  function renderLogoContent(project, sizeClassName = '') {
    if (project.logoUrl) {
      return <img className={`logoImage ${sizeClassName}`} src={project.logoUrl} alt={`${project.title} logosu`} />;
    }

    return project.logo;
  }

  function renderDetailTabContent() {
    if (!selectedProject) return null;

    if (activeDetailTab === 'Genel Bakış') {
      return (
        <div className="detailContentGrid">
          <section className="detailInfoCard">
            <span>Proje açıklaması</span>
            <p>{selectedProject.description}</p>
          </section>

          <section className="detailInfoCard">
            <span>Sonraki adım</span>
            <p>{selectedProject.nextAction}</p>
          </section>

          <section className="detailStatsGrid">
            <div>
              <span>Durum</span>
              <strong>{selectedProject.status}</strong>
            </div>
            <div>
              <span>Kategori</span>
              <strong>{selectedProject.category}</strong>
            </div>
            <div>
              <span>Öncelik</span>
              <strong>{selectedProject.priority}</strong>
            </div>
            <div>
              <span>Hedef tarih</span>
              <strong>{selectedProject.targetDate}</strong>
            </div>
            <div>
              <span>Tahmini bütçe</span>
              <strong>{selectedProject.estimatedBudget}</strong>
            </div>
            <div>
              <span>Harcanan bütçe</span>
              <strong>{selectedProject.spentBudget}</strong>
            </div>
          </section>

          <section className="detailInfoCard fullWidth">
            <div className="progressBlock">
              <div className="progressText">
                <span>Genel ilerleme</span>
                <strong>%{selectedProject.progress}</strong>
              </div>
              <div className="progressTrack">
                <div className="progressFill" style={{ width: `${selectedProject.progress}%` }} />
              </div>
            </div>
          </section>
        </div>
      );
    }

    if (activeDetailTab === 'Görevler') {
      const completedCount = projectTasks.filter((task) => task.is_done).length;

      return (
        <div className="taskPanel">
          <form className="addTaskRow" onSubmit={handleAddTask}>
            <input
              value={newTaskTitle}
              onChange={(event) => setNewTaskTitle(event.target.value)}
              placeholder="Yeni görev yaz ve Enter'a bas..."
            />
            <button className="primaryButton" type="submit" disabled={isAddingTask || !newTaskTitle.trim()}>
              {isAddingTask ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </form>

          {tasksError && <div className="errorBanner">{tasksError}</div>}

          {tasksLoading ? (
            <p className="taskEmpty">Görevler yükleniyor...</p>
          ) : projectTasks.length === 0 ? (
            <p className="taskEmpty">Bu proje için henüz görev yok. Yukarıdan ilkini ekle.</p>
          ) : (
            <>
              <p className="taskSummary">
                {completedCount}/{projectTasks.length} görev tamamlandı
              </p>
              <ul className="taskList">
                {projectTasks.map((task) => (
                  <li key={task.id} className={task.is_done ? 'taskItem done' : 'taskItem'}>
                    <label className="taskCheck">
                      <input
                        type="checkbox"
                        checked={task.is_done}
                        onChange={() => handleToggleTask(task)}
                      />
                      <span>{task.title}</span>
                    </label>
                    <button
                      className="taskDelete"
                      type="button"
                      onClick={() => handleDeleteTask(task)}
                      aria-label="Görevi sil"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      );
    }

    if (activeDetailTab === 'Marka & Domain') {
      if (brandLoading) {
        return (
          <div className="brandPanel">
            <p className="taskEmpty">Marka bilgisi yükleniyor...</p>
          </div>
        );
      }

      return (
        <div className="brandPanel">
          <form className="brandForm" onSubmit={handleSaveBrand}>
            {brandError && <div className="errorBanner">{brandError}</div>}

            <label className="brandField">
              <span>Domain</span>
              <input
                value={brandForm.domain}
                onChange={(event) => updateBrandForm('domain', event.target.value)}
                placeholder="örn. atolyeos.com"
              />
            </label>

            <label className="brandField">
              <span>Domain durumu</span>
              <select
                value={brandForm.domain_status}
                onChange={(event) => updateBrandForm('domain_status', event.target.value)}
              >
                {domainStatusOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="brandField">
              <span>Slogan</span>
              <input
                value={brandForm.slogan}
                onChange={(event) => updateBrandForm('slogan', event.target.value)}
                placeholder="Markanın tek cümlelik vaadi"
              />
            </label>

            <label className="brandField">
              <span>Marka rengi</span>
              <div className="brandColorRow">
                <input
                  type="color"
                  value={brandForm.primary_color}
                  onChange={(event) => updateBrandForm('primary_color', event.target.value)}
                />
                <span className="brandColorValue">{brandForm.primary_color}</span>
              </div>
            </label>

            <label className="brandField fullWidth">
              <span>Notlar</span>
              <textarea
                value={brandForm.notes}
                onChange={(event) => updateBrandForm('notes', event.target.value)}
                placeholder="Marka kimliği, ton, isim alternatifleri, sosyal medya el adresleri..."
                rows="3"
              />
            </label>

            <div className="brandActions">
              {brandSaved && <span className="brandSavedNote">Kaydedildi ✓</span>}
              <button className="primaryButton" type="submit" disabled={isSavingBrand}>
                {isSavingBrand ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      );
    }

    if (activeDetailTab === 'Rakipler') {
      return (
        <div className="competitorPanel">
          <form className="addCompetitorForm" onSubmit={handleAddCompetitor}>
            <div className="competitorInputs">
              <input
                value={newCompetitor.name}
                onChange={(event) => setNewCompetitor((current) => ({ ...current, name: event.target.value }))}
                placeholder="Rakip adı *"
              />
              <input
                value={newCompetitor.url}
                onChange={(event) => setNewCompetitor((current) => ({ ...current, url: event.target.value }))}
                placeholder="Web sitesi (opsiyonel)"
              />
            </div>
            <textarea
              value={newCompetitor.notes}
              onChange={(event) => setNewCompetitor((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Güçlü/zayıf yönleri, fiyat, farklılaşma notu..."
              rows="2"
            />
            <div className="addNoteActions">
              <button className="primaryButton" type="submit" disabled={isAddingCompetitor || !newCompetitor.name.trim()}>
                {isAddingCompetitor ? 'Ekleniyor...' : 'Rakip Ekle'}
              </button>
            </div>
          </form>

          {competitorsError && <div className="errorBanner">{competitorsError}</div>}

          {competitorsLoading ? (
            <p className="taskEmpty">Rakipler yükleniyor...</p>
          ) : competitors.length === 0 ? (
            <p className="taskEmpty">Bu proje için henüz rakip eklenmedi. Yukarıdan ilkini ekle.</p>
          ) : (
            <ul className="competitorList">
              {competitors.map((competitor) => (
                <li key={competitor.id} className="competitorItem">
                  <div className="competitorBody">
                    <div className="competitorHead">
                      {competitor.url ? (
                        <a href={competitor.url} target="_blank" rel="noopener noreferrer">
                          {competitor.name}
                        </a>
                      ) : (
                        <strong>{competitor.name}</strong>
                      )}
                      <button
                        className="taskDelete"
                        type="button"
                        onClick={() => handleDeleteCompetitor(competitor)}
                        aria-label="Rakibi sil"
                      >
                        ×
                      </button>
                    </div>
                    {competitor.notes && <p>{competitor.notes}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (activeDetailTab === 'Dosyalar') {
      return (
        <div className="filePanel">
          <div className="fileUploadRow">
            <button
              className="primaryButton"
              type="button"
              onClick={handleUploadProjectFile}
              disabled={isUploadingFile}
            >
              {isUploadingFile ? 'Yükleniyor...' : '+ Dosya Yükle'}
            </button>
          </div>

          {filesError && <div className="errorBanner">{filesError}</div>}

          {filesLoading ? (
            <p className="taskEmpty">Dosyalar yükleniyor...</p>
          ) : projectFiles.length === 0 ? (
            <p className="taskEmpty">Bu proje için henüz dosya yok. Yukarıdan ilkini yükle.</p>
          ) : (
            <ul className="fileList">
              {projectFiles.map((fileRecord) => (
                <li key={fileRecord.id} className="fileItem">
                  <a
                    className="fileLink"
                    href={fileRecord.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="fileName">{fileRecord.file_name}</span>
                    <span className="fileMeta">
                      {formatFileSize(fileRecord.size_bytes)} · {new Date(fileRecord.created_at).toLocaleDateString('tr-TR')}
                    </span>
                  </a>
                  <button
                    className="taskDelete"
                    type="button"
                    onClick={() => handleDeleteProjectFile(fileRecord)}
                    aria-label="Dosyayı sil"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (activeDetailTab === 'Yol Haritası') {
      return (
        <div className="roadmapPanel">
          <form className="addMilestoneRow" onSubmit={handleAddMilestone}>
            <input
              value={newMilestoneTitle}
              onChange={(event) => setNewMilestoneTitle(event.target.value)}
              placeholder="Kilometre taşı (örn. Beta lansmanı)"
            />
            <input
              type="date"
              value={newMilestoneDate}
              onChange={(event) => setNewMilestoneDate(event.target.value)}
            />
            <button className="primaryButton" type="submit" disabled={isAddingMilestone || !newMilestoneTitle.trim()}>
              {isAddingMilestone ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </form>

          {roadmapError && <div className="errorBanner">{roadmapError}</div>}

          {roadmapLoading ? (
            <p className="taskEmpty">Yol haritası yükleniyor...</p>
          ) : roadmapItems.length === 0 ? (
            <p className="taskEmpty">Bu proje için henüz kilometre taşı yok. Yukarıdan ilkini ekle.</p>
          ) : (
            <ul className="roadmapList">
              {roadmapItems.map((item) => (
                <li
                  key={item.id}
                  className={`roadmapItem status-${item.status === 'Tamamlandı' ? 'done' : item.status === 'Devam Ediyor' ? 'active' : 'planned'}`}
                >
                  <div className="roadmapDot" />
                  <div className="roadmapBody">
                    <strong>{item.title}</strong>
                    <span>{item.target_date ? formatDateForCard(item.target_date) : 'Tarih yok'}</span>
                  </div>
                  <select
                    value={item.status}
                    onChange={(event) => handleUpdateMilestoneStatus(item, event.target.value)}
                  >
                    {roadmapStatusOptions.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <button
                    className="taskDelete"
                    type="button"
                    onClick={() => handleDeleteMilestone(item)}
                    aria-label="Kilometre taşını sil"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (activeDetailTab === 'Notlar') {
      return (
        <div className="notePanel">
          <form className="addNoteForm" onSubmit={handleAddNote}>
            <textarea
              value={newNoteContent}
              onChange={(event) => setNewNoteContent(event.target.value)}
              placeholder="Bu projeyle ilgili bir not yaz..."
              rows="3"
            />
            <div className="addNoteActions">
              <button className="primaryButton" type="submit" disabled={isAddingNote || !newNoteContent.trim()}>
                {isAddingNote ? 'Ekleniyor...' : 'Not Ekle'}
              </button>
            </div>
          </form>

          {notesError && <div className="errorBanner">{notesError}</div>}

          {notesLoading ? (
            <p className="taskEmpty">Notlar yükleniyor...</p>
          ) : projectNotes.length === 0 ? (
            <p className="taskEmpty">Bu proje için henüz not yok. Yukarıdan ilkini ekle.</p>
          ) : (
            <ul className="noteList">
              {projectNotes.map((note) => (
                <li key={note.id} className="noteItem">
                  {editingNoteId === note.id ? (
                    <div className="noteEdit">
                      <textarea
                        value={editingNoteContent}
                        onChange={(event) => setEditingNoteContent(event.target.value)}
                        rows="3"
                      />
                      <div className="noteEditActions">
                        <button className="secondaryButton" type="button" onClick={cancelEditNote}>
                          Vazgeç
                        </button>
                        <button
                          className="primaryButton"
                          type="button"
                          onClick={() => handleUpdateNote(note)}
                          disabled={!editingNoteContent.trim()}
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="noteContent">{note.content}</p>
                      <div className="noteFooter">
                        <span>{new Date(note.created_at).toLocaleDateString('tr-TR')}</span>
                        <div className="noteActions">
                          <button type="button" onClick={() => startEditNote(note)}>
                            Düzenle
                          </button>
                          <button type="button" className="noteDelete" onClick={() => handleDeleteNote(note)}>
                            Sil
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    if (activeDetailTab === 'Bütçe') {
      const estimated = parseBudget(selectedProject.estimatedBudget);
      const spent = parseBudget(selectedProject.spentBudget);
      const remaining = estimated - spent;
      const usedPercent = estimated > 0 ? Math.round((spent / estimated) * 100) : 0;
      const isOverBudget = estimated > 0 && spent > estimated;

      return (
        <div className="detailContentGrid">
          <section className="detailStatsGrid">
            <div>
              <span>Tahmini bütçe</span>
              <strong>{formatBudget(estimated)}</strong>
            </div>
            <div>
              <span>Harcanan</span>
              <strong>{formatBudget(spent)}</strong>
            </div>
            <div>
              <span>{isOverBudget ? 'Aşım' : 'Kalan'}</span>
              <strong>{formatBudget(Math.abs(remaining))}</strong>
            </div>
            <div>
              <span>Kullanım oranı</span>
              <strong>%{usedPercent}</strong>
            </div>
          </section>

          <section className="detailInfoCard fullWidth">
            <div className="progressBlock">
              <div className="progressText">
                <span>Bütçe kullanımı</span>
                <strong>%{usedPercent}</strong>
              </div>
              <div className="progressTrack">
                <div
                  className="progressFill"
                  style={{
                    width: `${Math.min(100, usedPercent)}%`,
                    background: isOverBudget ? '#dc2626' : undefined,
                  }}
                />
              </div>
            </div>
          </section>

          <section className="detailInfoCard fullWidth">
            <span>Bütçe durumu</span>
            <p>
              {estimated === 0
                ? 'Bu proje için henüz tahmini bütçe girilmedi.'
                : isOverBudget
                  ? `Bütçe ${formatBudget(spent - estimated)} aşıldı. Harcamaları gözden geçirmen gerekebilir.`
                  : `Bütçenin %${usedPercent}'i kullanıldı, ${formatBudget(remaining)} kullanılabilir durumda.`}
            </p>
          </section>
        </div>
      );
    }

    return (
      <section className="placeholderPanel">
        <h3>{activeDetailTab}</h3>
        <p>
          Bu sekmenin veri yapısını bir sonraki aşamalarda ayrı Supabase tablosuyla kuracağız.
          Önce detay paneli akışını sabitliyoruz.
        </p>
      </section>
    );
  }

  const modalTitle = modalMode === 'edit' ? 'Projeyi Düzenle' : 'Yeni Proje Ekle';
  const modalEyebrow = modalMode === 'edit' ? 'Kayıt güncelleme' : 'Yeni kayıt';
  const modalSubmitLabel = modalMode === 'edit' ? 'Değişiklikleri Kaydet' : 'Projeyi Ekle';
  const modalSavingLabel = modalMode === 'edit' ? 'Güncelleniyor...' : 'Kaydediliyor...';

  return (
    <main className="appShell">
      <section className="heroPanel">
        <header className="topBar">
          <div className="brandBlock">
            <button
              className="brandMark brandMarkButton"
              type="button"
              onClick={(event) => openAssetMenu(event, 'brandLogo')}
              title="Atölye OS logo seçenekleri"
            >
              {brandLogoUrl ? <img className="brandLogoImage" src={brandLogoUrl} alt="Atölye OS logosu" /> : brandLogo}
            </button>

            <div>
              <p className="eyebrow">Kişisel girişim merkezi</p>
              <h1>Atölye OS</h1>
            </div>
          </div>

          <div className="topBarActions">
            <button className="secondaryButton" type="button" onClick={handleSignOut}>
              Çıkış
            </button>
            <button className="primaryButton" type="button" onClick={openProjectModal}>
              + Yeni Proje
            </button>
          </div>
        </header>

        <div className="heroContent">
          <div>
            <h2>Girişim fikirlerin, dosyaların, hedeflerin ve bütçelerin tek yerde.</h2>
            <p>
              Her kart bir proje. Logo, banner, ilerleme, bütçe, hedef tarih, notlar ve dosyalar
              bu panoda bulut tabanlı olarak yönetilecek.
            </p>
          </div>

          <div className="summaryGrid">
            <div className="summaryCard">
              <span>Toplam Proje</span>
              <strong>{projects.length}</strong>
            </div>
            <div className="summaryCard">
              <span>Aktif Proje</span>
              <strong>{projects.filter((project) => project.status !== 'İptal').length}</strong>
            </div>
            <div className="summaryCard">
              <span>Ortalama İlerleme</span>
              <strong>%{averageProgress}</strong>
            </div>
          </div>
        </div>
      </section>

      {appError && <div className="errorBanner">{appError}</div>}

      <section className="toolbar">
        <div className="searchBox">
          <span>⌕</span>
          <input
            placeholder="Proje, fikir, marka veya kategori ara..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>

        <div className="filterRow">
          {statusFilters.map((filter) => (
            <button
              key={filter}
              className={filter === activeFilter ? 'filterChip active' : 'filterChip'}
              type="button"
              onClick={() => setActiveFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </section>

      {isLoading ? (
        <section className="emptyState">
          <h3>Projeler yükleniyor</h3>
          <p>Supabase veritabanından proje kartları alınıyor.</p>
        </section>
      ) : (
        <>
          <section className="projectGrid">
            {filteredProjects.map((project) => (
              <article
                className="projectCard"
                key={project.id}
                onClick={() => openProjectDetail(project)}
                role="button"
                tabIndex="0"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') openProjectDetail(project);
                }}
              >
                <div
                  className={`projectBanner clickableAsset ${project.bannerClass}`}
                  style={project.bannerUrl ? { backgroundImage: `url(${project.bannerUrl})` } : undefined}
                  onClick={(event) => openAssetMenu(event, 'projectBanner', project)}
                  title="Banner seçenekleri"
                >
                  <button
                    className="projectLogo clickableLogo"
                    type="button"
                    onClick={(event) => openAssetMenu(event, 'projectLogo', project)}
                    title="Logo seçenekleri"
                  >
                    {renderLogoContent(project)}
                  </button>

                  <span className="priorityBadge">{project.priority}</span>
                </div>

                <div className="projectBody">
                  <div className="projectHeader">
                    <div>
                      <p className="projectCategory">{project.category}</p>
                      <h3>{project.title}</h3>
                    </div>
                    <span className="statusBadge">{project.status}</span>
                  </div>

                  <p className="projectDescription">{project.description}</p>

                  <div className="progressBlock">
                    <div className="progressText">
                      <span>İlerleme</span>
                      <strong>%{project.progress}</strong>
                    </div>
                    <div className="progressTrack">
                      <div className="progressFill" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>

                  <div className="metaGrid">
                    <div>
                      <span>Hedef</span>
                      <strong>{project.targetDate}</strong>
                    </div>
                    <div>
                      <span>Bütçe</span>
                      <strong>{project.estimatedBudget}</strong>
                    </div>
                    <div>
                      <span>Harcanan</span>
                      <strong>{project.spentBudget}</strong>
                    </div>
                  </div>

                  <div className="nextAction">
                    <span>Sonraki adım</span>
                    <p>{project.nextAction}</p>
                  </div>
                </div>
              </article>
            ))}
          </section>

          {filteredProjects.length === 0 && (
            <section className="emptyState">
              <h3>Sonuç bulunamadı</h3>
              <p>
                {projects.length === 0
                  ? 'Henüz kayıtlı proje yok. + Yeni Proje butonuyla ilk projeni ekle.'
                  : 'Arama veya filtre seçimini değiştirerek tekrar dene.'}
              </p>
            </section>
          )}
        </>
      )}

      {isModalOpen && (
        <div className="modalOverlay" role="presentation" onMouseDown={closeProjectModal}>
          <section
            className="projectModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modalHeader">
              <div>
                <p className="eyebrow">{modalEyebrow}</p>
                <h2 id="project-modal-title">{modalTitle}</h2>
              </div>

              <button className="iconButton" type="button" onClick={closeProjectModal} aria-label="Kapat">
                ×
              </button>
            </div>

            <form
              className="projectForm"
              onSubmit={modalMode === 'edit' ? handleUpdateProject : handleCreateProject}
            >
              <label className="formField">
                <span>Proje adı *</span>
                <input
                  value={projectForm.title}
                  onChange={(event) => updateProjectForm('title', event.target.value)}
                  placeholder="Örn. Atölye OS"
                />
              </label>

              <label className="formField fullWidth">
                <span>Kısa açıklama</span>
                <textarea
                  value={projectForm.description}
                  onChange={(event) => updateProjectForm('description', event.target.value)}
                  placeholder="Projenin ne yaptığını 1-2 cümleyle yaz."
                  rows="3"
                />
              </label>

              <label className="formField">
                <span>Kategori</span>
                <select
                  value={projectForm.category}
                  onChange={(event) => updateProjectForm('category', event.target.value)}
                >
                  {categoryOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="formField">
                <span>Durum</span>
                <select
                  value={projectForm.status}
                  onChange={(event) => updateProjectForm('status', event.target.value)}
                >
                  {statusOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="formField">
                <span>Öncelik</span>
                <select
                  value={projectForm.priority}
                  onChange={(event) => updateProjectForm('priority', event.target.value)}
                >
                  {priorityOptions.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="formField">
                <span>İlerleme oranı</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={projectForm.progress}
                  onChange={(event) => updateProjectForm('progress', event.target.value)}
                />
              </label>

              <label className="formField">
                <span>Hedef tarih</span>
                <input
                  type="date"
                  value={projectForm.targetDate}
                  onChange={(event) => updateProjectForm('targetDate', event.target.value)}
                />
              </label>

              <label className="formField">
                <span>Tahmini bütçe</span>
                <input
                  value={projectForm.estimatedBudget}
                  onChange={(event) => updateProjectForm('estimatedBudget', event.target.value)}
                  placeholder="Örn. 50000"
                />
              </label>

              <label className="formField">
                <span>Harcanan bütçe</span>
                <input
                  value={projectForm.spentBudget}
                  onChange={(event) => updateProjectForm('spentBudget', event.target.value)}
                  placeholder="Örn. 12000"
                />
              </label>

              <label className="formField">
                <span>Logo harfi</span>
                <input
                  maxLength="1"
                  value={projectForm.logo}
                  onChange={(event) => updateProjectForm('logo', event.target.value)}
                  placeholder="A"
                />
              </label>

              <label className="formField">
                <span>Banner rengi</span>
                <select
                  value={projectForm.bannerClass}
                  onChange={(event) => updateProjectForm('bannerClass', event.target.value)}
                >
                  {bannerOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="formField fullWidth">
                <span>Sonraki adım</span>
                <textarea
                  value={projectForm.nextAction}
                  onChange={(event) => updateProjectForm('nextAction', event.target.value)}
                  placeholder="Bu projede yapılacak en yakın somut işi yaz."
                  rows="3"
                />
              </label>

              <div className="formActions">
                <button className="secondaryButton" type="button" onClick={closeProjectModal}>
                  Vazgeç
                </button>
                <button className="primaryButton" type="submit" disabled={isSaving}>
                  {isSaving ? modalSavingLabel : modalSubmitLabel}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedProject && (
        <div className="detailOverlay" role="presentation" onMouseDown={closeProjectDetail}>
          <aside
            className="detailDrawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-detail-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div
              className={`detailHero clickableAsset ${selectedProject.bannerClass}`}
              style={selectedProject.bannerUrl ? { backgroundImage: `url(${selectedProject.bannerUrl})` } : undefined}
              onClick={(event) => openAssetMenu(event, 'detailBanner', selectedProject)}
              title="Banner seçenekleri"
            >
              <button
                className="detailLogo clickableLogo"
                type="button"
                onClick={(event) => openAssetMenu(event, 'detailLogo', selectedProject)}
                title="Logo seçenekleri"
              >
                {renderLogoContent(selectedProject, 'detailLogoImage')}
              </button>

              <button
                className="detailCloseButton"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeProjectDetail();
                }}
                aria-label="Kapat"
              >
                ×
              </button>
            </div>

            <div className="detailHeader">
              <div>
                <p className="projectCategory">{selectedProject.category}</p>
                <h2 id="project-detail-title">{selectedProject.title}</h2>
              </div>

              <div className="detailBadges">
                <span>{selectedProject.status}</span>
                <span>{selectedProject.priority}</span>
              </div>
            </div>

            <div className="detailActionRow">
              <button className="secondaryButton" type="button" onClick={() => openEditProjectModal(selectedProject)}>
                Projeyi Düzenle
              </button>
              <button
                className="dangerButton"
                type="button"
                onClick={() => handleDeleteProject(selectedProject)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Siliniyor...' : 'Projeyi Sil'}
              </button>
            </div>

            <nav className="detailTabs" aria-label="Proje detay sekmeleri">
              {detailTabs.map((tab) => (
                <button
                  key={tab}
                  className={tab === activeDetailTab ? 'detailTab active' : 'detailTab'}
                  type="button"
                  onClick={() => setActiveDetailTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </nav>

            {renderDetailTabContent()}
          </aside>
        </div>
      )}

      {assetMenu && (
        <div className="assetMenuOverlay" role="presentation" onMouseDown={closeAssetMenu}>
          <section
            className="assetMenu"
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-menu-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="assetMenuHeader">
              <div>
                <p className="eyebrow">{isBannerAsset(assetMenu.type) ? 'Banner' : 'Logo'}</p>
                <h3 id="asset-menu-title">{getAssetMenuTitle()}</h3>
              </div>

              <button className="iconButton" type="button" onClick={closeAssetMenu} aria-label="Kapat">
                ×
              </button>
            </div>

            <div className="assetMenuActions">
              <button type="button" onClick={handleViewAsset}>
                Gör
              </button>
              <button type="button" onClick={handleUploadAsset} disabled={isSaving}>
                {isSaving ? 'Yükleniyor...' : getUploadActionLabel()}
              </button>
              <button type="button" onClick={handleRemoveAsset} disabled={isSaving}>
                {isSaving ? 'Kaldırılıyor...' : getRemoveActionLabel()}
              </button>
            </div>
          </section>
        </div>
      )}

      {assetPreview && (
        <div className="assetPreviewOverlay" role="presentation" onMouseDown={() => setAssetPreview(null)}>
          <section
            className="assetPreview"
            role="dialog"
            aria-modal="true"
            aria-labelledby="asset-preview-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="assetMenuHeader">
              <div>
                <p className="eyebrow">Önizleme</p>
                <h3 id="asset-preview-title">{assetPreview.title}</h3>
              </div>

              <button className="iconButton" type="button" onClick={() => setAssetPreview(null)} aria-label="Kapat">
                ×
              </button>
            </div>

            {assetPreview.kind === 'banner' ? (
              <div
                className={`bannerPreviewPanel ${assetPreview.bannerClass || 'bannerEmerald'}`}
                style={assetPreview.bannerUrl ? { backgroundImage: `url(${assetPreview.bannerUrl})` } : undefined}
              />
            ) : (
              <div className="logoPreviewPanel">
                {assetPreview.logoUrl ? (
                  <img className="logoPreviewImage" src={assetPreview.logoUrl} alt={assetPreview.title} />
                ) : (
                  <div className="logoPreviewLetter">{assetPreview.logo}</div>
                )}
              </div>
            )}

            <p>{assetPreview.description}</p>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
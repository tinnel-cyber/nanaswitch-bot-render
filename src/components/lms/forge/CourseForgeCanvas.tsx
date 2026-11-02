import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  BackgroundVariant,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Sparkles,
  Plus,
  Play,
  Brain,
  Video,
  Radio,
  FileText,
  Save,
  RotateCcw,
  Layers,
  Award,
  BookOpen,
  GitBranch,
  ChevronRight,
  CheckCircle2,
  Sliders,
  HelpCircle,
  Clock,
  ShieldCheck,
  Download,
  Upload,
  Settings,
  HardDrive,
  Paperclip,
  LayoutGrid,
  ListOrdered,
  Mic,
  Crown
} from 'lucide-react';

import { CourseNodeData, CourseNodeType, AdaptiveQuizQuestion, VideoLessonNodeConfig, CourseModule, CourseLesson, LessonResource, LiveSessionConfig, StoreSubscription, StoreUser } from '../../../types';
import { isFreePlan, triggerProFeatureUpsell } from '../../../utils/planFeatures';
import { VideoLessonNode } from './nodes/VideoLessonNode';
import { InteractiveQuizNode } from './nodes/InteractiveQuizNode';
import { DailyLiveNode } from './nodes/DailyLiveNode';
import { PdfResourceNode } from './nodes/PdfResourceNode';
import { VoiceSimulationNode } from './nodes/VoiceSimulationNode';
import { DocumentToCourseModal, GeneratedGraphData } from './DocumentToCourseModal';
import { AdaptiveQuizModal } from './AdaptiveQuizModal';
import { VideoEngineModal } from './VideoEngineModal';
import { LiveSessionConfigModal } from './LiveSessionConfigModal';
import { VoiceSimulationConfigModal } from './VoiceSimulationConfigModal';
import { CurriculumDndBuilder } from './CurriculumDndBuilder';
import { ContentBankDrawer } from './ContentBankDrawer';
import { ModuleDeliverySettingsModal } from './ModuleDeliverySettingsModal';
import { AdvancedCourseSettingsModal } from './AdvancedCourseSettingsModal';
import { exportCourseToJson, parseAndValidateCourseJson } from '../../../services/courseImportExport';
import { updateModuleBranding, saveCourseStructure, saveCourseGlobalSettings } from '../../../services/lmsService';

// Modules initiaux structurés pour le Drag-and-Drop & Drip
const INITIAL_MODULES: CourseModule[] = [
  {
    id: 'mod-1',
    title: 'Module 1 : Introduction aux Systèmes Hybrides & Sync Offline',
    order: 0,
    hideBranding: true,
    dripSettings: { enabled: false, type: 'DAYS_AFTER_ENROLLMENT', unlockDays: 0 },
    strictLinearProgression: false,
    lessons: [
      {
        id: 'node-intro-video',
        moduleId: 'mod-1',
        title: 'Introduction aux Systèmes Hybrides',
        durationMinutes: 14,
        videoUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        hideBranding: true,
        isFreePreview: true,
        attachments: [
          {
            id: 'res-default-1',
            title: 'Architecture_POS_Transactions_Offline.pdf',
            fileType: 'PDF',
            fileSize: '4.8 MB',
            downloadUrl: 'https://example.com/spec_pos.pdf'
          }
        ]
      }
    ]
  },
  {
    id: 'mod-2',
    title: 'Module 2 : Architecture POS & Transactions Offline',
    order: 1,
    hideBranding: true,
    dripSettings: { enabled: true, type: 'DAYS_AFTER_ENROLLMENT', unlockDays: 3 },
    strictLinearProgression: true,
    lessons: [
      {
        id: 'node-arch-video',
        moduleId: 'mod-2',
        title: 'Architecture POS & Transactions Offline',
        durationMinutes: 22,
        videoUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        hideBranding: true,
        attachments: [
          {
            id: 'res-default-2',
            title: 'Pack_Code_Source_Sync_IndexedDB.zip',
            fileType: 'ZIP',
            fileSize: '12.4 MB',
            downloadUrl: 'https://example.com/starter_code.zip'
          }
        ]
      }
    ]
  },
  {
    id: 'mod-3',
    title: 'Module 3 : Évaluation Adaptative IRT & Certification',
    order: 2,
    hideBranding: true,
    dripSettings: { enabled: false, type: 'DAYS_AFTER_ENROLLMENT', unlockDays: 7 },
    strictLinearProgression: true,
    lessons: [
      {
        id: 'node-quiz-checkpoint',
        moduleId: 'mod-3',
        title: 'Évaluation Adaptative IRT : Protocoles & Résilience',
        durationMinutes: 25,
        quiz: {
          id: 'quiz-irt-1',
          title: 'Quiz Adaptatif IRT',
          passingScorePercentage: 70,
          questions: []
        }
      },
      {
        id: 'node-remedial-video',
        moduleId: 'mod-3',
        title: 'Remédiation : Consolidation des Notions Fondamentales',
        durationMinutes: 10,
        videoUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
        hideBranding: true
      },
      {
        id: 'node-daily-live',
        moduleId: 'mod-3',
        title: 'Atelier Direct NaNa Live : Pratique Caisse POS & Q&A',
        durationMinutes: 60
      },
      {
        id: 'node-pdf-guide',
        moduleId: 'mod-3',
        title: 'Manuel Technique & Spécifications API Télécom',
        durationMinutes: 30
      }
    ]
  }
];

// Graphe initial de référence
const INITIAL_NODES: Node[] = [
  {
    id: 'node-intro-video',
    type: 'videoLesson',
    position: { x: 250, y: 50 },
    data: {
      id: 'node-intro-video',
      type: 'videoLesson',
      title: 'Module 1 : Introduction aux Systèmes Hybrides',
      subtitle: 'Fondamentaux de la synchronisation déconnectée',
      durationMinutes: 14,
      isRemedial: false,
      videoConfig: {
        mode: 'MANUAL_UPLOAD',
        title: 'Module 1 : Introduction aux Systèmes Hybrides',
        durationMinutes: 14,
        manualFileName: 'cours_intro_hybride_pos.mp4',
        isUploaded: true,
        uploadProgress: 100
      }
    }
  },
  {
    id: 'node-arch-video',
    type: 'videoLesson',
    position: { x: 250, y: 220 },
    data: {
      id: 'node-arch-video',
      type: 'videoLesson',
      title: 'Module 2 : Architecture POS & Transactions Offline',
      subtitle: 'IndexedDB, batching des requêtes et idempotence',
      durationMinutes: 22,
      isRemedial: false,
      videoConfig: {
        mode: 'AI_AVATAR',
        title: 'Module 2 : Architecture POS & Transactions Offline',
        durationMinutes: 22,
        aiAvatarModel: 'ibrahim_konkobo_hd',
        aiVoiceTone: 'PROFESSIONAL',
        aiRenderStatus: 'READY'
      }
    }
  },
  {
    id: 'node-quiz-checkpoint',
    type: 'interactiveQuiz',
    position: { x: 250, y: 400 },
    data: {
      id: 'node-quiz-checkpoint',
      type: 'interactiveQuiz',
      title: 'Évaluation Adaptative IRT : Protocoles & Résilience',
      subtitle: 'Algorithme adaptatif multi-niveaux N1 à N5',
      quizPassingScore: 70
    }
  },
  {
    id: 'node-remedial-video',
    type: 'videoLesson',
    position: { x: 620, y: 400 },
    data: {
      id: 'node-remedial-video',
      type: 'videoLesson',
      title: 'Remédiation : Consolidation des Notions Fondamentales',
      subtitle: 'Vidéo ciblée pour consolider les notions clés du quiz',
      durationMinutes: 10,
      isRemedial: true,
      videoConfig: {
        mode: 'AI_AVATAR',
        title: 'Remédiation : Consolidation des Notions Fondamentales',
        durationMinutes: 10,
        aiAvatarModel: 'fintech_instructor_female',
        aiVoiceTone: 'DYNAMIC',
        aiRenderStatus: 'READY'
      }
    }
  },
  {
    id: 'node-daily-live',
    type: 'dailyLive',
    position: { x: 250, y: 590 },
    data: {
      id: 'node-daily-live',
      type: 'dailyLive',
      title: 'Atelier Direct NaNa Live : Pratique Caisse POS & Q&A',
      subtitle: 'Webinaire interactif avec M. Ibrahim Konkobo',
      dailyScheduledDate: 'Jeudi 16h00 GMT'
    }
  },
  {
    id: 'node-pdf-guide',
    type: 'pdfResource',
    position: { x: 620, y: 590 },
    data: {
      id: 'node-pdf-guide',
      type: 'pdfResource',
      title: 'Manuel Technique & Spécifications API Télécom',
      subtitle: 'Guide officiel remis aux étudiants certifiés',
      pdfFileName: 'Manuel_Architecture_Konkobo_Telecom.pdf',
      pdfFileSize: '4.8 MB'
    }
  }
];

const INITIAL_EDGES: Edge[] = [
  {
    id: 'edge-1-2',
    source: 'node-intro-video',
    target: 'node-arch-video',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
  },
  {
    id: 'edge-2-3',
    source: 'node-arch-video',
    target: 'node-quiz-checkpoint',
    type: 'smoothstep',
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
  },
  {
    id: 'edge-3-live-pass',
    source: 'node-quiz-checkpoint',
    sourceHandle: 'pass',
    target: 'node-daily-live',
    type: 'smoothstep',
    animated: true,
    label: 'Réussite ≥ 70%',
    labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 10 },
    labelBgStyle: { fill: '#0f172a', stroke: '#10b981', strokeWidth: 1, rx: 6, ry: 6 },
    style: { stroke: '#10b981', strokeWidth: 2.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }
  },
  {
    id: 'edge-3-remedial-fail',
    source: 'node-quiz-checkpoint',
    sourceHandle: 'fail',
    target: 'node-remedial-video',
    type: 'smoothstep',
    animated: true,
    label: 'Échec < 70% (Rattrapage)',
    labelStyle: { fill: '#f59e0b', fontWeight: 700, fontSize: 10 },
    labelBgStyle: { fill: '#0f172a', stroke: '#f59e0b', strokeWidth: 1, rx: 6, ry: 6 },
    style: { stroke: '#f59e0b', strokeWidth: 2.5, strokeDasharray: '5 5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }
  },
  {
    id: 'edge-remedial-to-live',
    source: 'node-remedial-video',
    target: 'node-daily-live',
    type: 'smoothstep',
    animated: false,
    label: 'Reprise',
    labelStyle: { fill: '#94a3b8', fontWeight: 600, fontSize: 9 },
    labelBgStyle: { fill: '#0f172a', stroke: '#334155', rx: 4, ry: 4 },
    style: { stroke: '#64748b', strokeWidth: 1.5, strokeDasharray: '4 4' },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
  },
  {
    id: 'edge-live-to-pdf',
    source: 'node-daily-live',
    target: 'node-pdf-guide',
    type: 'smoothstep',
    animated: false,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
  }
];

export interface CourseForgeCanvasProps {
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  isFreeAccount?: boolean;
}

export const CourseForgeCanvas: React.FC<CourseForgeCanvasProps> = ({
  currentUser,
  subscription,
  isFreeAccount = false
}) => {
  const isFree = isFreeAccount || isFreePlan(subscription || currentUser);
  const [nodes, setNodes] = useState<Node[]>(INITIAL_NODES);
  const [edges, setEdges] = useState<Edge[]>(INITIAL_EDGES);

  // Mode d'affichage : Graphe Visuel (Canvas) vs Constructeur Glisser-Déposer (Dnd)
  // Par défaut DND_BUILDER si compte Free, CANVAS sinon
  const [viewMode, setViewMode] = useState<'CANVAS' | 'DND_BUILDER'>(() => isFree ? 'DND_BUILDER' : 'CANVAS');

  // Modules hiérarchiques pour le Drag-and-Drop & Drip
  const [modules, setModules] = useState<CourseModule[]>(INITIAL_MODULES);

  // Modales et Tiroirs Avancés
  const [isContentBankOpen, setIsContentBankOpen] = useState(false);
  const [targetLessonForAttachment, setTargetLessonForAttachment] = useState<CourseLesson | null>(null);
  const [selectedModuleForDelivery, setSelectedModuleForDelivery] = useState<CourseModule | null>(null);
  const [isAdvancedSettingsOpen, setIsAdvancedSettingsOpen] = useState(false);
  const [courseSettings, setCourseSettings] = useState<{
    prerequisiteCourseIds?: string[];
    isPasswordProtected?: boolean;
    accessPassword?: string;
    strictLinearProgression?: boolean;
  }>({
    prerequisiteCourseIds: [],
    isPasswordProtected: false,
    accessPassword: '',
    strictLinearProgression: false
  });

  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // Modales
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [activeEditingNodeId, setActiveEditingNodeId] = useState<string | null>(null);

  // Masquage global du branding YouTube pour tout le cours / module
  const [globalHideBranding, setGlobalHideBranding] = useState<boolean>(true);

  // Toast de confirmation
  const [savedNotification, setSavedNotification] = useState<string | null>(null);

  const handleToggleGlobalBranding = () => {
    const nextVal = !globalHideBranding;
    setGlobalHideBranding(nextVal);
    // Mise à jour de tous les nœuds de type vidéo dans le graphe
    setNodes(nds => nds.map(n => {
      if (n.type === 'videoLesson') {
        const prevConfig = (n.data as any).videoConfig || {};
        return {
          ...n,
          data: {
            ...n.data,
            videoConfig: {
              ...prevConfig,
              hideBranding: nextVal
            }
          }
        };
      }
      return n;
    }));
    // Persistance Firestore du module
    updateModuleBranding('telecom-fintech-masterclass', 'module-core', nextVal);
    setSavedNotification(nextVal 
      ? 'Mode Furtif YouTube activé sur tous les modules (Firestore synchronisé)' 
      : 'Mode Furtif désactivé'
    );
    setTimeout(() => setSavedNotification(null), 3500);
  };

  // Réorganisation Dnd-Kit des modules & leçons
  const handleReorderModules = (newModules: CourseModule[]) => {
    setModules(newModules);
    saveCourseStructure('telecom-fintech-masterclass', newModules, nodes, edges);
    setSavedNotification('Ordre hiérarchique enregistré dans Firestore !');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Ajout de module depuis le Dnd Builder
  const handleAddModule = () => {
    const num = modules.length + 1;
    const newMod: CourseModule = {
      id: `mod-${Date.now()}`,
      title: `Module ${num} : Nouveau Module de Formation`,
      order: modules.length,
      hideBranding: globalHideBranding,
      dripSettings: { enabled: false, type: 'DAYS_AFTER_ENROLLMENT', unlockDays: 0 },
      strictLinearProgression: false,
      lessons: []
    };
    const updated = [...modules, newMod];
    setModules(updated);
    saveCourseStructure('telecom-fintech-masterclass', updated, nodes, edges);
    setSavedNotification(`Module ${num} ajouté !`);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Ajout de leçon depuis le Dnd Builder
  const handleAddLessonToModule = (moduleId: string) => {
    const title = window.prompt('Titre de la nouvelle leçon :');
    if (!title || !title.trim()) return;

    const newLesson: CourseLesson = {
      id: `lesson-${Date.now()}`,
      moduleId,
      title: title.trim(),
      durationMinutes: 15,
      videoUrl: 'https://www.youtube.com/watch?v=jfKfPfyJRdk',
      hideBranding: globalHideBranding
    };

    const updated = modules.map(m => {
      if (m.id === moduleId) {
        return { ...m, lessons: [...(m.lessons || []), newLesson] };
      }
      return m;
    });

    setModules(updated);
    saveCourseStructure('telecom-fintech-masterclass', updated, nodes, edges);
    setSavedNotification(`Leçon "${title}" créée !`);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Édition de leçon depuis le Dnd Builder
  const handleEditLessonFromDnd = (lesson: CourseLesson) => {
    setActiveEditingNodeId(lesson.id);
    if (lesson.quiz) {
      setIsQuizModalOpen(true);
    } else if (lesson.liveSessionConfig || lesson.id.includes('live')) {
      setIsLiveModalOpen(true);
    } else {
      setIsVideoModalOpen(true);
    }
  };

  // Suppression d'une leçon depuis le Dnd Builder
  const handleDeleteLessonFromDnd = (lessonId: string, moduleId: string) => {
    const updated = modules.map(m => {
      if (m.id === moduleId) {
        return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
      }
      return m;
    });
    setModules(updated);
    setNodes(nds => nds.filter(n => n.id !== lessonId));
    saveCourseStructure('telecom-fintech-masterclass', updated);
    setSavedNotification('Leçon supprimée.');
    setTimeout(() => setSavedNotification(null), 2500);
  };

  // Suppression d'un module depuis le Dnd Builder
  const handleDeleteModule = (moduleId: string) => {
    if (!window.confirm('Supprimer définitivement ce module et ses leçons associées ?')) return;
    const updated = modules.filter(m => m.id !== moduleId);
    setModules(updated);
    saveCourseStructure('telecom-fintech-masterclass', updated);
    setSavedNotification('Module supprimé.');
    setTimeout(() => setSavedNotification(null), 2500);
  };

  // Association d'une pièce jointe de la Content Bank à la leçon ciblée
  const handleLinkAssetToLesson = (resource: LessonResource) => {
    if (!targetLessonForAttachment) return;
    const updated = modules.map(m => ({
      ...m,
      lessons: m.lessons.map(l => {
        if (l.id === targetLessonForAttachment.id) {
          const prev = l.attachments || [];
          if (!prev.some(a => a.id === resource.id)) {
            return { ...l, attachments: [resource, ...prev] };
          }
        }
        return l;
      })
    }));
    setModules(updated);
    saveCourseStructure('telecom-fintech-masterclass', updated);
    setSavedNotification(`Ressource "${resource.title}" rattachée à la leçon !`);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Sauvegarde des paramètres de diffusion Drip & Linéaire
  const handleSaveDeliverySettings = (updatedModule: CourseModule) => {
    const updated = modules.map(m => m.id === updatedModule.id ? updatedModule : m);
    setModules(updated);
    saveCourseStructure('telecom-fintech-masterclass', updated);
    setSavedNotification(`Règles de diffusion enregistrées pour "${updatedModule.title}" !`);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Sauvegarde des paramètres globaux du cours (Prérequis & Mot de passe)
  const handleSaveAdvancedSettings = (newSettings: any) => {
    setCourseSettings(newSettings);
    saveCourseGlobalSettings('telecom-fintech-masterclass', newSettings);
    setSavedNotification('Paramètres avancés & accès enregistrés dans Firestore !');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Exportation JSON
  const handleExportJson = () => {
    const coursePayload = {
      id: 'telecom-fintech-masterclass',
      title: 'Masterclass Systèmes Hybrides & Monétique UEMOA',
      modules,
      ...courseSettings
    };
    exportCourseToJson(coursePayload, nodes, edges);
    setSavedNotification('Structure du cours exportée en JSON !');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Importation JSON
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = parseAndValidateCourseJson(content);
      if (res.success && res.data) {
        if (res.data.modules && res.data.modules.length > 0) {
          setModules(res.data.modules);
        }
        if (res.data.nodes && res.data.nodes.length > 0) {
          setNodes(res.data.nodes);
        }
        if (res.data.edges && res.data.edges.length > 0) {
          setEdges(res.data.edges);
        }
        setCourseSettings({
          prerequisiteCourseIds: res.data.prerequisiteCourseIds,
          isPasswordProtected: res.data.isPasswordProtected,
          accessPassword: res.data.accessPassword,
          strictLinearProgression: res.data.strictLinearProgression
        });
        saveCourseStructure('telecom-fintech-masterclass', res.data.modules || modules, res.data.nodes, res.data.edges);
        setSavedNotification(`Cours importé avec succès : ${res.summary?.modulesCount || 0} module(s), ${res.summary?.lessonsCount || 0} leçon(s) !`);
      } else {
        alert(res.error || 'Erreur lors de la lecture du fichier JSON.');
      }
    };
    reader.readAsText(file);
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  // Gestion des actions d'édition & suppression des nœuds
  const handleEditNode = useCallback((nodeId: string) => {
    setActiveEditingNodeId(nodeId);
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    if (targetNode.type === 'videoLesson') {
      setIsVideoModalOpen(true);
    } else if (targetNode.type === 'interactiveQuiz') {
      setIsQuizModalOpen(true);
    } else if (targetNode.type === 'dailyLive') {
      setIsLiveModalOpen(true);
    } else if (targetNode.type === 'voiceSimulation') {
      setIsVoiceModalOpen(true);
    } else {
      // Pour PDF : invite simple
      const newTitle = window.prompt('Modifier le titre du module :', (targetNode.data as any).title || '');
      if (newTitle) {
        setNodes(nds =>
          nds.map(n => {
            if (n.id === nodeId) {
              return { ...n, data: { ...n.data, title: newTitle } };
            }
            return n;
          })
        );
      }
    }
  }, [nodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
  }, []);

  // Déclaration mémoïsée des custom node types pour éviter les re-renders et fuites mémoire
  const nodeTypes = useMemo(
    () => ({
      videoLesson: VideoLessonNode,
      interactiveQuiz: InteractiveQuizNode,
      dailyLive: DailyLiveNode,
      pdfResource: PdfResourceNode,
      voiceSimulation: VoiceSimulationNode,
    }),
    []
  );

  // Injection des callbacks onEditNode et onDeleteNode dans chaque nœud
  const enrichedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        onEditNode: handleEditNode,
        onDeleteNode: handleDeleteNode,
      },
    }));
  }, [nodes, handleEditNode, handleDeleteNode]);

  // Handlers standard React Flow
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      let customEdge: Edge = {
        ...connection,
        id: `edge-${connection.source}-${connection.sourceHandle || 'default'}-${connection.target}`,
        type: 'smoothstep',
        animated: true,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle
      };

      if (connection.sourceHandle === 'pass') {
        customEdge = {
          ...customEdge,
          label: 'Réussite ≥ 70%',
          labelStyle: { fill: '#10b981', fontWeight: 700, fontSize: 10 },
          labelBgStyle: { fill: '#0f172a', stroke: '#10b981', strokeWidth: 1, rx: 6, ry: 6 },
          style: { stroke: '#10b981', strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' }
        };
      } else if (connection.sourceHandle === 'fail') {
        customEdge = {
          ...customEdge,
          label: 'Échec < 70% (Rattrapage)',
          labelStyle: { fill: '#f59e0b', fontWeight: 700, fontSize: 10 },
          labelBgStyle: { fill: '#0f172a', stroke: '#f59e0b', strokeWidth: 1, rx: 6, ry: 6 },
          style: { stroke: '#f59e0b', strokeWidth: 2.5, strokeDasharray: '5 5' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' }
        };
      } else {
        customEdge = {
          ...customEdge,
          style: { stroke: '#6366f1', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' }
        };
      }

      setEdges((eds) => addEdge(customEdge, eds));
    },
    []
  );

  // Ajout manuel d'un nœud depuis la barre d'outils
  const handleAddManualNode = (type: CourseNodeType) => {
    const newId = `node_${type}_${Date.now()}`;
    const xPos = 250 + (nodes.length % 3) * 60;
    const yPos = 120 + nodes.length * 90;

    const titles: Record<CourseNodeType, string> = {
      videoLesson: 'Nouvelle Leçon Vidéo',
      interactiveQuiz: 'Nouveau Quiz Adaptatif IRT',
      dailyLive: 'Nouvelle Session NaNa Live',
      pdfResource: 'Nouveau Support de Cours PDF',
      voiceSimulation: 'Nouvelle Simulation Vocale IA'
    };

    const newNode: Node = {
      id: newId,
      type,
      position: { x: xPos, y: yPos },
      data: {
        id: newId,
        type,
        title: titles[type],
        subtitle: 'Cliquez sur l\'engrenage pour paramétrer ce module',
        durationMinutes: 15,
        quizPassingScore: 70,
        pdfFileSize: '1.8 MB'
      }
    };

    setNodes(nds => [...nds, newNode]);
  };

  // Réception du graphe généré par Document-to-Course IA
  const handleApplyAiCourse = (generated: GeneratedGraphData) => {
    setNodes(generated.nodes as any);
    setEdges(generated.edges as any);
    setSavedNotification('Syllabus généré avec succès par NaNa AI !');
    setTimeout(() => setSavedNotification(null), 4000);
    setIsAiModalOpen(false);
  };

  // Sauvegarde des modifications du Quiz Adaptatif
  const handleSaveQuiz = (
    nodeId: string,
    questions: AdaptiveQuizQuestion[],
    passingScore: number,
    aiEliteGradingEnabled?: boolean,
    aiGradingInstructions?: string
  ) => {
    setNodes(nds =>
      nds.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              quizQuestions: questions,
              quizPassingScore: passingScore,
              aiEliteGradingEnabled,
              aiGradingInstructions,
            }
          };
        }
        return n;
      })
    );
    setSavedNotification('Quiz adaptatif IRT mis à jour avec succès !');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Sauvegarde des modifications de la Leçon Vidéo
  const handleSaveVideoConfig = (nodeId: string, config: VideoLessonNodeConfig) => {
    setNodes(nds =>
      nds.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              title: config.title,
              durationMinutes: config.durationMinutes,
              videoConfig: config,
            }
          };
        }
        return n;
      })
    );
    setSavedNotification('Configuration vidéo enregistrée !');
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Sauvegarde des modifications de la Session Live (Daily, Zoom, Meet, Jitsi)
  const handleSaveLiveSessionConfig = (nodeId: string, updatedTitle: string, config: LiveSessionConfig) => {
    setNodes(nds =>
      nds.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              title: updatedTitle,
              liveSessionConfig: config,
              dailyScheduledDate: config.scheduledAt,
              dailyRoomUrl: config.meetingUrl
            }
          };
        }
        return n;
      })
    );

    // Mettre à jour dans les modules s'il y a une leçon correspondante
    setModules(prev =>
      prev.map(m => ({
        ...m,
        lessons: m.lessons.map(l => {
          if (l.id === nodeId) {
            return {
              ...l,
              title: updatedTitle,
              liveSessionConfig: config,
              durationMinutes: config.durationMinutes || l.durationMinutes
            };
          }
          return l;
        })
      }))
    );

    saveCourseStructure('telecom-fintech-masterclass', modules, nodes, edges);
    setSavedNotification(`Session Live "${updatedTitle}" (${config.provider}) configurée avec succès !`);
    setTimeout(() => setSavedNotification(null), 3000);
  };

  // Statistiques du cours
  const totalVideoLessons = nodes.filter(n => n.type === 'videoLesson').length;
  const totalQuizzes = nodes.filter(n => n.type === 'interactiveQuiz').length;
  const totalLives = nodes.filter(n => n.type === 'dailyLive').length;
  const totalPdfs = nodes.filter(n => n.type === 'pdfResource').length;

  const activeEditingNode = nodes.find(n => n.id === activeEditingNodeId);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full rounded-3xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl relative">
      
      {/* Top Header & Toolbar */}
      <div className="px-5 py-3.5 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between gap-4 flex-wrap z-10">
        
        {/* Titre & Statut */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-wide">
                NaNa Course Forge
              </h2>
            </div>
            <p className="text-[11px] text-slate-400">
              Éditeur visuel de parcours pédagogique adaptatif &amp; branching IRT
            </p>
          </div>
        </div>

        {/* Compteurs KPI du cours */}
        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px]">
          <span className="flex items-center gap-1 text-slate-300">
            <Video className="w-3.5 h-3.5 text-indigo-400" />
            <strong className="text-white">{totalVideoLessons}</strong> vidéos
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-white">{totalQuizzes}</strong> quiz IRT
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-300">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <strong className="text-white">{totalLives}</strong> NaNa live
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-300">
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <strong className="text-white">{totalPdfs}</strong> ressources
          </span>
        </div>

        {/* Actions Principales */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Switcher de mode de vue : Graphe Visuel vs Glisser-Déposer */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-2xl border border-slate-800 shadow-inner">
            <button
              type="button"
              onClick={() => {
                if (isFree) {
                  triggerProFeatureUpsell('COURSE_NODE_GRAPH');
                  return;
                }
                setViewMode('CANVAS');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'CANVAS'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vue visuelle en nœuds & arborescence React Flow (Réservé Pro)"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Graphe Visuel</span>
              {isFree && <Crown className="w-3.5 h-3.5 text-amber-400 animate-pulse ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => setViewMode('DND_BUILDER')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'DND_BUILDER'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Vue hiérarchique avec réorganisation par glisser-déposer (@dnd-kit)"
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Glisser-Déposer</span>
            </button>
          </div>

          {/* Switch Toggle Masquer le branding YouTube */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-sm">
            <ShieldCheck className={`w-4 h-4 ${globalHideBranding ? 'text-emerald-400' : 'text-slate-500'}`} />
            <span className="text-[11px] font-bold text-slate-300 hidden xl:inline">
              Mode Furtif YouTube
            </span>
            <button
              type="button"
              onClick={handleToggleGlobalBranding}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                globalHideBranding ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
              role="switch"
              aria-checked={globalHideBranding}
              title="Masquer le logo et le branding YouTube lors de la lecture"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  globalHideBranding ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Bouton Banque de Contenu & Ressources */}
          <button
            type="button"
            onClick={() => {
              setTargetLessonForAttachment(null);
              setIsContentBankOpen(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs transition border border-indigo-500/30 flex items-center gap-1.5 cursor-pointer"
            title="Ouvrir la banque de médias et fichiers centralisée"
          >
            <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Banque Contenu</span>
          </button>

          {/* Bouton Paramètres Avancés & Accès (PIN / Prérequis) */}
          <button
            type="button"
            onClick={() => setIsAdvancedSettingsOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition border border-slate-700 flex items-center gap-1.5 cursor-pointer"
            title="Paramètres du cours, prérequis et code PIN d'accès"
          >
            <Settings className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Accès & Règles</span>
          </button>

          {/* Boutons Export / Import JSON */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleExportJson}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs transition border border-slate-800 flex items-center gap-1.5 cursor-pointer"
              title="Exporter l'arborescence complète du cours au format JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Export JSON</span>
            </button>

            <button
              type="button"
              onClick={() => jsonFileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs transition border border-slate-800 flex items-center gap-1.5 cursor-pointer"
              title="Importer un cours complet depuis un fichier JSON"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden lg:inline">Import JSON</span>
            </button>
            <input
              type="file"
              ref={jsonFileInputRef}
              onChange={handleImportJsonFile}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Bouton IA Auto-Build */}
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-black text-xs transition shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI Auto-Build</span>
          </button>

          {/* Bouton Simulateur IRT direct */}
          <button
            type="button"
            onClick={() => {
              const firstQuiz = nodes.find(n => n.type === 'interactiveQuiz');
              if (firstQuiz) {
                setActiveEditingNodeId(firstQuiz.id);
                setIsQuizModalOpen(true);
              } else {
                alert('Ajoutez d\'abord un nœud Quiz Adaptatif IRT pour tester le simulateur.');
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs transition border border-amber-500/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Brain className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Simulateur IRT</span>
          </button>

          {/* Sauvegarde */}
          <button
            type="button"
            onClick={() => {
              saveCourseStructure('telecom-fintech-masterclass', modules, nodes, edges);
              setSavedNotification('Architecture du cours enregistrée dans le cloud Firebase !');
              setTimeout(() => setSavedNotification(null), 3500);
            }}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Sauvegarder</span>
          </button>
        </div>
      </div>

      {/* Barre de notification temporaire */}
      {savedNotification && (
        <div className="absolute top-16 right-6 z-50 px-4 py-2 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-2xl flex items-center gap-2 animate-slideDown">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{savedNotification}</span>
        </div>
      )}

      {/* Zone Centrale : Canvas React Flow OU Constructeur Drag-and-Drop */}
      <div className="flex-1 w-full h-full relative flex overflow-hidden">
        {viewMode === 'DND_BUILDER' ? (
          <div className="flex-1 w-full h-full overflow-y-auto overscroll-contain bg-slate-950 p-4 sm:p-6 lg:p-8">
            <CurriculumDndBuilder
              modules={modules}
              onReorderModules={handleReorderModules}
              onEditModuleDelivery={(mod) => setSelectedModuleForDelivery(mod)}
              onAddModule={handleAddModule}
              onAddLessonToModule={handleAddLessonToModule}
              onEditLesson={(lesson) => handleEditLessonFromDnd(lesson)}
              onDeleteLesson={handleDeleteLessonFromDnd}
              onDeleteModule={handleDeleteModule}
              onOpenAttachments={(lesson) => {
                setTargetLessonForAttachment(lesson);
                setIsContentBankOpen(true);
              }}
            />
          </div>
        ) : (
          <div className="flex-1 w-full h-full relative flex">
            {/* Palette Flottante d'Ajout de Nœuds */}
            <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 p-2.5 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 shadow-xl max-w-[200px]">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                Ajouter un Nœud
              </span>

              <button
                type="button"
                onClick={() => handleAddManualNode('videoLesson')}
                className="w-full text-left px-2.5 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-bold transition flex items-center gap-2 border border-indigo-500/20 cursor-pointer"
              >
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                <span>Leçon Vidéo</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddManualNode('interactiveQuiz')}
                className="w-full text-left px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold transition flex items-center gap-2 border border-amber-500/20 cursor-pointer"
              >
                <Brain className="w-3.5 h-3.5 text-amber-400" />
                <span>Quiz Adaptatif IRT</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddManualNode('dailyLive')}
                className="w-full text-left px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold transition flex items-center gap-2 border border-emerald-500/20 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                <span>NaNa Live</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddManualNode('pdfResource')}
                className="w-full text-left px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition flex items-center gap-2 border border-rose-500/20 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>Ressource PDF</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddManualNode('voiceSimulation')}
                className="w-full text-left px-2.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-bold transition flex items-center gap-2 border border-cyan-500/20 cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span>Simulation Vocale IA</span>
              </button>
            </div>

            {/* Légende Branching Flottante */}
            <div className="absolute bottom-4 left-4 z-20 flex items-center gap-4 px-3 py-2 rounded-2xl bg-slate-900/90 backdrop-blur-md border border-slate-800 text-[10.5px] text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-slate-300 font-semibold">Réussite (Score &ge; 70%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-slate-300 font-semibold">Échec (Branche Rattrapage)</span>
              </div>
            </div>

            {/* Canvas React Flow Principal */}
            <ReactFlow
              nodes={enrichedNodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.2}
              maxZoom={1.6}
              className="bg-slate-950"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={24}
                size={1.5}
                color="#334155"
              />
              <Controls className="!bg-slate-900 !border-slate-800 !fill-white !rounded-2xl shadow-xl" />
              <MiniMap
                nodeColor={(n) => {
                  if (n.type === 'videoLesson') return '#6366f1';
                  if (n.type === 'interactiveQuiz') return '#f59e0b';
                  if (n.type === 'dailyLive') return '#10b981';
                  if (n.type === 'pdfResource') return '#f43f5e';
                  return '#64748b';
                }}
                className="!bg-slate-900/90 !border-slate-800 !rounded-2xl overflow-hidden"
                maskColor="rgba(15, 23, 42, 0.7)"
              />
            </ReactFlow>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODALES D'ORCHESTRATION DU STUDIO FORGE */}
      {/* ======================================================== */}

      {/* 1. Modal Auto-Génération IA (Document-to-Course) */}
      <DocumentToCourseModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        onGenerated={handleApplyAiCourse}
      />

      {/* 2. Modal Quiz Adaptatif IRT */}
      {activeEditingNode && (
        <AdaptiveQuizModal
          isOpen={isQuizModalOpen}
          nodeId={activeEditingNode.id}
          nodeTitle={(activeEditingNode.data as any).title || 'Quiz Adaptatif'}
          initialQuestions={(activeEditingNode.data as any).quizQuestions}
          initialPassingScore={(activeEditingNode.data as any).quizPassingScore}
          initialAiEliteGradingEnabled={(activeEditingNode.data as any).aiEliteGradingEnabled}
          initialAiGradingInstructions={(activeEditingNode.data as any).aiGradingInstructions}
          onClose={() => {
            setIsQuizModalOpen(false);
            setActiveEditingNodeId(null);
          }}
          onSave={handleSaveQuiz}
        />
      )}

      {/* 3. Modal Moteur Vidéo Hybride */}
      {activeEditingNode && (
        <VideoEngineModal
          isOpen={isVideoModalOpen}
          nodeId={activeEditingNode.id}
          nodeTitle={(activeEditingNode.data as any).title || 'Leçon Vidéo'}
          initialConfig={(activeEditingNode.data as any).videoConfig}
          onClose={() => {
            setIsVideoModalOpen(false);
            setActiveEditingNodeId(null);
          }}
          onSave={handleSaveVideoConfig}
        />
      )}

      {/* 4. Tiroir Banque de Contenu & Fichiers Liés */}
      <ContentBankDrawer
        isOpen={isContentBankOpen}
        courseId="telecom-fintech-masterclass"
        targetLessonTitle={targetLessonForAttachment?.title}
        onClose={() => {
          setIsContentBankOpen(false);
          setTargetLessonForAttachment(null);
        }}
        onLinkAsset={handleLinkAssetToLesson}
      />

      {/* 5. Modal Paramètres de Diffusion du Module (Drip & Progression Linéaire) */}
      {selectedModuleForDelivery && (
        <ModuleDeliverySettingsModal
          isOpen={!!selectedModuleForDelivery}
          module={selectedModuleForDelivery}
          onClose={() => setSelectedModuleForDelivery(null)}
          onSave={handleSaveDeliverySettings}
          isFreeAccount={isFree}
        />
      )}

      {/* 6. Modal Paramètres Globaux du Cours (Prérequis & Mot de Passe d'Accès) */}
      <AdvancedCourseSettingsModal
        isOpen={isAdvancedSettingsOpen}
        courseId="telecom-fintech-masterclass"
        courseTitle="Masterclass Systèmes Hybrides & Monétique UEMOA"
        currentSettings={courseSettings}
        onClose={() => setIsAdvancedSettingsOpen(false)}
        onSaveSuccess={handleSaveAdvancedSettings}
        isFreeAccount={isFree}
      />

      {/* 7. Modal Session Live (Daily, Zoom, Meet, Jitsi) */}
      {activeEditingNode && (
        <LiveSessionConfigModal
          isOpen={isLiveModalOpen}
          nodeId={activeEditingNode.id}
          initialTitle={(activeEditingNode.data as any).title || 'Session Directe'}
          initialConfig={(activeEditingNode.data as any).liveSessionConfig}
          onClose={() => {
            setIsLiveModalOpen(false);
            setActiveEditingNodeId(null);
          }}
          onSave={handleSaveLiveSessionConfig}
        />
      )}

      {/* 8. Modal Simulation Vocale IA */}
      {activeEditingNode && (
        <VoiceSimulationConfigModal
          isOpen={isVoiceModalOpen}
          onClose={() => {
            setIsVoiceModalOpen(false);
            setActiveEditingNodeId(null);
          }}
          config={(activeEditingNode.data as any).voiceSimulationConfig}
          onSave={(newConfig) => {
            setNodes((nds) =>
              nds.map((n) => {
                if (n.id === activeEditingNode.id) {
                  return {
                    ...n,
                    data: {
                      ...n.data,
                      title: newConfig.title,
                      voiceSimulationConfig: newConfig
                    }
                  };
                }
                return n;
              })
            );
            setIsVoiceModalOpen(false);
            setActiveEditingNodeId(null);
          }}
        />
      )}
    </div>
  );
};

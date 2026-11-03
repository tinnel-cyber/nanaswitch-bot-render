import React from 'react';
import { LockedModulePlaceholder } from './LockedModulePlaceholder';
import { isLmsMessageUnlocked } from '../../../../utils/lmsGating';

export interface GatedCourseMessageProps {
  prerequisiteLessonId?: string | null;
  requiredLessonTitle?: string;
  moduleTitle?: string;
  completedLessonIds: string[] | Set<string>;
  isInstructor?: boolean;
  hideWhenLocked?: boolean;
  onGoToPrerequisite?: (prerequisiteLessonId?: string) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * Composant Wrapper de Rendu Conditionnel pour les messages de cours Wameet (LMS).
 * - Si le module prérequis est validé (ou si l'utilisateur est le formateur) -> Affiche le contenu.
 * - Si verrouillé et hideWhenLocked = true -> Ne rend rien (null).
 * - Si verrouillé et hideWhenLocked = false -> Affiche la carte LockedModulePlaceholder.
 */
export const GatedCourseMessage: React.FC<GatedCourseMessageProps> = ({
  prerequisiteLessonId,
  requiredLessonTitle,
  moduleTitle,
  completedLessonIds,
  isInstructor = false,
  hideWhenLocked = false,
  onGoToPrerequisite,
  children,
  className = ''
}) => {
  const isUnlocked = isLmsMessageUnlocked(
    { prerequisiteLessonId },
    completedLessonIds,
    isInstructor
  );

  // 1. Accès autorisé : rendu direct du module (Vidéo, Quiz, etc.)
  if (isUnlocked) {
    return <>{children}</>;
  }

  // 2. Accès verrouillé avec option de masquage strict
  if (hideWhenLocked) {
    return null;
  }

  // 3. Accès verrouillé avec teaser pédagogique
  return (
    <LockedModulePlaceholder
      moduleTitle={moduleTitle}
      requiredLessonTitle={requiredLessonTitle}
      prerequisiteLessonId={prerequisiteLessonId || undefined}
      onGoToPrerequisite={onGoToPrerequisite}
      className={className}
    />
  );
};

export default GatedCourseMessage;

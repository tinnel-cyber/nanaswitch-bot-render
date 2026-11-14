import { StudentDashboardView } from '../components/lms/student/StudentDashboardView';

interface StudentDashboardPageProps {
  onBackToApp?: () => void;
  onOpenClassroom?: (courseId: string) => void;
  onOpenCertificate?: (certificateId?: string) => void;
  onOpenMarketplace?: () => void;
  onLogout?: () => void;
}

export const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({
  onBackToApp,
  onOpenClassroom,
  onOpenCertificate,
  onOpenMarketplace,
  onLogout
}) => {
  return (
    <StudentDashboardView
      onOpenClassroom={(courseId) => {
        if (onOpenClassroom) {
          onOpenClassroom(courseId);
        } else if (typeof window !== 'undefined') {
          window.history.pushState({}, '', `/classroom/${courseId}`);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }}
      onOpenCertificate={(certId) => {
        if (onOpenCertificate) {
          onOpenCertificate(certId);
        } else if (typeof window !== 'undefined') {
          const url = certId ? `/certificat?cert=${encodeURIComponent(certId)}` : '/certificat';
          window.history.pushState({}, '', url);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }}
      onOpenMarketplace={() => {
        if (onOpenMarketplace) {
          onOpenMarketplace();
        } else if (typeof window !== 'undefined') {
          window.history.pushState({}, '', '/catalog');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }}
      onBackToApp={() => {
        if (onBackToApp) {
          onBackToApp();
        } else if (typeof window !== 'undefined') {
          window.history.pushState({}, '', '/');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }}
      onLogout={onLogout}
    />
  );
};

export default StudentDashboardPage;

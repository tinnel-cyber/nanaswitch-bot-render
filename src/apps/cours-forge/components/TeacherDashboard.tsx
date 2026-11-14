import { InstructorDashboardView, InstructorDashboardViewProps } from './lms/InstructorDashboardView';

export type TeacherDashboardProps = InstructorDashboardViewProps;

export const TeacherDashboard: React.FC<TeacherDashboardProps> = (props) => {
  return <InstructorDashboardView {...props} />;
};

export default TeacherDashboard;

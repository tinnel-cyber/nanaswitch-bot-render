import React from 'react';
import { InstructorDashboardView, InstructorDashboardViewProps } from '../../../components/lms/InstructorDashboardView';

export type TeacherDashboardProps = InstructorDashboardViewProps;

export const TeacherDashboard: React.FC<TeacherDashboardProps> = (props) => {
  return <InstructorDashboardView {...props} />;
};

export default TeacherDashboard;

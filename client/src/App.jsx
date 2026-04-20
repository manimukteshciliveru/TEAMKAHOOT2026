import { useEffect, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthContext from './context/AuthContext';
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateQuizText from './pages/CreateQuizText';
import CreateQuizPDF from './pages/CreateQuizPDF';
import CreateQuizTopic from './pages/CreateQuizTopic';
import StudentDashboard from './pages/StudentDashboard';
import Assessments from './pages/Assessments';
import MyQuizzes from './pages/MyQuizzes';
import AttemptQuiz from './pages/AttemptQuiz';
import Performance from './pages/Performance';
import AdminDashboard from './pages/AdminDashboard';
import LiveRoomTeacher from './pages/LiveRoomTeacher';
import LiveRoomStudent from './pages/LiveRoomStudent';
import Leaderboard from './pages/Leaderboard';
import ProtectedRoute from './components/ProtectedRoute';

// Home component that redirects based on auth and role
const Home = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  if (user.role === 'none') return <Navigate to="/select-role" />;
  if (user.role === 'teacher') return <Navigate to="/teacher-dashboard" />;
  if (user.role === 'student') return <Navigate to="/student-dashboard" />;
  if (user.role === 'admin') return <Navigate to="/admin-dashboard" />;

  return <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/select-role" element={
            <ProtectedRoute allowNone={true}>
              <RoleSelection />
            </ProtectedRoute>
          } />

          <Route path="/teacher-dashboard" element={
            <ProtectedRoute roles={['teacher']}>
              <TeacherDashboard />
            </ProtectedRoute>
          } />

          <Route path="/create-quiz/text" element={
            <ProtectedRoute roles={['teacher']}>
              <CreateQuizText />
            </ProtectedRoute>
          } />

          <Route path="/create-quiz/pdf" element={
            <ProtectedRoute roles={['teacher']}>
              <CreateQuizPDF />
            </ProtectedRoute>
          } />

          <Route path="/create-quiz/topic" element={
            <ProtectedRoute roles={['teacher']}>
              <CreateQuizTopic />
            </ProtectedRoute>
          } />


          <Route path="/performance" element={
            <ProtectedRoute roles={['teacher']}>
              <Performance />
            </ProtectedRoute>
          } />

          <Route path="/my-quizzes" element={
            <ProtectedRoute roles={['teacher']}>
              <MyQuizzes />
            </ProtectedRoute>
          } />

          <Route path="/student-dashboard" element={
            <ProtectedRoute roles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } />

          <Route path="/assessments" element={
            <ProtectedRoute roles={['student']}>
              <Assessments />
            </ProtectedRoute>
          } />

          <Route path="/history" element={<Navigate to="/assessments" replace />} />

          <Route path="/quiz/attempt/:id" element={
            <ProtectedRoute roles={['student']}>
              <AttemptQuiz />
            </ProtectedRoute>
          } />

          <Route path="/admin-dashboard" element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          } />

          <Route path="/live-room-teacher/:joinCode" element={
            <ProtectedRoute roles={['teacher']}>
              <LiveRoomTeacher />
            </ProtectedRoute>
          } />

          <Route path="/live-room-student/:joinCode" element={
            <ProtectedRoute roles={['student']}>
              <LiveRoomStudent />
            </ProtectedRoute>
          } />

          <Route path="/leaderboard/:quizId" element={
            <ProtectedRoute roles={['student', 'teacher']}>
              <Leaderboard />
            </ProtectedRoute>
          } />

          <Route path="/" element={<Home />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

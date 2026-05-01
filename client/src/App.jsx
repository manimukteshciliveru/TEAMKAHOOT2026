import { useEffect, useState, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AuthContext from './context/AuthContext';
import Login from './pages/Login';
import RoleSelection from './pages/RoleSelection';
import FacultyDashboard from './pages/FacultyDashboard';
import CreateQuizText from './pages/CreateQuizText';
import CreateQuizPDF from './pages/CreateQuizPDF';
import CreateQuizTopic from './pages/CreateQuizTopic';
import JoinQuiz from './pages/JoinQuiz';
import Home from './pages/Home';
import MyQuizzes from './pages/MyQuizzes';
import AttemptQuiz from './pages/AttemptQuiz';
import AdminDashboard from './pages/AdminDashboard';
import LiveRoomFaculty from './pages/LiveRoomFaculty';
import LiveRoomStudent from './pages/LiveRoomStudent';
import Leaderboard from './pages/Leaderboard';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import History from './pages/History';
import QuizReport from './pages/QuizReport';
import FacultyQuizReport from './pages/FacultyQuizReport';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

// Home component that redirects based on auth and role
const HomeRedirect = () => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return null;
  if (!user) return <Navigate to="/login" />;

  if (user.role === 'none') return <Navigate to="/select-role" />;
  if (user.role === 'faculty') return <Navigate to="/faculty-dashboard" />;
  if (user.role === 'student') return <Navigate to="/home" />;
  if (user.role === 'admin') return <Navigate to="/admin-dashboard" />;

  return <Navigate to="/login" />;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/select-role" element={
            <ProtectedRoute allowNone={true}>
              <RoleSelection />
            </ProtectedRoute>
          } />

          <Route path="/faculty-dashboard" element={
            <ProtectedRoute roles={['faculty']}>
              <FacultyDashboard />
            </ProtectedRoute>
          } />

          <Route path="/create-quiz/text" element={
            <ProtectedRoute roles={['faculty']}>
              <CreateQuizText />
            </ProtectedRoute>
          } />

          <Route path="/create-quiz/manual" element={
            <ProtectedRoute roles={['faculty']}>
              <CreateQuizText />
            </ProtectedRoute>
          } />

          <Route path="/create-quiz/file" element={
            <ProtectedRoute roles={['faculty']}>
              <CreateQuizPDF />
            </ProtectedRoute>
          } />

          <Route path="/create-quiz/topic" element={
            <ProtectedRoute roles={['faculty']}>
              <CreateQuizTopic />
            </ProtectedRoute>
          } />




          <Route path="/my-quizzes" element={
            <ProtectedRoute roles={['faculty']}>
              <MyQuizzes />
            </ProtectedRoute>
          } />

          <Route path="/join" element={
            <ProtectedRoute roles={['student']}>
              <JoinQuiz />
            </ProtectedRoute>
          } />

          <Route path="/home" element={
            <ProtectedRoute roles={['student']}>
              <Home />
            </ProtectedRoute>
          } />

          <Route path="/history" element={
            <ProtectedRoute roles={['student']}>
              <History />
            </ProtectedRoute>
          } />

          <Route path="/report/:id" element={
            <ProtectedRoute roles={['student', 'admin']}>
              <QuizReport />
            </ProtectedRoute>
          } />

          <Route path="/faculty-report/:id" element={
            <ProtectedRoute roles={['faculty', 'admin']}>
              <FacultyQuizReport />
            </ProtectedRoute>
          } />

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

          <Route path="/admin/users" element={
            <ProtectedRoute roles={['admin']}>
              <UserManagement />
            </ProtectedRoute>
          } />


          <Route path="/live-room-faculty/:joinCode" element={
            <ProtectedRoute roles={['faculty']}>
              <LiveRoomFaculty />
            </ProtectedRoute>
          } />

          <Route path="/live-room-student/:joinCode" element={
            <ProtectedRoute roles={['student']}>
              <LiveRoomStudent />
            </ProtectedRoute>
          } />

          <Route path="/leaderboard/:quizId" element={
            <ProtectedRoute roles={['student', 'faculty']}>
              <Leaderboard />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute roles={['student', 'faculty', 'admin']}>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

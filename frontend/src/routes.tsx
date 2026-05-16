import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, RedirectIfAuthed, RequireAuth } from './auth/AuthContext';
import { ProfileList } from './pages/ProfileList';
import { ProfileCreate } from './pages/ProfileCreate';
import { ProfileDetail } from './pages/ProfileDetail';
import { QuestionAdd } from './pages/QuestionAdd';
import { Quiz } from './pages/Quiz';
import { WrongBook } from './pages/WrongBook';
import { QuestionFromImage } from './pages/QuestionFromImage';
import { QuestionFromPDF } from './pages/QuestionFromPDF';
import { QuestionFromPrompt } from './pages/QuestionFromPrompt';
import { QuestionConfirm } from './pages/QuestionConfirm';
import { LibraryManage } from './pages/LibraryManage';
import { ImportJobProgress } from './pages/ImportJobProgress';
import { ReviewQueue } from './pages/ReviewQueue';
import { ReviewItem } from './pages/ReviewItem';
import { StudyChat } from './pages/StudyChat';
import { TextbookList } from './pages/TextbookList';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Me } from './pages/Me';

function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

const guarded = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>;
const publicOnly = (el: React.ReactNode) => <RedirectIfAuthed>{el}</RedirectIfAuthed>;

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/', element: <Navigate to="/profiles" replace /> },
      { path: '/login', element: publicOnly(<Login />) },
      { path: '/register', element: publicOnly(<Register />) },
      { path: '/me', element: guarded(<Me />) },
      { path: '/profiles', element: guarded(<ProfileList />) },
      { path: '/profiles/new', element: guarded(<ProfileCreate />) },
      { path: '/profiles/:pid/edit', element: guarded(<ProfileCreate />) },
      { path: '/profiles/:pid', element: guarded(<ProfileDetail />) },
      { path: '/profiles/:pid/questions/new', element: guarded(<QuestionAdd />) },
      { path: '/profiles/:pid/quiz', element: guarded(<Quiz />) },
      { path: '/profiles/:pid/wrongbook', element: guarded(<WrongBook />) },
      { path: '/profiles/:pid/questions/from-image', element: guarded(<QuestionFromImage />) },
      { path: '/profiles/:pid/questions/from-pdf', element: guarded(<QuestionFromPDF />) },
      { path: '/profiles/:pid/questions/from-prompt', element: guarded(<QuestionFromPrompt />) },
      { path: '/profiles/:pid/questions/confirm', element: guarded(<QuestionConfirm />) },
      { path: '/profiles/:pid/library', element: guarded(<LibraryManage />) },
      { path: '/profiles/:pid/import-jobs/:jid', element: guarded(<ImportJobProgress />) },
      { path: '/profiles/:pid/import-jobs/:jid/review', element: guarded(<ReviewQueue />) },
      { path: '/profiles/:pid/import-jobs/:jid/review/:idx', element: guarded(<ReviewItem />) },
      { path: '/profiles/:pid/study-chat', element: guarded(<StudyChat />) },
      { path: '/profiles/:pid/textbooks', element: guarded(<TextbookList />) },
    ],
  },
]);

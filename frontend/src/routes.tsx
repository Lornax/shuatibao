import { createBrowserRouter, Navigate } from 'react-router-dom';
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

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/profiles" replace /> },
  { path: '/profiles', element: <ProfileList /> },
  { path: '/profiles/new', element: <ProfileCreate /> },
  { path: '/profiles/:pid', element: <ProfileDetail /> },
  { path: '/profiles/:pid/questions/new', element: <QuestionAdd /> },
  { path: '/profiles/:pid/quiz', element: <Quiz /> },
  { path: '/profiles/:pid/wrongbook', element: <WrongBook /> },
  { path: '/profiles/:pid/questions/from-image', element: <QuestionFromImage /> },
  { path: '/profiles/:pid/questions/from-pdf', element: <QuestionFromPDF /> },
  { path: '/profiles/:pid/questions/from-prompt', element: <QuestionFromPrompt /> },
  { path: '/profiles/:pid/questions/confirm', element: <QuestionConfirm /> },
  { path: '/profiles/:pid/library', element: <LibraryManage /> },
  { path: '/profiles/:pid/import-jobs/:jid', element: <ImportJobProgress /> },
]);

import { RouterProvider } from 'react-router-dom';
import { LanguageDomTranslator, LanguageProvider } from './i18n';
import { router } from './routes';

export default function App() {
  return (
    <LanguageProvider>
      <LanguageDomTranslator />
      <RouterProvider router={router} />
    </LanguageProvider>
  );
}

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

const resources = {
  en: {
    translation: {
      // Nav
      dashboard: 'Dashboard',
      assessments: 'Assessments',
      skillGaps: 'Skill Gaps',
      roadmap: 'Roadmap',
      projects: 'Projects',
      mentors: 'Mentors',
      aiCoach: 'AI Coach',
      careerGps: 'Career GPS',
      careerTwin: 'Career Twin',
      placement: 'Placement',
      settings: 'Settings',
      logout: 'Logout',
      notifications: 'Notifications',
      // Common
      loading: 'Loading...',
      retry: 'Retry',
      noData: 'No data available yet',
      save: 'Save',
      cancel: 'Cancel',
      submit: 'Submit',
      next: 'Next',
      back: 'Back',
      // Auth
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      name: 'Full Name',
      // Dashboard
      placementReadiness: 'Placement Readiness',
      currentWeek: 'Current Week',
      skillGapsTitle: 'Top Skill Gaps',
      weeklyProgress: 'Weekly Progress',
      aiRecommendation: 'AI Recommendation',
      // Gaps
      priority: 'Priority',
      high: 'HIGH',
      medium: 'MEDIUM',
      low: 'LOW',
    },
  },
  hi: {
    translation: {
      dashboard: 'डैशबोर्ड',
      assessments: 'परीक्षाएं',
      skillGaps: 'कौशल अंतराल',
      roadmap: 'रोडमैप',
      projects: 'प्रोजेक्ट',
      mentors: 'मेंटर',
      aiCoach: 'AI कोच',
      careerGps: 'करियर GPS',
      loading: 'लोड हो रहा है...',
      retry: 'पुनः प्रयास',
      noData: 'अभी कोई डेटा उपलब्ध नहीं',
      save: 'सहेजें',
      cancel: 'रद्द करें',
      submit: 'जमा करें',
      login: 'लॉगिन',
      register: 'रजिस्टर',
      placementReadiness: 'प्लेसमेंट तैयारी',
      high: 'उच्च',
      medium: 'मध्यम',
      low: 'निम्न',
    },
  },
  es: {
    translation: {
      dashboard: 'Panel',
      assessments: 'Evaluaciones',
      skillGaps: 'Brechas de Habilidades',
      roadmap: 'Hoja de Ruta',
      projects: 'Proyectos',
      mentors: 'Mentores',
      aiCoach: 'Coach de IA',
      loading: 'Cargando...',
      retry: 'Reintentar',
      noData: 'Sin datos disponibles',
      save: 'Guardar',
      cancel: 'Cancelar',
      submit: 'Enviar',
      login: 'Iniciar Sesión',
      register: 'Registrarse',
      placementReadiness: 'Preparación para Empleo',
      high: 'ALTO',
      medium: 'MEDIO',
      low: 'BAJO',
    },
  },
  fr: {
    translation: {
      dashboard: 'Tableau de Bord',
      assessments: 'Évaluations',
      skillGaps: 'Lacunes de Compétences',
      roadmap: 'Feuille de Route',
      projects: 'Projets',
      mentors: 'Mentors',
      aiCoach: 'Coach IA',
      loading: 'Chargement...',
      retry: 'Réessayer',
      noData: 'Aucune donnée disponible',
      save: 'Enregistrer',
      cancel: 'Annuler',
      submit: 'Soumettre',
      login: 'Connexion',
      register: "S'inscrire",
      placementReadiness: 'Préparation au Placement',
      high: 'ÉLEVÉ',
      medium: 'MOYEN',
      low: 'BAS',
    },
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'skillnova_lang',
    },
  })

export default i18n

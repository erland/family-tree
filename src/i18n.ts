import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Swedish translations
const resources = {
  sv: {
    translation: {
      appTitle: "Släktforskningsapp",
      dashboard: "Översikt",
      tree: "Träd",
      profile: "Profil",
      timeline: "Tidslinje",
      reports: "Rapporter",
      individuals: "Personer"
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "sv", // default language
  fallbackLng: "sv",
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

export default i18n;
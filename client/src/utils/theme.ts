export const getSubdomain = (): string | null => {
  // СПОРНЫЙ МОМЕНТ: Логика парсинга поддомена. 
  // На локалке (localhost) это не сработает без настройки /etc/hosts. 
  // Для тестов можно захардкодить: return 'crocus';
  const host = window.location.hostname; // "crocus.localhost"
  const parts = host.split('.');
  const zeroPath = String(parts[0]);

  if (parts.length >= 2 && parts[1] === 'localhost') {
    return zeroPath; // вернет "crocus"
  }

  if (parts.length >= 3) {
    return zeroPath; // возвращает 'crocus' или 'meridian'
  }
  return null;
};

export const getThemeConfig = (subdomain: string | null) => {
  switch (subdomain) {
    case 'crocus':
      return {
        bg: 'bg-white',
        text: 'text-black',
        primary: 'bg-blue-600 hover:bg-blue-700 text-white',
        logo: 'Crocus УК' // Здесь потом вставишь <img>
      };
    case 'meridian':
      return {
        bg: 'bg-white',
        text: 'text-gray-900',
        primary: 'bg-orange-500 hover:bg-orange-600 text-white',
        logo: 'Meridian УК' // Здесь потом вставишь <img>
      };
    default:
      return {
        bg: 'bg-gray-50',
        text: 'text-gray-800',
        primary: 'bg-gray-800 hover:bg-gray-900 text-white',
        logo: 'УК Платформа'
      };
  }
};
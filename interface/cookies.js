export function setCookie(name, value, days = 365) {
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${days * 86400}; path=/; SameSite=Lax; Secure`;
}

export function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getPrefs() {
  try {
    return JSON.parse(getCookie('prefs') || '{}');
  } catch {
    return {};
  }
}

export function setPref(key, value) {
  const prefs = getPrefs();                 
  prefs[key] = value;                       
  setCookie('prefs', JSON.stringify(prefs));
}
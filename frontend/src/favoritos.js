import { useEffect, useState } from 'react';
// Lista de interés ("carrito" del cliente): se guarda en el navegador y sirve también a visitantes sin cuenta.
const CLAVE = 'epresedi_favoritos';
const leer = () => { try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch { return []; } };
export function useFavoritos() {
  const [ids, setIds] = useState(leer);
  useEffect(() => { const f = () => setIds(leer()); window.addEventListener('favoritos', f); window.addEventListener('storage', f); return () => { window.removeEventListener('favoritos', f); window.removeEventListener('storage', f); }; }, []);
  const alternar = id => { const a = leer(), n = a.includes(id) ? a.filter(x => x !== id) : [...a, id]; try { localStorage.setItem(CLAVE, JSON.stringify(n)); } catch { /* sin almacenamiento */ } window.dispatchEvent(new Event('favoritos')); };
  return { ids, esFavorito: id => ids.includes(id), alternar };
}

export default function Header({ lang, setLang, t }) {
  return (
    <header className="bg-surface-container-low border-b border-outline/20">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🧬</div>
            <div>
              <h1 className="text-2xl font-bold text-on-surface">{t.title}</h1>
              <span className="text-sm text-on-surface-variant">{t.subtitle}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">{t.poweredByAmd}</span>
            <span className="px-3 py-1 rounded-full bg-secondary/10 text-secondary text-sm font-medium">{t.poweredByEvolus}</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label={t.language} className="ml-2 px-3 py-1 rounded-lg bg-surface-container-high text-on-surface border border-outline/10">
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

// Cabecera de la aplicación MedGuard AI.
export default function Header() {
  const appName = import.meta.env.VITE_APP_NAME || "MedGuard AI";

  return (
    <header className="header">
      <h1 className="header__title">{appName}</h1>
      <p className="header__subtitle">
        Auditoría clínica agéntica · Evolus AI + AMD
      </p>
    </header>
  );
}

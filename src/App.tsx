import { DataSearch } from "./components/DataSearch";
import { SpendingMap } from "./components/SpendingMap";
import { SpendingMapLeaflet } from "./components/SpendingMapLeaflet";
import { Link, RouterProvider, useRouter } from "./lib/client-router";
import "./index.css";

function AppRoutes() {
  const { path } = useRouter();
  const isLeaflet = path === "/leaflet";
  const isData = path === "/data";

  const subtitle = isData
    ? "Search procurement records from SQLite"
    : isLeaflet
      ? "Government spending map — OpenStreetMap via Leaflet"
      : "Government spending map — OpenStreetMap via MapTiler";

  return (
    <div className={`app${isData ? " app--data" : ""}`}>
      <header className="app-header">
        <div>
          <h1>MapTheBudget</h1>
          <p>{subtitle}</p>
        </div>
        <nav className="app-nav" aria-label="Main">
          <Link href="/" className="app-nav-link">
            MapLibre
          </Link>
          <Link href="/leaflet" className="app-nav-link">
            Leaflet / OSM
          </Link>
          <Link href="/data" className="app-nav-link">
            Data search
          </Link>
        </nav>
      </header>
      {isData ? (
        <DataSearch />
      ) : isLeaflet ? (
        <SpendingMapLeaflet />
      ) : (
        <SpendingMap />
      )}
    </div>
  );
}

export function App() {
  return (
    <RouterProvider>
      <AppRoutes />
    </RouterProvider>
  );
}

export default App;

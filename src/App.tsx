import { SpendingMap } from "./components/SpendingMap";
import { SpendingMapLeaflet } from "./components/SpendingMapLeaflet";
import { Link, RouterProvider, useRouter } from "./lib/client-router";
import "./index.css";

function AppRoutes() {
  const { path } = useRouter();
  const isLeaflet = path === "/leaflet";

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>MapTheBudget</h1>
          <p>
            {isLeaflet
              ? "Government spending map — OpenStreetMap via Leaflet"
              : "Government spending map — OpenStreetMap via MapTiler"}
          </p>
        </div>
        <nav className="app-nav" aria-label="Map engine">
          <Link href="/" className="app-nav-link">
            MapLibre
          </Link>
          <Link href="/leaflet" className="app-nav-link">
            Leaflet / OSM
          </Link>
        </nav>
      </header>
      {isLeaflet ? <SpendingMapLeaflet /> : <SpendingMap />}
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

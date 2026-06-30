import { SpendingMap } from "./components/SpendingMap";
import "./index.css";

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>Local Governance</h1>
          <p>Government spending map — OpenStreetMap via MapTiler</p>
        </div>
      </header>
      <SpendingMap />
    </div>
  );
}

export default App;

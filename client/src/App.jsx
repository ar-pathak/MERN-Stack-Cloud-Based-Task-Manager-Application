import { Outlet } from "react-router";

function App() {
  return (
    <>
      <div className="App">
        <h1 className="text-3xl font-bold underline">Hello world part 2</h1>
        <Outlet />
      </div>
    </>
  );
}

export default App;

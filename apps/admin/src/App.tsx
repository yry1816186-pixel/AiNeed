import { RouterProvider } from "react-router-dom";
import { AdminThemeProvider } from "./theme";
import { router } from "./router";

function App() {
  return (
    <AdminThemeProvider>
      <RouterProvider router={router} />
    </AdminThemeProvider>
  );
}

export default App;

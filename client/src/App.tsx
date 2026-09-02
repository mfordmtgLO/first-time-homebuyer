import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import AgentHome from "./pages/AgentHome";
import LoanOfficerHome from "./pages/LoanOfficerHome";
import PropertyLandingPage from "./pages/PropertyLandingPage";
import Leads from "./pages/Leads";
import PublicSiteAccessGate from "./components/PublicSiteAccessGate";

function PrivateHome() {
  return <PublicSiteAccessGate><Home /></PublicSiteAccessGate>;
}

function PrivateAgentHome() {
  return <PublicSiteAccessGate><AgentHome /></PublicSiteAccessGate>;
}

function PrivateLoanOfficerHome() {
  return <PublicSiteAccessGate><LoanOfficerHome /></PublicSiteAccessGate>;
}

function PrivatePropertyLandingPage() {
  return <PublicSiteAccessGate><PropertyLandingPage /></PublicSiteAccessGate>;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={PrivateHome} />
      <Route path={"/loan-officer/:loanOfficerSlug"} component={PrivateLoanOfficerHome} />
      <Route path={"/with/:loanOfficerSlug/:agentSlug"} component={PrivateAgentHome} />
      <Route path={"/with/:slug"} component={PrivateAgentHome} />
      <Route path={"/property/:slug"} component={PrivatePropertyLandingPage} />
      <Route path={"/leads"} component={Leads} />
      <Route path={"/admin/leads"} component={Leads} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

import React, { useState, useContext, Suspense, useEffect } from 'react';
import logo from './images/logo2.jpg';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthContext } from './context/AuthContext.js';
import config from './config';

import Spinner from './Essentials/Spinner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded routes & major views for optimal bundle splitting
const Login = React.lazy(() => import('./LoginSignUp/Login'));
const SignUp = React.lazy(() => import('./LoginSignUp/SignUp'));
const Dashboard = React.lazy(() => import('./Initial/Dashboard'));
const UserPage = React.lazy(() => import('./User/UserPage'));

function App() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLogInClicked, setIsLogInClicked] = useState(false);
  const [loadSpinner, setLoadSpinner] = useState(false);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  // Use AuthContext as single source of truth for auth state
  const { userInfo } = useContext(AuthContext);
  const isUserLogged = !!userInfo;

  // Wake up backend instances if they are sleeping (e.g. on Render free tier)
  useEffect(() => {
    const wakeUpBackends = () => {
      fetch(`${config.apiURL}/ping`).catch(() => { });
      fetch(`${config.aiURL}/api/health`).catch(() => { });
      fetch(`${config.routeURL}/`).catch(() => { });
    };
    wakeUpBackends();
  }, []);

  const handleSignUp = () => {
    setIsSignUp(true);
  };

  return (
    <ErrorBoundary>
      <div className="App">
        <div className="header">
          <div className="brand">
            <img className="logo-img" src={logo} alt="logo" />
            <h1 className="header-text">AI-Powered Heritage Guide</h1>
          </div>

          {!isLogInClicked && !isUserLogged && (
            <button onClick={() => setIsLogInClicked(true)}>Log In</button>
          )}
        </div>

        <ToastContainer
          enableMultiContainer
          containerId="below-header"
          position="top-right"
          toastContainerClassName="below-header-toast"
          style={{ top: "120px", right: "1.5rem" }}
        />

        <Suspense fallback={<Spinner />}>
          <div className="app-main-content">
            {!isLogInClicked && !isSignUp && !isUserLogged &&
              <Dashboard />
            }

            {isUserLogged &&
              <UserPage
                justLoggedIn={justLoggedIn}
                setLoadSpinner={setLoadSpinner}
                setJustLoggedIn={setJustLoggedIn}
              />
            }
          </div>

          <div className="login-signup">
            {isLogInClicked && !isSignUp && !isUserLogged &&
              <Login
                handleSignUp={handleSignUp}
                setLoadSpinner={setLoadSpinner}
                setJustLoggedIn={setJustLoggedIn}
                setIsLogInClicked={setIsLogInClicked}
              />
            }

            {isLogInClicked && isSignUp && !isUserLogged &&
              <SignUp
                setIsSignUp={setIsSignUp}
              />
            }
          </div>
        </Suspense>
        <ToastContainer />
        {loadSpinner && (
          <Spinner />
        )}
        {!isUserLogged &&
          <div className="logged-out-footer">
            <div className="logo-brand-git">
              <div className="brand-logo">
                <i className="fa-solid fa-gopuram"></i>
                <p>Thamizh Thadam</p>
              </div>
              <a href="https://github.com/nareshjo001/touristGuide"><i className="fa-brands fa-github"></i></a>
            </div>
            <p>THAMIZH THADAM Copyright &copy; {new Date().getFullYear()} Thamizh Thadam - All rights reserved.</p>
          </div>
        }
      </div>
    </ErrorBoundary>
  );
}

export default App;

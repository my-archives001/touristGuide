import React, { useState, useEffect, useContext } from 'react';
import menu from '../images/menu.png';
import './UserPage.css';
import UserDashBoard from './UserDashBoard';
import SetProfile from './Profile/SetProfile';
import ViewProfile from './Profile/ViewProfile';
import Chatbot from '../chatbot/chatbot';
import config from '../config';
import { toast } from 'react-toastify';
import logoutIcon from '../images/user-logout.png';
import TypingEffect from '../Essentials/Typingeffect';
import RoutePage from '../routefinder/RoutePage';
import { AuthContext } from '../context/AuthContext.js';

const UserPage = ({ justLoggedIn, setJustLoggedIn, setLoadSpinner }) => {
  const { logout } = useContext(AuthContext);

  // Navigation state — using a single activeView string instead of many booleans
  const [activeView, setActiveView] = useState('dashboard');
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [changeProfileBtn, setChangeProfileBtn] = useState(false);
  const [profileUpdated, setProfileUpdated] = useState(false);

  // This state is for chatbot AI data
  const [aiData, setAiData] = useState([]);

  const token = localStorage.getItem('token'); // JWT token for API calls

  // Show welcome toast on first login
  const showWelcomeToast = (userName) => {
    toast.dismiss();
    toast.info(
      <div>
        <strong>Welcome {userName}!</strong>
        <div style={{ fontSize: '0.8em', marginTop: '4px' }}>
          Explore Tamil Nadu's rich heritage right here...
        </div>
      </div>,
      {
        position: "bottom-left",
        autoClose: 4000,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        icon: false,
        style: {
          backgroundColor: "#0056b3",
          color: "#ebf4fe",
          borderRadius: "10px",
          fontSize: "0.95rem",
          fontWeight: "500",
        },
      }
    );
  };

  // Show toast for successful logout
  const logOutSuccessToast = () => {
    toast.dismiss();
    toast.success(
      <div>
        <div style={{ fontSize: '0.9em', marginTop: '4px' }}>
          Logged Out Successfully!
        </div>
      </div>,
      {
        position: "top-right",
        autoClose: 2500,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        style: {
          backgroundColor: "#d1fae5",
          color: "#065f46",
          borderRadius: "16px",
          fontSize: "1rem",
          fontWeight: "500",
        },
        containerId: "below-header",
      }
    );
  };

  // Navigation handlers — simplified to use activeView
  const handleNavClick = (view) => {
    setActiveView(view);
    setIsNavOpen(false);
    if (view === 'setProfile') {
      setChangeProfileBtn(true);
    }
  };

  const handleLogoutClick = () => {
    // Clear ALL auth state
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userInfo');
    logout(); // AuthContext logout — clears userInfo state
    logOutSuccessToast();
  };

  // Fetch user profile on component mount or token change
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (token) {
        try {
          const API_BASE = config.apiURL;
          const response = await fetch(`${API_BASE}/api/users/profile`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            if (justLoggedIn) {
              showWelcomeToast(data.firstName);
            }
          } else {
            // Token expired or invalid — log out
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            logout();
            console.error('Failed to fetch user profile');
          }
        } catch (error) {
          console.error('Network error:', error);
        }
      }
    };
    fetchUserProfile();

    if (justLoggedIn) {
      setJustLoggedIn(false);
    }
  }, [justLoggedIn, token, logout, setJustLoggedIn]);

  return (
    <div className="userpage">
      <button className="menu" onClick={() => setIsNavOpen(!isNavOpen)}>
        <img src={menu} alt="hamburger-menu" />
      </button>
      {isNavOpen && <div className="backdrop" onClick={() => setIsNavOpen(false)}></div>}
      <div className={`nav-board ${isNavOpen ? 'open' : ''}`}>
        <ul className="items">
          <li><button className="item-btn" onClick={() => handleNavClick('dashboard')}>Dashboard</button></li>
          {!changeProfileBtn ? (
            <li><button className="item-btn" onClick={() => handleNavClick('setProfile')}>Set Your Profile</button></li>
          ) : (
            <li><button className="item-btn" onClick={() => handleNavClick('viewProfile')}>View Profile</button></li>
          )}
          <li><button className="item-btn" onClick={() => handleNavClick('chat')}>AI Assistant</button></li>
          <li><button className="item-btn" onClick={() => handleNavClick('routePlan')}>Route Planning</button></li>
        </ul>
        <div className="logout-btn-icon">
          <button className="logout-btn item-btn" onClick={handleLogoutClick}>Log Out</button>
          <img src={logoutIcon} alt="logout-icon" />
        </div>
      </div>

      {/* Main content area */}
      <div className="user-page-main">
        {activeView === 'setProfile' &&
          <SetProfile
            setProfileSet={(val) => { if (!val) setActiveView('viewProfile'); }}
            setViewProfile={(val) => { if (val) setActiveView('viewProfile'); }}
            setProfileUpdated={setProfileUpdated}
            token={token}
          />
        }
        {activeView === 'dashboard' &&
          <UserDashBoard />
        }
        {activeView === 'viewProfile' &&
          <ViewProfile
            setProfileSet={(val) => { if (val) setActiveView('setProfile'); }}
            setViewProfile={(val) => { if (!val) setActiveView('dashboard'); }}
            profileUpdated={profileUpdated}
            setLoadSpinner={setLoadSpinner}
            token={token}
          />
        }
        {activeView === 'routePlan' &&
          <RoutePage />
        }
      </div>

      {/* Split section for chatbot and info */}
      {activeView === 'chat' &&
        <div className="user-page-main-split">
          <div className="chatbot-left"> {/* Left: Chatbot */}
            <Chatbot setAiData={setAiData} />
          </div>

          <div className="info-right"> {/* Right: Info Section */}
            <div className="info-bg"> {/* Top curtain image */}
              <img
                src={require('../images/curtain2.jpg')}
                alt="Curtain Background"
                className="info-bg-img"
              />
            </div>

            <div className="info-content">
              {/* Check if the ARRAY has items */}
              {aiData && aiData.length > 0 ? (
                // Map over the array of places
                aiData.map((place) => (
                  <div key={place.id} style={{ marginBottom: '20px' }}>
                    {/* Use TypingEffect for the place name */}
                    <h3><TypingEffect text={place.name} speed={30} /></h3>

                    {/* Display the full text */}
                    {place.full_text && (
                      <TypingEffect text={place.full_text} speed={20} />
                    )}
                  </div>
                ))
              ) : (
                // This is the default message
                <TypingEffect
                  text={"Ask about Overview, History, or Festivals to see details here."}
                  speed={30}
                />
              )}
            </div>

          </div>
        </div>}
    </div>
  );
};

export default UserPage;
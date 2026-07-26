import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import Placecard from './Placecard';
import filterByDistricts from '../Essentials/essentials';
import { motion } from "framer-motion";
import config from '../config';

const Dashboard = () => {
  // State to hold local items
  const [filter, setFilter] = useState('default');
  const [heritagePlaces, setHeritagePlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // State for Pagination for all places
  const [currentPage, setCurrentPage] = useState(0);
  const placesPerPage = 6;

  // State for Pagination state per district
  const [districtPages, setDistrictPages] = useState({});

  // Fetch heritage places from backend on component mount
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const API_BASE = config.apiURL;
        const response = await fetch(`${API_BASE}/api/places`);
        if (!response.ok) throw new Error('Failed to fetch places');
        const data = await response.json();
        setHeritagePlaces(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    fetchPlaces();
  }, []);

  // Get filtered places based on type filter and search query
  const getFilteredPlaces = () => {
    let filtered = heritagePlaces;

    // Filter by type if selected
    if (filter !== 'default') {
      filtered = filtered.filter(place => place.type === filter);
    }

    if (searchQuery) {
      const grouped = filterByDistricts(filtered);

      // Check if search matches a district
      const matchingDistricts = Object.entries(grouped).filter(([district]) =>
        district.toLowerCase() === searchQuery.toLowerCase()
      );

      if (matchingDistricts.length > 0) {
        return { mode: "district", data: matchingDistricts };
      }

      // Otherwise, filter by place name
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return { mode: "places", data: filtered };
  };

  const { mode, data } = getFilteredPlaces();

  // Show loading animation while fetching
  if (loading)
    return (
      <div className="typing">
        <span></span>
        <span></span>
        <span></span>
      </div>
    );

  // Show error if API call fails
  if (error) return <div className='backend-error'><p>Error: {error}</p></div>;

  // Pagination for all places
  const totalPages = Math.ceil(mode === "places" ? data.length / placesPerPage : 1);
  const paginatedPlaces =
    mode === "places"
      ? data.slice(
        currentPage * placesPerPage,
        currentPage * placesPerPage + placesPerPage
      )
      : [];

  return (
    <div className="dashboard-container">
      {/* Dashboard header with search and filter inputs */}
      <div className="dashboard-header">
        <h3>Heritage Places</h3>

        <div className="filters">
          {/* Search input */}
          <input
            type="text"
            className="search"
            placeholder="Search District or Place"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(0);
              setDistrictPages({});
            }}
          />

          {/* Filter dropdown */}
          <div className="dashboard-filter">
            <select
              className="filter-by"
              id="filter-by"
              onChange={(e) => {
                setFilter(e.target.value);
                setCurrentPage(0);
              }}
            >
              <option value="default">Filter By</option>
              <option value="Fort">Forts</option>
              <option value="Temple">Temples</option>
              <option value="Palace">Palaces</option>
              <option value="Natural Landscape">Natural Landscapes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Show heading if filter is applied */}
      {filter !== 'default' && mode === "places" && (
        <h1 className="filtered-text">Exploring {filter} Wonders</h1>
      )}

      {/* Main dashboard content */}
      <div className="dashboard-main">
        {mode === "district" ? (
          // Render grouped places by district
          data.map(([district, groupList]) => {
            const pageIndex = districtPages[district] || 0;
            const totalDistrictPages = Math.ceil(groupList.length / placesPerPage);
            const paginatedDistrictPlaces = groupList.slice(
              pageIndex * placesPerPage,
              (pageIndex + 1) * placesPerPage
            );

            return (
              <div key={district} className="district-group">
                <h3 className="district-heading">{district}</h3>

                <div className="district-places">
                  {paginatedDistrictPlaces.map((place, index) => (
                    <motion.div
                      key={place.name}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: index * 0.1,
                        ease: [0.25, 1, 0.5, 1],
                      }}
                    >
                      <Placecard place={place} />
                    </motion.div>
                  ))}
                </div>

                {/* Pagination for district */}
                {totalDistrictPages > 1 && (
                  <div className="pagination-dots">
                    {Array.from({ length: totalDistrictPages }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`dot ${pageIndex === idx ? 'active' : ''}`}
                        onClick={() =>
                          setDistrictPages(prev => ({
                            ...prev,
                            [district]: idx,
                          }))
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          // Render normal paginated places
          paginatedPlaces.map((place, index) => (
            <motion.div
              key={place.name}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.4,
                delay: index * 0.1,
                ease: [0.25, 1, 0.5, 1],
              }}
            >
              <Placecard place={place} />
            </motion.div>
          ))
        )}
      </div>

      {/* Pagination dots for normal places */}
      {mode === "places" && totalPages > 1 && (
        <div className="pagination-dots">
          {Array.from({ length: totalPages }).map((_, index) => (
            <span
              key={index}
              className={`dot ${currentPage === index ? 'active' : ''}`}
              onClick={() => setCurrentPage(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
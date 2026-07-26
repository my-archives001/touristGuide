import React from 'react';

const RecentlyVisited = ({place}) => {
    return (
        <div className="place-card">
            <img src={place.imageUrl} alt="place-image"/>
            <div className= "name-location">
                <h3 className="place-name">{place.name}</h3>
                <h4 className="place-loc">{place.location}</h4>
            </div>
            <p className="place-description">{place.description}</p>
        </div>
    )
}

export default React.memo(RecentlyVisited);
import React, { useState } from 'react';

const DestinationSearch = ({ destinations, onDestinationSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredDestinations, setFilteredDestinations] = useState([]);

  const handleInputChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term) {
      const filtered = destinations
        .filter((dest) =>
          dest.destination.toLowerCase().includes(term.toLowerCase())
        )
        .slice(0, 10); // Limit to top 10 results
      setFilteredDestinations(filtered);
    } else {
      setFilteredDestinations([]);
    }
  };

  const handleSelect = (destination) => {
    setSearchTerm(destination.destination);
    onDestinationSelect(destination.destination);
    setFilteredDestinations([]);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={searchTerm}
        onChange={handleInputChange}
        placeholder="Search for a destination..."
        className="w-full px-4 py-2 border border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-800 text-slate-100 caret-blue-400"
      />
      {filteredDestinations.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-md shadow-lg max-h-60 overflow-y-auto text-slate-100">
          {filteredDestinations.map((dest, index) => (
            <li
              key={index}
              onClick={() => handleSelect(dest)}
              className="px-4 py-2 cursor-pointer hover:bg-slate-800"
            >
              {dest.destination}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default DestinationSearch;

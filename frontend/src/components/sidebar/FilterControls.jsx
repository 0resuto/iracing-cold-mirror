import React from 'react';
import { Search, X } from 'lucide-react';

export const FilterControls = ({
  processedPlayers,
  searchQuery,
  setSearchQuery,
  filterPlayer,
  setFilterPlayer,
  filterTrack,
  setFilterTrack,
  filterCar,
  setFilterCar,
  sortBy,
  setSortBy,
  uniquePlayers,
  uniqueTracks,
  uniqueCars
}) => {
  return (
    <div className="bg-zinc-950 border-b border-zinc-800 flex-none flex flex-col gap-2 min-w-0" style={{ padding: '12px 16px' }}>


      {/* Search Bar + Sort Dropdown Row */}
      <div className="flex items-center gap-2 w-full min-w-0">
        {/* Instant Search Bar */}
        <div className="relative flex items-center flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none text-zinc-500" style={{ paddingLeft: '12px' }}>
            <Search size={15} />
          </div>
          <input
            type="text"
            placeholder="Search driver, track, car..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', paddingRight: '30px' }}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs rounded-xl py-1.5 outline-none focus:border-sky-500 transition-colors min-h-[36px] font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 outline-none focus:border-sky-500 cursor-pointer min-h-[36px] font-semibold flex-none"
          title="Sort Sessions"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="fastest">Fastest</option>
        </select>
      </div>

      {/* Dropdown Filters (3 Columns: Driver, Track, Car) */}
      <div className="grid grid-cols-3 gap-2 min-w-0">
        {/* Driver Filter */}
        <select
          value={filterPlayer}
          onChange={(e) => setFilterPlayer(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-sky-500 cursor-pointer truncate min-h-[34px] font-semibold"
          title="Filter by Driver"
        >
          <option value="all">Drivers ({uniquePlayers.length})</option>
          {uniquePlayers.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Track Filter */}
        <select
          value={filterTrack}
          onChange={(e) => setFilterTrack(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-sky-500 cursor-pointer truncate min-h-[34px] font-semibold"
          title="Filter by Track"
        >
          <option value="all">Tracks ({uniqueTracks.length})</option>
          {uniqueTracks.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        {/* Car Filter */}
        <select
          value={filterCar}
          onChange={(e) => setFilterCar(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-sky-500 cursor-pointer truncate min-h-[34px] font-semibold"
          title="Filter by Car"
        >
          <option value="all">Cars ({uniqueCars.length})</option>
          {uniqueCars.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

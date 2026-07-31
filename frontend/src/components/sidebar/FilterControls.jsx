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
    <div className="bg-zinc-950 border-b border-zinc-800 flex-none flex flex-col gap-3 min-w-0" style={{ padding: '16px 20px' }}>
      <div className="flex justify-between items-center min-w-0">
        <h2 className="text-xs uppercase tracking-wider text-zinc-400 font-extrabold m-0 truncate">Telemetry Explorer</h2>
        <span className="text-xs font-mono text-zinc-400 flex-none font-bold">
          {processedPlayers.reduce((acc, p) => acc + (p.sessions?.length || 0), 0)} sessions
        </span>
      </div>

      {/* Instant Search Bar */}
      <div className="relative flex items-center w-full min-w-0">
        <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none text-zinc-500" style={{ paddingLeft: '14px' }}>
          <Search size={16} />
        </div>
        <input
          type="text"
          placeholder="Search driver, track, car..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '42px', paddingRight: '36px' }}
          className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs rounded-xl py-2.5 outline-none focus:border-sky-500 transition-colors min-h-[42px] font-medium"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-3 text-zinc-400 hover:text-zinc-200 p-1.5 cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Filters (3 Columns: Driver, Track, Car) */}
      <div className="grid grid-cols-3 gap-2 min-w-0">
        {/* Driver Filter */}
        <select
          value={filterPlayer}
          onChange={(e) => setFilterPlayer(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-2.5 outline-none focus:border-sky-500 cursor-pointer truncate min-h-[40px] font-semibold"
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
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-2.5 outline-none focus:border-sky-500 cursor-pointer truncate min-h-[40px] font-semibold"
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
          className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2.5 py-2.5 outline-none focus:border-sky-500 cursor-pointer truncate min-h-[40px] font-semibold"
          title="Filter by Car"
        >
          <option value="all">Cars ({uniqueCars.length})</option>
          {uniqueCars.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Sort Bar */}
      <div className="flex items-center justify-between text-xs mt-1 min-w-0">
        <span className="text-zinc-400 font-bold flex-none" style={{ marginRight: '12px' }}>Sort:</span>
        <div className="flex gap-2 flex-1 justify-end">
          <button 
            onClick={() => setSortBy('newest')} 
            style={{ padding: '6px 14px' }}
            className={`rounded-lg font-mono text-xs transition-colors cursor-pointer min-h-[34px] ${
              sortBy === 'newest' ? 'bg-zinc-800 text-sky-400 font-bold border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Newest
          </button>
          <button 
            onClick={() => setSortBy('oldest')} 
            style={{ padding: '6px 14px' }}
            className={`rounded-lg font-mono text-xs transition-colors cursor-pointer min-h-[34px] ${
              sortBy === 'oldest' ? 'bg-zinc-800 text-sky-400 font-bold border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Oldest
          </button>
          <button 
            onClick={() => setSortBy('fastest')} 
            style={{ padding: '6px 14px' }}
            className={`rounded-lg font-mono text-xs transition-colors cursor-pointer min-h-[34px] ${
              sortBy === 'fastest' ? 'bg-zinc-800 text-purple-400 font-bold border border-zinc-700' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Fastest
          </button>
        </div>
      </div>
    </div>
  );
};

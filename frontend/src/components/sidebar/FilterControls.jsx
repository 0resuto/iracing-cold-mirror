import React, { useMemo } from 'react';
import { Input, Select } from '@0resuto/ui-kit';

export const FilterControls = ({
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
  uniquePlayers = [],
  uniqueTracks = [],
  uniqueCars = []
}) => {
  const sortOptions = useMemo(() => [
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' },
    { value: 'fastest', label: 'Fastest' }
  ], []);

  const driverOptions = useMemo(() => [
    { value: 'all', label: `Drivers (${uniquePlayers.length})` },
    ...uniquePlayers.map(p => ({ value: p.id, label: p.name }))
  ], [uniquePlayers]);

  const trackOptions = useMemo(() => [
    { value: 'all', label: `Tracks (${uniqueTracks.length})` },
    ...uniqueTracks.map(t => ({ value: t, label: t }))
  ], [uniqueTracks]);

  const carOptions = useMemo(() => [
    { value: 'all', label: `Cars (${uniqueCars.length})` },
    ...uniqueCars.map(c => ({ value: c, label: c }))
  ], [uniqueCars]);

  return (
    <div className="bg-brand-bg border-b border-brand-60 flex-none flex flex-col gap-2 min-w-0 px-4 py-3">
      {/* Search Bar + Sort Dropdown Row */}
      <div className="flex items-center gap-2 w-full min-w-0">
        <Input
          size="md"
          placeholder="Search driver, track, car..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
          className="flex-1 min-w-0"
        />

        <div className="w-28 flex-none">
          <Select
            size="md"
            value={sortBy}
            onChange={setSortBy}
            options={sortOptions}
          />
        </div>
      </div>

      {/* Dropdown Filters (3 Columns: Driver, Track, Car) */}
      <div className="grid grid-cols-3 gap-2 min-w-0">
        <Select
          size="sm"
          value={filterPlayer}
          onChange={setFilterPlayer}
          options={driverOptions}
        />

        <Select
          size="sm"
          value={filterTrack}
          onChange={setFilterTrack}
          options={trackOptions}
        />

        <Select
          size="sm"
          value={filterCar}
          onChange={setFilterCar}
          options={carOptions}
        />
      </div>
    </div>
  );
};

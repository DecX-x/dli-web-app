'use client';

import { memo } from 'react';
import { SlidingNumber } from '@/components/ui/shadcn-io/sliding-number';
import { VehicleCounts } from '@/types/session';

interface VehicleCounterProps {
  counts: VehicleCounts;
}

// Custom SVG Icons for each vehicle type - using design system colors
const CarIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-vehicle-cars"
  >
    <path
      d="M6 12L8 6H24L26 12M6 12V24H8V26H10V24H22V26H24V24H26V12M6 12H26M8 16H10M22 16H24"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TruckIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-vehicle-truck-bus"
  >
    <path
      d="M2 8H18V20H2V8Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18 12H24L28 16V20H18V12Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle
      cx="8"
      cy="24"
      r="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="22"
      cy="24"
      r="2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M10 24H20M6 24H2V20M24 24H28V20"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const MotorcycleIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-vehicle-motorcycle"
  >
    <circle
      cx="8"
      cy="22"
      r="4"
      stroke="currentColor"
      strokeWidth="2"
    />
    <circle
      cx="24"
      cy="22"
      r="4"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 22L16 14H20L22 10H18M22 10H26M22 10L20 14L16 22"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface CounterCardProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

const CounterCard = memo(function CounterCard({ icon, label, count, percentage, color }: CounterCardProps) {
  return (
    <article 
      className="bg-card rounded-md border border-border p-2 flex items-center justify-between"
      role="region"
      aria-label={`${label} counter`}
    >
      <div className="flex items-center gap-1.5">
        <div aria-hidden="true" className="scale-[0.65]">{icon}</div>
        <span className="text-xs font-medium text-foreground">{label}</span>
      </div>
      
      <div className="flex items-baseline gap-1.5">
        <div className={`text-xl font-bold ${color}`} aria-label={`${count} ${label.toLowerCase()}`}>
          <SlidingNumber number={count} />
        </div>
        <span className="text-[10px] text-muted-foreground" aria-label={`${percentage.toFixed(1)} percent of total`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
    </article>
  );
});

export const VehicleCounter = memo(function VehicleCounter({ counts }: VehicleCounterProps) {
  const totalCount = counts.cars + counts.truckBus + counts.motorcycle;
  
  const carPercentage = totalCount > 0 ? (counts.cars / totalCount) * 100 : 0;
  const truckBusPercentage = totalCount > 0 ? (counts.truckBus / totalCount) * 100 : 0;
  const motorcyclePercentage = totalCount > 0 ? (counts.motorcycle / totalCount) * 100 : 0;

  return (
    <section className="space-y-3" aria-label="Vehicle counters">
      {/* Total Count Display - Compact */}
      <div 
        className="bg-card rounded-lg border border-border p-3"
        role="region"
        aria-label="Total vehicle count"
      >
        <div className="text-[10px] font-medium text-muted-foreground mb-0.5 uppercase tracking-wide">Total Vehicles</div>
        <div className="text-3xl font-bold text-foreground" aria-label={`${totalCount} total vehicles`}>
          <SlidingNumber number={totalCount} />
        </div>
      </div>

      {/* Individual Counter Cards - Compact */}
      <div className="space-y-1.5">
        <CounterCard
          icon={<CarIcon />}
          label="Cars"
          count={counts.cars}
          percentage={carPercentage}
          color="text-vehicle-cars"
        />
        
        <CounterCard
          icon={<TruckIcon />}
          label="Truck-Bus"
          count={counts.truckBus}
          percentage={truckBusPercentage}
          color="text-vehicle-truck-bus"
        />
        
        <CounterCard
          icon={<MotorcycleIcon />}
          label="Motorcycles"
          count={counts.motorcycle}
          percentage={motorcyclePercentage}
          color="text-vehicle-motorcycle"
        />
      </div>
    </section>
  );
});

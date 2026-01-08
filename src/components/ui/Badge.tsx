import {
  Clock,
  UserCheck,
  Truck,
  CheckCircle,
  XCircle,
  ThumbsUp,
  Star,
  Navigation,
  MapPin,
  Package,
  LucideIcon
} from 'lucide-react';

interface BadgeProps {
  status: 'pending' | 'pending_driver_acceptance' | 'accepted' | 'assigned' | 'driver_en_route_pickup' | 'arrived_at_pickup' | 'in_transit' | 'arrived_at_dropoff' | 'in_progress' | 'completed' | 'cancelled';
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: LucideIcon }
> = {
  pending: {
    label: 'Pending',
    color: 'bg-red-50 text-red-600 border-red-200',
    icon: Clock,
  },
  pending_driver_acceptance: {
    label: 'Awaiting Response',
    color: 'bg-yellow-50 text-yellow-600 border-yellow-300',
    icon: Star,
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    icon: ThumbsUp,
  },
  assigned: {
    label: 'Assigned',
    color: 'bg-rose-50 text-rose-600 border-rose-200',
    icon: UserCheck,
  },
  driver_en_route_pickup: {
    label: 'En Route to Pickup',
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    icon: Navigation,
  },
  arrived_at_pickup: {
    label: 'At Pickup',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: MapPin,
  },
  in_transit: {
    label: 'In Transit',
    color: 'bg-purple-50 text-purple-600 border-purple-200',
    icon: Truck,
  },
  arrived_at_dropoff: {
    label: 'At Dropoff',
    color: 'bg-green-50 text-green-600 border-green-200',
    icon: Package,
  },
  in_progress: {
    label: 'In Progress',
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: Truck,
  },
  completed: {
    label: 'Completed',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: CheckCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: XCircle,
  },
};

export function StatusBadge({ status, showIcon = true, size = 'md' }: BadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-xs',
    lg: 'px-4 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${config.color} ${sizeClasses[size]} transition-all`}
    >
      {showIcon && <Icon size={iconSizes[size]} />}
      {config.label}
    </span>
  );
}

interface GenericBadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '' }: GenericBadgeProps) {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-gray-100 text-gray-700 border-gray-200',
    destructive: 'bg-red-100 text-red-700 border-red-200',
    outline: 'border border-gray-300 text-gray-700 bg-transparent',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
